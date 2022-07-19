package consumer

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
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
    SeekRequest,
    SeekResponse,
    SkipMessagesRequest,
    SkipMessagesResponse,
    TopicsSelector
}
import _root_.client.{adminClient, client}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
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
    var processedMessagesCount: Map[ConsumerName, Long] = Map.empty
    var topics: Map[ConsumerName, Vector[String]] = Map.empty
    var responseObservers: Map[ConsumerName, StreamObserver[ResumeResponse]] = Map.empty

    val logger: Logger = Logger(getClass.getName)

    override def resume(request: ResumeRequest, responseObserver: StreamObserver[ResumeResponse]): Unit =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Resume consuming. Consumer: $consumerName")

        responseObservers = responseObservers + (consumerName -> responseObserver)

        val consumer = consumers.get(consumerName) match
            case Some(consumer) => consumer
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

                    processedMessagesCount = processedMessagesCount + (consumerName -> (processedMessagesCount.getOrElse(consumerName, 0: Long) + 1))

                    val message = messageFromPb(msg)

                    consumers.get(consumerName) match
                        case Some(_) =>
                            val resumeResponse = ResumeResponse(
                              messages = Seq(message),
                              processedMessages = processedMessagesCount.getOrElse(consumerName, 0: Long)
                            )
                            responseObserver.onNext(resumeResponse)
                        case _ => ()

                consumer.resume()
                val status: Status = Status(code = Code.OK.index)
                Future.successful(ResumeResponse(status = Some(status)))
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Pausing consumer. Consumer: $consumerName")

        val consumer = consumers.get(consumerName) match
            case Some(consumer) => consumer
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        consumer.pause()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val consumerName: ConsumerName = request.consumerName.getOrElse("__xray" + UUID.randomUUID().toString)
        logger.info(s"Creating consumer. Consumer: $consumerName")

        val streamDataHandler = StreamDataHandler()
        streamDataHandler.onNext = _ => ()
        streamDataHandlers = streamDataHandlers + (consumerName -> streamDataHandler)
        processedMessagesCount = processedMessagesCount + (consumerName -> 0)

        request.topicsSelector match
            case Some(topicsSelector) =>
                topics = topics + (consumerName -> topicsSelector.getByNames.topics.toVector)
            case _ => ()

        val consumerBuilder = buildConsumer(consumerName, request, logger, streamDataHandler) match
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

        def tryUnsubscribe: Unit =
            consumers.get(consumerName) match
                case Some(consumer) =>
                    try {
                        consumer.unsubscribe()
                    } catch
                        // Unsubscribe fails on partitioned topics in most cases. Anyway we can' handle it meaningfully.
                        _ => ()
                    finally ()
                case _ => ()

        tryUnsubscribe

        consumers = consumers.removed(consumerName)
        streamDataHandlers = streamDataHandlers.removed(consumerName)
        processedMessagesCount = processedMessagesCount.removed(consumerName)
        responseObservers = responseObservers.removed(consumerName)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteConsumerResponse(status = Some(status)))

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

    override def skipMessages(request: SkipMessagesRequest): Future[SkipMessagesResponse] =
        val status: Status = Status(code = Code.OK.index)
        Future.successful(SkipMessagesResponse(status = Some(status)))
