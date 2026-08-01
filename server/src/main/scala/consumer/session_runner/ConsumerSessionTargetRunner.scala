package consumer.session_runner

import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.session_target.ConsumerSessionTarget
import com.typesafe.scalalogging.Logger
import consumer.coloring_rules.ColoringRuleChain
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.api.Consumer
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.value_projections.{ValueProjectionList, ValueProjectionResult}
import org.apache.pulsar.client.api.Message

import scala.util.boundary
import boundary.break
import scala.util.{Failure, Success, Try}
import java.util.concurrent.atomic.AtomicLong

type NonPartitionedTopicFqn = String

case class ConsumerSessionTargetRunner(
    targetIndex: Int,
    targetConfig: ConsumerSessionTarget,
    nonPartitionedTopicFqns: Vector[NonPartitionedTopicFqn],
    schemasByTopic: SchemasByTopic,
    sessionContextPool: ConsumerSessionContextPool,
    var consumers: Map[NonPartitionedTopicFqn, Consumer[Array[Byte]]],
    var consumerListener: ConsumerListener,
    var stats: ConsumerSessionTargetStats
) {
    def resume(
        onNext: (
            msg: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String]
        ) => Unit,
        isDebug: Boolean,
        incrementNumMessageProcessed: () => Unit,
        onStartFromDiscardProgress: () => Unit
    ): Unit =
        val listener = consumerListener
        val targetMessageHandler = listener.targetMessageHandler

        // Rewired on every play, like the message handler above it, so a skip still in flight
        // reports to whichever client is listening NOW. The discard counter itself is NOT touched
        // here - it is armed once, at session creation.
        listener.onStartFromDiscardProgress = onStartFromDiscardProgress

        targetMessageHandler.onNext = (msg: Message[Array[Byte]]) =>
            // Both counters are atomic because these two lines run OUTSIDE the per-message context
            // lease below, on one listener thread per partition. Kept here rather than moved inside
            // the lease so that a message failing to deserialize still counts as processed.
            stats.messageProcessed.incrementAndGet()
            incrementNumMessageProcessed()

            // Deliberately OUTSIDE the lease below. Deserialization is a pure function of the
            // message, the session's schemas and the configured deserializer - it touches no JS -
            // and it is the expensive part of handling a message. Holding the session's single JS
            // context across it would make every partition decode in single file for no reason.
            val consumerSessionMessage = converters.serializeMessage(schemasByTopic, msg, targetConfig.messageValueDeserializer)
            val messageJson = consumerSessionMessage.messageAsJsonOmittingValue
            val messageValueToJsonResult = consumerSessionMessage.messageValueAsJson

            // ONE lease for the WHOLE message, not one per JS call - and it deliberately spans the
            // `onNext` callback, because the session-level filter chain, coloring rules, value
            // projections and `getState` all run in there, off the SAME current message this thread
            // just set. Pulsar delivers each partition on its own listener thread and they all share
            // this context; a lease per call would still let another partition's message overwrite
            // `globalThis.__dekaf_currentMessage` midway through this one.
            sessionContextPool.withNextContext { sessionContext =>
                boundary:
                    sessionContext.setCurrentMessage(messageJson, messageValueToJsonResult)

                    val messageFilterChainResult: ChainTestResult = sessionContext.testMessageFilterChain(
                        targetConfig.messageFilterChain
                    )

                    val messageFilterChainErrors = messageFilterChainResult.results.flatMap(r => r.error)

                    if !messageFilterChainResult.isOk then
                        onNext(
                            msg = None,
                            sessionContext = sessionContext,
                            stats = stats,
                            errors = if isDebug then messageFilterChainErrors else Vector.empty
                        )
                        boundary.break()

                    val coloringRuleChainResult: Vector[ChainTestResult] = if targetConfig.coloringRuleChain.isEnabled then
                        targetConfig.coloringRuleChain.coloringRules
                            .filter(_.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(cr.messageFilterChain))
                    else
                        Vector.empty

                    val valueProjectionListResult: Vector[ValueProjectionResult] = if targetConfig.valueProjectionList.isEnabled then
                        targetConfig.valueProjectionList.projections
                            .filter(_.isEnabled)
                            .map(_.project(sessionContext.context))
                    else
                        Vector.empty

                    var msgToSend = if messageFilterChainResult.isOk then
                        Some(consumerSessionMessage)
                    else
                        None

                    val errors: Vector[String] =
                        if isDebug then
                            val serializationErrors = messageValueToJsonResult match
                                case Left(err) => Vector(err.getMessage)
                                case _         => Vector.empty
                            val coloringRuleChainErrors = coloringRuleChainResult.flatMap(r => r.results.flatMap(r2 => r2.error))
                            serializationErrors ++ messageFilterChainErrors ++ coloringRuleChainErrors
                        else Vector.empty

                    msgToSend = msgToSend.map(m =>
                        m.copy(
                            messagePb = m.messagePb
                                .withSessionTargetIndex(targetIndex)
                                .withDebugStdout(sessionContext.getStdout)
                                .withSessionTargetMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                                .withSessionTargetColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))
                                .withSessionTargetValueProjectionListResult(valueProjectionListResult.map(ValueProjectionResult.toPb))
                        )
                    )

                    onNext(
                        msg = msgToSend,
                        sessionContext = sessionContext,
                        stats = stats,
                        errors = errors
                    )
            }

        permitLock.synchronized {
            listener.startAcceptingNewMessages()
            consumers.foreach((_, consumer) => consumer.resume())
        }

    /** Serializes every touch of the consumers' pause/resume state: the user's pause and resume,
      * and the delivery pacer's permit holds, which arrive on other threads. Two writers taking
      * turns unserialized could interleave a pacer resume into the middle of a user pause and leave
      * the broker delivering into a session the user just stopped.
      *
      * LOCK ORDER: this lock nests under nothing of the pacer's - the pacer invokes its callbacks
      * outside its own lock precisely so this one stays a leaf.
      */
    private val permitLock = Object()

    /** The delivery pacer's half of flow control: stop asking the broker for more while the paced
      * backlog is over its watermark, without touching the gate.
      *
      * DELIBERATELY NOT [[pause]]. The user's pause closes the gate first, so everything already
      * prefetched is rejected and handed back for redelivery - correct for "stop showing me
      * things", and exactly wrong for a throttle, which wants the prefetched tail to drain through
      * the queue instead of cycling as nacks. Holding permits leaves the gate open: what has
      * arrived flows on, and only the ASKING stops.
      *
      * Refused outright while the gate is shut - the user's pause outranks the pacer, and a hold
      * "released" onto a paused session must not resume its consumers.
      */
    def setPermitHold(hold: Boolean): Unit = permitLock.synchronized {
        if consumerListener.isAcceptingNewMessages then
            consumers.foreach((_, consumer) => if hold then consumer.pause() else consumer.resume())
    }

    /** GATE FIRST, CONSUMERS SECOND, and the order is the point.
      *
      * `Consumer.pause` only stops the client asking the broker for more permits; whatever the
      * client has already received is still handed to the listener afterwards. Pausing first and
      * closing the gate second therefore left a window in which every buffered callback was
      * delivered into a session the user had just paused - and spent its start-from budget doing so.
      * Closing the gate first makes that window empty: everything already buffered is rejected and
      * handed back for redelivery on resume, which is exactly what a paused session promises.
      *
      * `resume` is deliberately the mirror image: it opens the gate and only then resumes the
      * consumers, so nothing is ever delivered while the gate is shut.
      */
    def pause(): Unit = permitLock.synchronized {
        consumerListener.stopAcceptingNewMessages()
        consumers.foreach((_, consumer) => consumer.pause())
    }

    /** Release this target's consumers, and answer with what could not be released.
      *
      * ANSWERS rather than throws: a session has other targets to release, and one broker that will
      * not delete a subscription must not strand every consumer after it. The caller aggregates.
      *
      * `close` follows `unsubscribe` WHATEVER the unsubscribe did, and that is the important part:
      * unsubscribing deletes the subscription on the broker, while closing releases the consumer,
      * its connection and its listener thread here. Only the first was ever done, so every session
      * that was stopped leaked its consumers - and a failed unsubscribe leaked them while reporting
      * success to the client.
      *
      * BOTH failures are reported. The close was wrapped in a bare `Try` whose result was thrown
      * away, so a consumer that refused to close - still connected, still holding its listener
      * thread - was invisible: `deleteConsumer` answered OK and nothing said the consumer was still
      * there.
      */
    def stop(): Vector[String] =
        val failures = consumers.toVector.flatMap { (topicFqn, consumer) =>
            val unsubscribed = Try(consumer.unsubscribe()).failed.toOption.map(err => s"$topicFqn: could not unsubscribe. ${err.getMessage}")
            val closed = Try(consumer.close()).failed.toOption.map(err => s"$topicFqn: could not close the consumer. ${err.getMessage}")
            unsubscribed.toVector ++ closed.toVector
        }
        consumers = Map.empty
        failures
}

