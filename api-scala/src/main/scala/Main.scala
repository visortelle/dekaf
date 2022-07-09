import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.consumer.{
    ConsumerServiceGrpc,
    CreateConsumerRequest,
    CreateConsumerResponse,
    DeleteConsumerRequest,
    DeleteConsumerResponse,
    PauseRequest,
    PauseResponse,
    ResumeRequest,
    ResumeResponse,
    TopicSelector
}
import io.grpc.{Server, ServerBuilder}

import com.typesafe.scalalogging.Logger
import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver
import io.grpc.protobuf.services.ProtoReflectionService

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import org.apache.pulsar.client.api.{SubscriptionMode, SubscriptionType}
import org.apache.pulsar.client.api.SubscriptionInitialPosition
import org.apache.pulsar.client.api.RegexSubscriptionMode
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.google.protobuf.timestamp
import org.apache.pulsar.client.api.Message
import scala.concurrent.Await
import scala.concurrent.duration.MILLISECONDS
import java.util.UUID
import java.time.Instant

case class Config(pulsarServiceUrl: String, grpcPort: Int)
val config = Config("pulsar://localhost:6650", grpcPort = 8090)

@main def main: Unit =
    println("Starting Pulsar X-Ray server")
    server.start
    server.awaitTermination

val client = PulsarClient.builder().serviceUrl(config.pulsarServiceUrl).build()

type ConsumerName = String

class StreamDataHandler:
    var onNext: (msg: Message[Array[Byte]]) => Unit = _ => ()

