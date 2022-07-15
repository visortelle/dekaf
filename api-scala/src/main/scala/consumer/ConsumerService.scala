package consumer

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.consumer.{ConsumerServiceGrpc, CreateConsumerRequest, CreateConsumerResponse, DeleteConsumerRequest, DeleteConsumerResponse, DeleteSubscriptionsRequest, DeleteSubscriptionsResponse, PauseRequest, PauseResponse, ResumeRequest, ResumeResponse, SeekRequest, SeekResponse, TopicsSelector}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.google.protobuf.timestamp
import com.tools.teal.pulsar.ui.api.v1.consumer.SeekRequest.Seek
import org.apache.pulsar.client.api.{Message, MessageId}

import java.util.UUID
import java.time.Instant

type ConsumerName = String

class StreamDataHandler:
    var onNext: (msg: Message[Array[Byte]]) => Unit = _ => ()

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    var consumers: Map[ConsumerName, Consumer[Array[Byte]]] = Map.empty
    var streamDataHandlers: Map[ConsumerName, StreamDataHandler] = Map.empty
    val logger = Logger(getClass.getName)

    override def resume(request: ResumeRequest, responseObserver: StreamObserver[ResumeResponse]): Unit =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Resume consuming. Consumer: $consumerName")

        consumers.get(consumerName) match
            case Some(consumer) =>
                consumer.resume
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        val streamDataHandler = streamDataHandlers.get(consumerName)
        streamDataHandler match
            case Some(handler) =>
                handler.onNext = (msg: Message[Array[Byte]]) =>
                    logger.debug(s"Message received. Consumer: $consumerName, Message id: ${msg.getMessageId}")

                    val message = consumerPb.Message(
                      properties = Option(msg.getProperties) match
                          case Some(v) => v.asScala.toMap
                          case _       => Map.empty
                      ,
                      data = Option(msg.getData) match
                          case Some(v) => Option(ByteString.copyFrom(v))
                          case _       => None
                      ,
                      value = Option(msg.getValue) match
                          case Some(v) => Option(v.map(_.toChar).mkString)
                          case _       => None
                      ,
                      size = Option(msg.getData) match
                          case Some(v) => Some(v.length)
                          case _       => None
                      ,
                      eventTime = Option(msg.getEventTime) match
                          case Some(v) => if v > 0 then Some(timestamp.Timestamp(Instant.ofEpochMilli(v))) else None
                          case _       => None
                      ,
                      publishTime = Option(msg.getPublishTime) match
                          case Some(v) =>
                              Some(timestamp.Timestamp(Instant.ofEpochMilli(v)))
                          case _ => None
                      ,
                      brokerPublishTime = Option(msg.getBrokerPublishTime) match
                          case Some(v) =>
                              v.toScala match
                                  case Some(l) => Some(timestamp.Timestamp(Instant.ofEpochMilli(l)))
                                  case _       => None
                          case _ => None
                      ,
                      messageId = Option(msg.getMessageId.toByteArray) match
                          case Some(v) => Some(ByteString.copyFrom(v))
                          case _       => None
                      ,
                      sequenceId = Option(msg.getSequenceId),
                      producerName = Option(msg.getProducerName),
                      key = Option(msg.getKey),
                      orderingKey = Option(msg.getOrderingKey) match
                          case Some(v) => Some(ByteString.copyFrom(v))
                          case _       => None
                      ,
                      topic = Option(msg.getTopicName),
                      redeliveryCount = Option(msg.getRedeliveryCount),
                      schemaVersion = Option(msg.getSchemaVersion) match
                          case Some(v) => Some(ByteString.copyFrom(v))
                          case _       => None
                      ,
                      isReplicated = Option(msg.isReplicated),
                      replicatedFrom = Option(msg.getReplicatedFrom)
                    )
                    consumers.get(consumerName) match
                        case Some(consumer) => responseObserver.onNext(ResumeResponse(messages = Seq(message)))
                        case _              => ()

                val status: Status = Status(code = Code.OK.index)
                return Future.successful(ResumeResponse(status = Some(status)))
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Pausing consumer. Consumer: $consumerName")

        consumers.get(consumerName) match
            case Some(consumer) =>
                consumer.pause
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        val streamDataHandler = streamDataHandlers.get(consumerName)

        streamDataHandler match
            case Some(handler) =>
                handler.onNext = _ => ()
                val status: Status = Status(code = Code.OK.index)
                return Future.successful(PauseResponse(status = Some(status)))
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val consumerName: ConsumerName = request.consumerName.getOrElse("__xray" + UUID.randomUUID().toString)
        logger.info(s"Creating consumer. Consumer: $consumerName")

        val streamDataHandler = StreamDataHandler()
        streamDataHandler.onNext = _ => ()
        streamDataHandlers = streamDataHandlers + (consumerName -> streamDataHandler)

        val consumerBuilder = buildConsumer(consumerName, request, logger, streamDataHandlers) match
            case Right(consumer) => consumer
            case Left(error) =>
                logger.warn(error)
                val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = error)
                return Future.successful(CreateConsumerResponse(status = Some(status)))

        val consumer = consumerBuilder.subscribe
        consumers = consumers + (consumerName -> consumer)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val consumerName = request.consumerName
        logger.info(s"Deleting consumer. Consumer: $consumerName")

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

    override def deleteSubscriptions(request: DeleteSubscriptionsRequest): Future[DeleteSubscriptionsResponse] =
        request.subscriptions.foreach(s => {
            logger.info(s"Deleting subscription. Topic: ${s.topic}, Subscription: ${s.subscriptionName}")
            try {
                adminClient.topics().deleteSubscription(s.topic, s.subscriptionName, s.force)
            } catch {
                // Ignore. If we can't delete the subscription or it not found, we can't do anything with it anyway.
                case _ => ()
            }
        })

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteSubscriptionsResponse(status = Some(status)))

    override def seek(request: SeekRequest): Future[SeekResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Seek over subscription. Consumer: $consumerName")

        val consumer = consumers.get(consumerName) match
            case Some(v) => v
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(SeekResponse(status = Some(status)))

        request.seek match
            case Seek.Empty => Left("Seek request should contain timestamp or message id")
            case Seek.Timestamp(v) =>
                logger.info(s"Seek by timestamp. Consumer ${request.consumerName}. Timestamp: ${v.toString}")
                consumer.seek(Instant.ofEpochSecond(v.seconds, v.nanos).toEpochMilli)
                Right(())
            case Seek.MessageId(v) =>
                logger.info(s"Seek by message id. Consumer ${request.consumerName}. Message id: ${v.toString}")
                try {
                    val messageId = MessageId.fromByteArray(v.toByteArray)
                    consumer.seek(messageId)
                    Right(())
                } catch {
                    case _ =>
                        val status: Status = Status(code = Code.INVALID_ARGUMENT.index)
                        return Future.successful(SeekResponse(status = Some(status)))
                }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(SeekResponse(status = Some(status)))