object ConsumerSessionTargetRunner:
    val logger: Logger = Logger(getClass.getName)

    /** The most physical topics one target may resolve to. Generous - a session at this size is
      * already hard to use interactively - but a bound: past it, setup time, per-topic consumers
      * and the counted modes' per-message costs stop being an interactive workload at all. */
    val maxTopicsPerTarget: Int = 1_000
    
    def make(
        sessionName: String,
        targetIndex: Int,
        targetConfig: ConsumerSessionTarget,
        sessionContextPool: ConsumerSessionContextPool,
        schemasByTopic: SchemasByTopic,
        adminClient: PulsarAdmin,
        pulsarClient: PulsarClient
    ): ConsumerSessionTargetRunner =
        Try {
            val nonPartitionedTopicFqns = targetConfig.topicSelector.getNonPartitionedTopics(adminClient = adminClient)
            // A hard admission guard, checked BEFORE any consumer exists. A namespaced-regex
            // selector can match a whole namespace; past this many physical topics the session
            // would spend its life subscribing (one consumer, subscription and receiver queue per
            // topic) and every counted mode's per-message work scales with the count - refusing
            // loudly beats grinding into a session nobody can use.
            if nonPartitionedTopicFqns.size > maxTopicsPerTarget then
                throw new RuntimeException(
                    s"Target $targetIndex resolves to ${nonPartitionedTopicFqns.size} physical topics, more than the $maxTopicsPerTarget " +
                        "one session can handle. Narrow the topic selector (a tighter regex, or specific topics) or split the work " +
                        "across several sessions."
                )
            val receiverQueueSize = receiverQueueSizeFor(nonPartitionedTopicFqns.size)
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))

            // ALL OR NOTHING. Subscribing in a plain `map` meant a topic that failed part-way
            // through left every consumer created before it subscribed and running, with nothing
            // holding a handle to close them: the partly-built runner is never returned.
            val consumers: Map[NonPartitionedTopicFqn, Consumer[Array[Byte]]] = buildAllOrRelease[NonPartitionedTopicFqn, (NonPartitionedTopicFqn, Consumer[Array[Byte]])](
                inputs = nonPartitionedTopicFqns,
                build = topicFqn =>
                    val consumerName = s"$sessionName-$targetIndex"

                    buildConsumer(
                        pulsarClient = pulsarClient,
                        consumerName = consumerName,
                        topicsToConsume = Vector(topicFqn),
                        listener = listener,
                        targetConfig = targetConfig,
                        receiverQueueSize = receiverQueueSize
                    ) match
                        case Right(consumerBuilder) =>
                            val consumer = consumerBuilder.subscribe()
                            topicFqn -> consumer
                        case Left(err) =>
                            throw new RuntimeException(s"Failed to build consumer for topic $topicFqn. $err")
                ,
                release = (_, consumer) => consumer.close()
            ).toMap

            ConsumerSessionTargetRunner(
                targetIndex = targetIndex,
                targetConfig = targetConfig,
                sessionContextPool = sessionContextPool,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns,
                consumers = consumers,
                consumerListener = listener,
                schemasByTopic = schemasByTopic,
                stats = ConsumerSessionTargetStats(
                    messageProcessed = AtomicLong(0)
                )
            )
        } match {
            case Success(runner) => runner
            case Failure(err) =>
                throw new RuntimeException(s"Failed make topics for consumer session target. ${err.getMessage}")
        }