private class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    var consumers: Map[ConsumerName, Consumer[Array[Byte]]] = Map.empty
    var streamDataHandlers: Map[ConsumerName, StreamDataHandler] = Map.empty
    val logger = Logger(getClass.getName)

    override def resume(request: ResumeRequest, responseObserver: StreamObserver[ResumeResponse]): Unit =
        val consumerName = request.consumerName
        logger.debug(s"Resume consuming. Consumer: $consumerName")

        consumers.get(consumerName) match
            case Some(consumer) =>
                consumer.resume
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = "No such consumer: $consumerName")
                return Future.successful(PauseResponse(status = Some(status)))

        val streamDataHandler = streamDataHandlers.get(consumerName)
        streamDataHandler match
            case Some(handler) =>
                handler.onNext = (msg: Message[Array[Byte]]) =>
                    logger.debug(s"Message received. Consumer: $consumerName, Message id: ${msg.getMessageId()}")

                    val message = consumerPb.Message(
                      properties = msg.getProperties.asScala.toMap,
                      data = ByteString.copyFrom(msg.getData),
                      value = msg.getValue.toString(),
                      size = msg.getData.length,
                      eventTime = Some(timestamp.Timestamp(Instant.ofEpochMilli(msg.getEventTime).getNano)),
                      publishTime = Some(timestamp.Timestamp(Instant.ofEpochMilli(msg.getPublishTime).getNano)),
                      brokerPublishTime = msg.getBrokerPublishTime.toScala match
                          case Some(v) => Some(timestamp.Timestamp(Instant.ofEpochMilli(v).getNano))
                          case _       => None
                      ,
                      messageId = ByteString.copyFrom(msg.getMessageId.toByteArray),
                      sequenceId = msg.getSequenceId,
                      producerName = msg.getProducerName,
                      key = msg.getKey,
                      orderingKey = ByteString.copyFrom(msg.getOrderingKey),
                      topic = msg.getTopicName,
                      redeliveryCount = msg.getRedeliveryCount(),
                      schemaVersion = ByteString.copyFrom(msg.getSchemaVersion()),
                      isReplicated = msg.isReplicated(),
                      replicatedFrom = msg.getReplicatedFrom()
                    )
                    consumers.get(consumerName) match
                        case Some(consumer) => responseObserver.onNext(ResumeResponse(messages = Seq(message)))
                        case _              => ()

                val status: Status = Status(code = Code.OK.index)
                return Future.successful(PauseResponse(status = Some(status)))
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = "No such consumer: $consumerName")
                return Future.successful(PauseResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val consumerName = request.consumerName
        logger.debug(s"Pausing consumer. Consumer: $consumerName")

        consumers.get(consumerName) match
            case Some(consumer) =>
                consumer.pause
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = "No such consumer: $consumerName")
                return Future.successful(PauseResponse(status = Some(status)))

        val streamDataHandler = streamDataHandlers.get(consumerName)

        streamDataHandler match
            case Some(handler) =>
                handler.onNext = _ => ()
                val status: Status = Status(code = Code.OK.index)
                return Future.successful(PauseResponse(status = Some(status)))
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = "No such consumer: $consumerName")
                return Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val consumerName = request.consumerName.getOrElse("__xray" + UUID.randomUUID().toString)
        logger.debug(s"Creating consumer. Consumer: $consumerName")

        val streamDataHandler = StreamDataHandler()
        streamDataHandler.onNext = _ => ()
        streamDataHandlers = streamDataHandlers + (consumerName -> streamDataHandler)

        val listener: MessageListener[Array[Byte]] = (consumer, msg) =>
            logger.debug(s"Listener received a message. Consumer: $consumerName")
            streamDataHandlers.get(consumerName) match
                case Some(handler) => handler.onNext(msg)
                case _             => ()

            if consumer.isConnected then consumer.acknowledge(msg)

        var consumer = client.newConsumer
            .consumerName(consumerName)
            .messageListener(listener)
            .startPaused(request.startPaused.getOrElse(true))
            .subscriptionName(request.subscriptionName.getOrElse(consumerName))

        consumer = request.subscriptionMode match
            case Some(consumerPb.SubscriptionMode.SUBSCRIPTION_MODE_DURABLE)     => consumer.subscriptionMode(SubscriptionMode.Durable)
            case Some(consumerPb.SubscriptionMode.SUBSCRIPTION_MODE_NON_DURABLE) => consumer.subscriptionMode(SubscriptionMode.NonDurable)
            case _                                                               => consumer

        consumer = request.subscriptionType match
            case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED)     => consumer.subscriptionType(SubscriptionType.Shared)
            case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER)   => consumer.subscriptionType(SubscriptionType.Failover)
            case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE)  => consumer.subscriptionType(SubscriptionType.Exclusive)
            case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED) => consumer.subscriptionType(SubscriptionType.Key_Shared)
            case _                                                              => consumer

        consumer = request.subscriptionInitialPosition match
            case Some(consumerPb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST) =>
                consumer.subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
            case Some(consumerPb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST) =>
                consumer.subscriptionInitialPosition(SubscriptionInitialPosition.Latest)
            case _ => consumer

        consumer = request.priorityLevel match
            case Some(v) => consumer.priorityLevel(v)
            case _       => consumer

        consumer = request.ackTimeoutMs match
            case Some(v) => consumer.ackTimeout(v, MILLISECONDS)
            case _       => consumer

        consumer = request.ackTimeoutTickTimeMs match
            case Some(v) => consumer.ackTimeoutTickTime(v, MILLISECONDS)
            case _       => consumer

        consumer = request.expireTimeOfIncompleteChunkedMessageMs match
            case Some(v) => consumer.expireTimeOfIncompleteChunkedMessage(v, MILLISECONDS)
            case _       => consumer

        consumer = request.acknowledgmentGroupTimeMs match
            case Some(v) => consumer.acknowledgmentGroupTime(v, MILLISECONDS)
            case _       => consumer

        consumer = request.negativeAckRedeliveryDelayMs match
            case Some(v) => consumer.negativeAckRedeliveryDelay(v, MILLISECONDS)
            case _       => consumer

        request.topicSelector match
            case Some(topicSelector) if topicSelector.selector.topic.isDefined =>
                consumer = consumer.topic(topicSelector.selector.topic.get)
            case _ =>
                val status: Status = Status(
                  code = Code.INVALID_ARGUMENT.index,
                  message = "Topic selector shouldn't be empty"
                )
                return Future.successful(CreateConsumerResponse(status = Some(status)))

        consumers = consumers + (consumerName -> consumer.subscribe)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val consumerName = request.consumerName
        logger.debug(s"Deleting consumer. Consumer: $consumerName")

        consumers.get(consumerName) match
            case Some(consumer) =>
                consumer.close
                consumers = consumers - consumerName
            case _ => ()
        streamDataHandlers.get(consumerName) match
            case Some(handler) =>
                handler.onNext = _ => ()
                streamDataHandlers = streamDataHandlers - consumerName
            case _ => ()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteConsumerResponse(status = Some(status)))

val server = ServerBuilder
    .forPort(config.grpcPort)
    .addService(ConsumerServiceGrpc.bindService(ConsumerServiceImpl(), ExecutionContext.global))
    .addService(ProtoReflectionService.newInstance)
    .build
