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

type NonPartitionedTopicFqn = String

val logger: Logger = Logger(getClass.getName)

case class ConsumerSessionTargetRunner(
    targetIndex: Int,
    nonPartitionedTopicFqns: Vector[NonPartitionedTopicFqn],
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain,
    valueProjectionList: ValueProjectionList,
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
        isDebug: Boolean
    ): Unit =
        val thisTarget = this

        val listener = thisTarget.consumerListener
        val targetMessageHandler = listener.targetMessageHandler

        targetMessageHandler.onNext = (msg: Message[Array[Byte]]) =>
            boundary:
                thisTarget.stats.messagesProcessed += 1

                val sessionContext = thisTarget.sessionContextPool.getNextContext
                val consumerSessionMessage = converters.serializeMessage(thisTarget.schemasByTopic, msg)
                val messageJson = consumerSessionMessage.messageAsJsonOmittingValue
                val messageValueToJsonResult = consumerSessionMessage.messageValueAsJson

                sessionContext.setCurrentMessage(messageJson, messageValueToJsonResult)

                val messageFilterChainResult: ChainTestResult = sessionContext.testMessageFilterChain(
                    thisTarget.messageFilterChain
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

                val coloringRuleChainResult: Vector[ChainTestResult] = if thisTarget.coloringRuleChain.isEnabled then
                    thisTarget.coloringRuleChain.coloringRules
                        .filter(cr => cr.isEnabled)
                        .map(cr => sessionContext.testMessageFilterChain(cr.messageFilterChain))
                else
                    Vector.empty

                val valueProjectionListResult: Vector[ValueProjectionResult] = if thisTarget.valueProjectionList.isEnabled then
                    thisTarget.valueProjectionList.projections
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

        listener.startAcceptingNewMessages()
        consumers.foreach((_, consumer) => consumer.resume())

    def pause(): Unit =
        consumers.foreach((_, consumer) => consumer.pause())
        consumerListener.stopAcceptingNewMessages()

    def stop(): Unit =
        consumers.foreach((_, consumer) =>
            Try(consumer.unsubscribe()) match
                case Success(_)   => ()
                case Failure(err) => println(s"Failed to unsubscribe consumer. ${err.getMessage}")
        )
}

object ConsumerSessionTargetRunner:
    def make(
        sessionName: String,
        targetIndex: Int,
        sessionContextPool: ConsumerSessionContextPool,
        targetConfig: ConsumerSessionTarget,
        schemasByTopic: SchemasByTopic,
        adminClient: PulsarAdmin,
        pulsarClient: PulsarClient
    ): ConsumerSessionTargetRunner =
        Try {
            val nonPartitionedTopicFqns = targetConfig.topicSelector.getNonPartitionedTopics(adminClient = adminClient)
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))

            val consumers: Map[NonPartitionedTopicFqn, Consumer[Array[Byte]]] = nonPartitionedTopicFqns.map { topicFqn =>
                val consumerName = s"$sessionName-$targetIndex"

                buildConsumer(
                    pulsarClient = pulsarClient,
                    consumerName = consumerName,
                    topicsToConsume = Vector(topicFqn),
                    listener = listener
                ) match
                    case Right(consumerBuilder) =>
                        val consumer = consumerBuilder.subscribe()
                        topicFqn -> consumer
                    case Left(err) =>
                        throw new RuntimeException(s"Failed to build consumer for topic $topicFqn. $err")
            }.toMap

            ConsumerSessionTargetRunner(
                targetIndex = targetIndex,
                sessionContextPool = sessionContextPool,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns,
                consumers = consumers,
                messageFilterChain = targetConfig.messageFilterChain,
                coloringRuleChain = targetConfig.coloringRuleChain,
                valueProjectionList = targetConfig.valueProjectionList,
                consumerListener = listener,
                schemasByTopic = schemasByTopic,
                stats = ConsumerSessionTargetStats(
                    messagesProcessed = 0
                )
            )
        } match {
            case Success(runner) => runner
            case Failure(err) =>
                throw new RuntimeException(s"Failed make topics for consumer session target. ${err.getMessage}")
        }
