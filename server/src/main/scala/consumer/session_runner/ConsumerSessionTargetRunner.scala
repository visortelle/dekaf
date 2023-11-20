package consumer.session_runner

import _root_.consumer.message_filter.MessageFilterChain
import com.tools.teal.pulsar.ui.api.v1.consumer.ResumeResponse
import _root_.consumer.session_target.ConsumerSessionTarget
import com.typesafe.scalalogging.Logger
import consumer.coloring_rules.ColoringRuleChain
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.api.Consumer
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message

import scala.util.{Failure, Success, Try}

case class StreamDataHandler(var onNext: (msg: Message[Array[Byte]]) => Unit)

type NonPartitionedTopicFqn = String

val logger: Logger = Logger(getClass.getName)

case class ConsumerSessionTargetRunner(
    nonPartitionedTopicFqns: Vector[NonPartitionedTopicFqn],
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain,
    schemasByTopic: SchemasByTopic,
    consumerSessionContext: ConsumerSessionContext,
    var consumers: Map[NonPartitionedTopicFqn, Consumer[Array[Byte]]],
    var listener: TopicMessageListener,
    var processedMessagesCount: Long,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[ResumeResponse]]
) {
    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[ResumeResponse]
    ): Unit =
        val thisTarget = this

        this.grpcResponseObserver = Some(grpcResponseObserver)

        val listener = thisTarget.listener
        val streamDataHandler = listener.streamDataHandler
        val consumerSessionContext = thisTarget.consumerSessionContext

        streamDataHandler.onNext = (msg: Message[Array[Byte]]) =>
            thisTarget.processedMessagesCount += 1

            val (messagePb, jsonMessage, messageValueToJsonResult) = converters.serializeMessage(thisTarget.schemasByTopic, msg)

            val messageFilterChain = thisTarget.messageFilterChain

            val (filterResult, jsonAccumulator) =
                getFilterChainTestResult(messageFilterChain, consumerSessionContext, jsonMessage, messageValueToJsonResult)

            val messageToSend = messagePb
                .withAccumulator(jsonAccumulator)
                .withDebugStdout(consumerSessionContext.getStdout())

            val messages = filterResult match
                case Right(true) => Seq(messageToSend)
                case _           => Seq()

            val status: Status = filterResult match
                case Right(_)  => Status(code = Code.OK.index)
                case Left(err) => Status(code = Code.INVALID_ARGUMENT.index, message = err)

            val resumeResponse = ResumeResponse(
                status = Some(status),
                messages = messages,
                processedMessages = thisTarget.processedMessagesCount
            )
            grpcResponseObserver.onNext(resumeResponse)

        listener.startAcceptingNewMessages()
        consumers.foreach((_, consumer) => consumer.resume())

    def pause(): Unit =
        consumers.foreach((_, consumer) => consumer.pause())
        listener.stopAcceptingNewMessages()

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
        targetName: String,
        sessionContext: ConsumerSessionContext,
        targetConfig: ConsumerSessionTarget,
        grpcResponseObserver: Option[io.grpc.stub.StreamObserver[ResumeResponse]],
        schemasByTopic: SchemasByTopic,
        adminClient: PulsarAdmin,
        pulsarClient: PulsarClient
    ): ConsumerSessionTargetRunner =
        Try {
            val nonPartitionedTopicFqns = targetConfig.topicSelector.getNonPartitionedTopics(adminClient = adminClient)
            val listener = TopicMessageListener(StreamDataHandler(onNext = _ => ()))

            val consumers: Map[NonPartitionedTopicFqn, Consumer[Array[Byte]]] = nonPartitionedTopicFqns.map { topicFqn =>
                val consumerName = s"$sessionName-$targetName"
                
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
                consumerSessionContext = sessionContext,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns,
                consumers = consumers,
                messageFilterChain = targetConfig.messageFilterChain,
                coloringRuleChain = targetConfig.coloringRuleChain,
                grpcResponseObserver = grpcResponseObserver,
                listener = listener,
                schemasByTopic = schemasByTopic,
                processedMessagesCount = 0
            )
        } match {
            case Success(runner) => runner
            case Failure(err) =>
                throw new RuntimeException(s"Failed make topics for consumer session target. ${err.getMessage}")
        }
