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
    // One arbiter per consumer: user pause, merge flow control and the delivery pacer all hold
    // and release through these, never through consumer.pause()/resume() directly - see
    // [[ConsumerPauseArbiter]] for the stomping this ended.
    val pauseArbiters: Map[NonPartitionedTopicFqn, ConsumerPauseArbiter],
    var consumerListener: ConsumerListener,
    var stats: ConsumerSessionTargetStats
) {
    /** @param admitDelivery
      *   what the SESSION says about this delivery attempt before this target does anything for
      *   it. It carries the play-generation gate - which has to be asked HERE, in front of the
      *   first mutation, not in the session callback at the end - and the re-send of a response a
      *   previous attempt already prepared for the same message. See [[DeliveryAdmission]].
      */
    def resume(
        onNext: (
            msg: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String],
            deliveryKey: Option[DeliveryKey]
        ) => Unit,
        isDebug: Boolean,
        incrementNumMessageProcessed: () => Unit,
        onStartFromDiscardProgress: () => Unit,
        admitDelivery: Option[DeliveryKey] => DeliveryAdmission
    ): Unit =
        val listener = consumerListener
        val targetMessageHandler = listener.targetMessageHandler

        // Rewired on every play, like the message handler above it, so a skip still in flight
        // reports to whichever client is listening NOW. The discard counter itself is NOT touched
        // here - it is armed once, at session creation.
        listener.onStartFromDiscardProgress = onStartFromDiscardProgress

        targetMessageHandler.onNext = (msg: Message[Array[Byte]]) =>
            val deliveryKey = ConsumerSessionTargetRunner.deliveryKeyOf(msg)
            admitDelivery(deliveryKey) match
                // A HANDLER FROM A SUPERSEDED PLAY: a listener thread still mid-flight across a
                // second Play, or across a Stop or a stream ended by a failed resume. It must
                // touch NOTHING - not the counters, not the JS context, not the user's stateful
                // filters - because the message is coming back and the play that is actually
                // current will process it properly. Throwing routes it to the caller's failure
                // path, which hands it back for redelivery.
                case DeliveryAdmission.Superseded =>
                    throw new IllegalStateException("This play was superseded; the message is handed back for redelivery.")

                // THE RETRY OF A FAILED SEND: the session re-sent what the first attempt had
                // already prepared, so this pipeline must not run a second time for it.
                case DeliveryAdmission.Replayed => ()

                case DeliveryAdmission.Prepare => deliverPrepared(msg, deliveryKey, onNext, isDebug, incrementNumMessageProcessed)

        permitLock.synchronized {
            listener.startAcceptingNewMessages()
            // Release the USER's hold AND the replay-boundary hold - a Resume extends the replay
            // boundary (the runner re-captured it before this walk), so a past-end racer's pause
            // and the auto-pause at caught-up both lift with it. A merge- or limiter-held
            // consumer stays paused until its own owner lets go - resuming it here is exactly
            // the stomp the arbiter ended. EVERY consumer is attempted; a client call that
            // throws is aggregated and rethrown, because a session that claims to be running
            // with a dead consumer must fail the resume loudly (the service turns this into the
            // terminal gate).
            val failures = pauseArbiters.toVector.flatMap { (topicFqn, arbiter) =>
                val userReleased = arbiter.release(PauseReason.User)
                val boundaryReleased = arbiter.release(PauseReason.Boundary)
                Option.when(!(userReleased && boundaryReleased))(topicFqn)
            }
            if failures.nonEmpty then
                throw new RuntimeException(s"Some consumers could not be resumed: ${failures.mkString(", ")}")
        }

    /** The target's half of ONE delivery attempt: count it, deserialize it, and run the target's
      * JavaScript over it before handing it to the session callback. Everything in here is
      * stateful and none of it is repeatable, which is why the admission above stands in front. */
    private def deliverPrepared(
        msg: Message[Array[Byte]],
        deliveryKey: Option[DeliveryKey],
        onNext: (
            msg: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String],
            deliveryKey: Option[DeliveryKey]
        ) => Unit,
        isDebug: Boolean,
        incrementNumMessageProcessed: () => Unit
    ): Unit =
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
                        errors = if isDebug then messageFilterChainErrors else Vector.empty,
                        deliveryKey = deliveryKey
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
                            // ORDERED delivery (Guaranteed or, since 2026-08-11, Best effort):
                            // the layer decided this delivery undercuts an already-emitted order
                            // key - the row is on screen out of order, LOUDLY. Thread-local, so
                            // the stamp read here pairs with the delivery running on THIS call
                            // stack; false on every unordered path.
                            .withDeliveredOutOfOrder(consumerListener.outOfOrderFlagPending.get)
                    )
                )

                onNext(
                    msg = msgToSend,
                    sessionContext = sessionContext,
                    stats = stats,
                    errors = errors,
                    deliveryKey = deliveryKey
                )
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
    /** `appliesTo` selects WHICH of this target's streams the hold covers. A hold is per stream
      * because a counted start-from can still be waiting for one particular topic's next message
      * while its peers are the ones flooding: holding all of them (or, as it used to be, none of
      * them) is what let one stuck stream disable the whole session's backpressure. A RELEASE
      * always covers everything - the default - so nothing can be left behind by a hold that
      * covered a different set.
      */
    def setPermitHold(hold: Boolean, appliesTo: NonPartitionedTopicFqn => Boolean = _ => true): Boolean = permitLock.synchronized {
        // EVERY selected consumer is attempted, and the hold is recorded even while the user has
        // the session paused: with per-reason arbitration a release onto a paused session cannot
        // resume anything (the User reason still holds), so the old gate-shut refusal is no
        // longer needed to protect the pause - and recording keeps the pacer's books honest.
        val results = pauseArbiters.toVector.collect {
            case (topicFqn, arbiter) if appliesTo(topicFqn) =>
                if hold then arbiter.hold(PauseReason.Limiter) else arbiter.release(PauseReason.Limiter)
        }
        results.forall(identity)
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
        // EVERY consumer is attempted: one mid-close consumer throwing must not leave the rest
        // delivering into a gate that is already shut (they would cycle as nacks) while the
        // caller believes nothing was paused. Failures are aggregated and thrown AFTER the
        // session has reached the safest state this call can produce.
        val failures = pauseArbiters.toVector.flatMap { (topicFqn, arbiter) =>
            Option.when(!arbiter.hold(PauseReason.User))(topicFqn)
        }
        if failures.nonEmpty then
            throw new RuntimeException(s"Some consumers could not be paused (their pause is still recorded): ${failures.mkString(", ")}")
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
      *
      * AND A CONSUMER THAT COULD NOT BE RELEASED IS KEPT, not forgotten. The map used to be cleared
      * unconditionally, so a consumer that was mid-reconnect at that instant - the ordinary reason
      * either call fails - kept its subscription and its listener thread for the life of the
      * process with nothing anywhere holding a handle to it: this runner is discarded by its caller
      * a moment later. It stays in `consumers` (so a repeated stop retries it) and goes into
      * `quarantine`, which is what actually retries it once this runner is gone.
      *
      * @param quarantine
      *   where un-released consumers are retained. A parameter with the production default only so
      *   a test can drive the retry without touching the process-wide one.
      */
    def stop(quarantine: CleanupQuarantine = consumerCleanupQuarantine): Vector[String] =
        val outcomes = consumers.toVector.map { (topicFqn, consumer) =>
            val unsubscribed = Try(consumer.unsubscribe()).failed.toOption.map(err => s"$topicFqn: could not unsubscribe. ${err.getMessage}")
            val closed = Try(consumer.close()).failed.toOption.map(err => s"$topicFqn: could not close the consumer. ${err.getMessage}")
            val failures = unsubscribed.toVector ++ closed.toVector
            if failures.nonEmpty then
                quarantine.quarantine(
                    s"consumer session $sessionLabel on $topicFqn",
                    () =>
                        // BOTH again on retry, and in the same order: the unsubscribe may have been
                        // the half that failed, and closing without it would leave the subscription.
                        consumer.unsubscribe()
                        consumer.close()
                )
            (topicFqn, consumer, failures)
        }
        // Only what really was released is forgotten.
        consumers = outcomes.collect { case (topicFqn, consumer, failures) if failures.nonEmpty => topicFqn -> consumer }.toMap
        outcomes.flatMap(_._3)

    /** How this target names itself in cleanup diagnostics. The consumer name is
      * `${sessionName}-${targetIndex}`, so the first consumer's name identifies the session without
      * this runner having to carry the session name separately. */
    private def sessionLabel: String =
        consumers.values.headOption.flatMap(consumer => Option(consumer.getConsumerName)).getOrElse(s"target $targetIndex")
}

