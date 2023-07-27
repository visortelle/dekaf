package consumer

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import com.tools.teal.pulsar.ui.api.v1.consumer.{ConsumerServiceGrpc, CreateConsumerRequest, CreateConsumerResponse, DeleteConsumerRequest, DeleteConsumerResponse, MessageFilterChain, PauseRequest, PauseResponse, ResumeRequest, ResumeResponse, RunCodeRequest, RunCodeResponse, SeekRequest, SeekResponse, SkipMessagesRequest, SkipMessagesResponse, TopicsSelector, MessageFilter as MessageFilterPb}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import io.grpc.stub.StreamObserver

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.SeekRequest.Seek
import org.apache.pulsar.client.api.{Message, MessageId}
import consumer.MessageFilter
import _root_.pulsar_auth.RequestContext

import java.io.ByteArrayOutputStream
import java.util.UUID
import java.time.Instant

type ConsumerName = String

class StreamDataHandler:
    var onNext: Message[Array[Byte]] => Unit =
        message => ()

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    val logger: Logger = Logger(getClass.getName)

    var topics: Map[ConsumerName, Vector[String]] = Map.empty
    var schemasByTopic: SchemasByTopic = Map.empty
    private var messageFilters: Map[ConsumerName, MessageFilter] = Map.empty
    private var consumers: Map[ConsumerName, Consumer[Array[Byte]]] = Map.empty
    private var streamDataHandlers: Map[ConsumerName, StreamDataHandler] = Map.empty
    private var processedMessagesCount: Map[ConsumerName, Long] = Map.empty
    private var responseObservers: Map[ConsumerName, StreamObserver[ResumeResponse]] = Map.empty
    var listener: TopicMessageListener = _


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
        val messageFilter = messageFilters.get(consumerName) match
            case Some(f) => f
            case _ =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Message filter context isn't found for consumer: $consumerName"
                )
                return Future.successful(PauseResponse(status = Some(status)))

        streamDataHandler match
            case Some(handler) =>
                handler.onNext = (msg: Message[Array[Byte]]) =>
                    logger.debug(s"Message received. Consumer: $consumerName, Message id: ${msg.getMessageId}")

                    processedMessagesCount = processedMessagesCount + (consumerName -> (processedMessagesCount.getOrElse(consumerName, 0: Long) + 1))
                    val (messagePb, jsonMessage, messageValueToJsonResult) = converters.serializeMessage(schemasByTopic, msg)

                    val (filterResult, jsonAccumulator) =
                        getFilterChainTestResult(request.messageFilterChain, messageFilter, jsonMessage, messageValueToJsonResult)

                    val messageToSend = messagePb
                        .withAccumulator(jsonAccumulator)
                        .withDebugStdout(messageFilter.getStdout())

                    val messages = filterResult match
                        case Right(true) => Seq(messageToSend)
                        case _           => Seq()

                    consumers.get(consumerName) match
                        case Some(_) =>
                            val status: Status = filterResult match
                                case Right(_)  => Status(code = Code.OK.index)
                                case Left(err) => Status(code = Code.INVALID_ARGUMENT.index, message = err)
                            val resumeResponse = ResumeResponse(
                                status = Some(status),
                                messages = messages,
                                processedMessages = processedMessagesCount.getOrElse(consumerName, 0: Long)
                            )
                            responseObserver.onNext(resumeResponse)
                        case _ => ()

                listener.startAcceptingNewMessages()
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
        listener.stopAcceptingNewMessages()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val consumerName: ConsumerName = request.consumerName.getOrElse("__pulsocat" + UUID.randomUUID().toString)
        logger.info(s"Creating consumer. Consumer: $consumerName")
        val adminClient = RequestContext.pulsarAdmin.get()
        val pulsarClient = RequestContext.pulsarClient.get()

        val streamDataHandler = StreamDataHandler()
        streamDataHandler.onNext = _ => ()
        streamDataHandlers = streamDataHandlers + (consumerName -> streamDataHandler)
        processedMessagesCount = processedMessagesCount + (consumerName -> 0)

        messageFilters = messageFilters + (consumerName -> MessageFilter(
            MessageFilterConfig(stdout = new ByteArrayOutputStream())
        ))

        listener = TopicMessageListener(streamDataHandler)

        val topicsToConsume = request.topicsSelector match
            case Some(ts) =>
                ts.topicsSelector.byNames match
                    case Some(bn) => bn.topics.toVector
            case _ =>
                val status: Status =
                    Status(code = Code.INVALID_ARGUMENT.index, message = "Topic selectors other than byNames are not implemented.")
                return Future.successful(CreateConsumerResponse(status = Some(status)))

        getSchemasByTopic(adminClient, topicsToConsume)
            .foreach((topicName, schemasByVersion) => schemasByTopic = schemasByTopic + (topicName -> schemasByVersion))

        topics = topics + (consumerName -> topicsToConsume)

        val consumerBuilder = buildConsumer(pulsarClient, consumerName, request, logger, listener) match
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

        def tryUnsubscribe(): Unit =
            consumers.get(consumerName) match
                case Some(consumer) =>
                    try
                        consumer.unsubscribe()
                    catch
                        // Unsubscribe fails on partitioned topics in most cases.
                        // Anyway we can't handle it meaningfully.
                        case _ => ()
                    finally ()
                case _ => ()

        tryUnsubscribe()

        consumers = consumers.removed(consumerName)
        streamDataHandlers = streamDataHandlers.removed(consumerName)
        processedMessagesCount = processedMessagesCount.removed(consumerName)
        responseObservers = responseObservers.removed(consumerName)
        messageFilters = messageFilters.removed(consumerName)

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

    override def runCode(request: RunCodeRequest): Future[RunCodeResponse] =
        val messageFilter = messageFilters.get(request.consumerName) match
            case Some(f) => f
            case _ =>
                val status: Status = Status(
                    code = Code.FAILED_PRECONDITION.index,
                    message = s"Message filter context isn't found for consumer: ${request.consumerName}"
                )
                return Future.successful(RunCodeResponse(status = Some(status)))

        val result = messageFilter.runCode(request.code)

        val status: Status = Status(code = Code.OK.index)
        val response = RunCodeResponse(status = Some(status), result = Some(result))
        Future.successful(response)