object ConsumerSessionTargetRunner:
    val logger: Logger = Logger(getClass.getName)

    /** This message's identity for the session's single-attempt delivery memo, or None when it has
      * none that can be trusted. Every message on a NON-PERSISTENT topic arrives as ledger 0,
      * entry 0 - measured against a real broker - so a key there would name the next unrelated
      * message of the topic instead of this one; nothing on such a topic is ever redelivered
      * either, so there is no retry for a memo to serve. Same identity rule as the failed-ack and
      * decided-batch registries in [[ConsumerListener]]. */
    private[session_runner] def deliveryKeyOf(msg: Message[Array[Byte]]): Option[DeliveryKey] =
        Option(msg.getTopicName).filterNot(isNonPersistentTopic).map(topicFqn => (topicFqn, msg.getMessageId))

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
        pulsarClient: PulsarClient,
        // Resolved - and ADMITTED - by the session builder before any consumer exists anywhere:
        // the session-total stream cap and the merge-mode prefetch budget are session-wide facts
        // no single target can compute, and resolving here used to mean a session could
        // subscribe hundreds of consumers only to be refused by a total it was always going to
        // exceed.
        nonPartitionedTopicFqns: Vector[NonPartitionedTopicFqn],
        // Computed by the caller from the WHOLE session's stream count: the racing default for
        // as-received sessions, the shared prefetch budget for best-effort-ordered ones.
        receiverQueueSize: Int
    ): ConsumerSessionTargetRunner =
        Try {
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
                release = (_, consumer) => consumer.close(),
                // A consumer that will not close during the unwind is exactly the one nothing else
                // can ever reach: this partly-built map is never returned.
                onReleaseFailure = (entry, _) =>
                    consumerCleanupQuarantine.quarantine(s"consumer session $sessionName-$targetIndex on ${entry._1}", () => entry._2.close())
            ).toMap

            val pauseArbiters = consumers.map((topicFqn, consumer) => topicFqn -> ConsumerPauseArbiter(consumer))
            // The merge's flow-control hooks hold and release through the same arbiters, keyed by
            // the stream id the ordering layer uses.
            listener.pauseArbiters = pauseArbiters.map((topicFqn, arbiter) => startFromStreamId(s"$sessionName-$targetIndex", topicFqn) -> arbiter)

            ConsumerSessionTargetRunner(
                targetIndex = targetIndex,
                targetConfig = targetConfig,
                sessionContextPool = sessionContextPool,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns,
                consumers = consumers,
                pauseArbiters = pauseArbiters,
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
