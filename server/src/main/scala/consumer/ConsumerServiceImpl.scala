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
    MessageFilter as MessageFilterPb,
    MessageFilterChain,
    PauseRequest,
    PauseResponse,
    ResumeRequest,
    ResumeResponse,
    RunCodeRequest,
    RunCodeResponse,
    SeekRequest,
    SeekResponse,
    SkipMessagesRequest,
    SkipMessagesResponse,
    TopicsSelector
}
import com.typesafe.scalalogging.Logger

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Try, Success, Failure}

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.rpc.status.Status
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.SeekRequest.Seek
import org.apache.pulsar.client.api.{Message, MessageId}
import _root_.pulsar_auth.RequestContext
import java.util.concurrent.ConcurrentHashMap

import java.io.ByteArrayOutputStream
import java.util.UUID
import java.time.Instant

type ConsumerName = String

case class ConsumerSession(
    config: ConsumerSessionConfig,
    messageFilterContext: MessageFilterContext,
    consumer: Consumer[Array[Byte]],
    grpcResponseObserver: Option[io.grpc.stub.StreamObserver[ResumeResponse]],
    listener: TopicMessageListener,
    schemasByTopic: SchemasByTopic,
    var processedMessagesCount: Long
)

case class StreamDataHandler(var onNext: (msg: Message[Array[Byte]]) => Unit)

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    private val logger: Logger = Logger(getClass.getName)
    private val consumerSessions: ConcurrentHashMap[ConsumerName, ConsumerSession] = new ConcurrentHashMap[ConsumerName, ConsumerSession]()

    override def resume(request: ResumeRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeResponse]): Unit =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Resume consuming. Consumer: $consumerName")

        val consumerSession = Option(consumerSessions.get(consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)

                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                val res = ResumeResponse(status = Some(status))
                responseObserver.onNext(res)
                responseObserver.onCompleted()
                return ()

        val updatedConsumerSession = consumerSession.copy(grpcResponseObserver = Some(responseObserver))
        consumerSessions.replace(consumerName, updatedConsumerSession)

        val consumer = consumerSession.consumer
        val listener = consumerSession.listener
        val streamDataHandler = listener.streamDataHandler
        val messageFilterContext = consumerSession.messageFilterContext

        streamDataHandler.onNext = (msg: Message[Array[Byte]]) =>
            logger.debug(s"Message received. Consumer: $consumerName, Message id: ${msg.getMessageId}")

            consumerSession.processedMessagesCount += 1

            val (messagePb, jsonMessage, messageValueToJsonResult) = converters.serializeMessage(consumerSession.schemasByTopic, msg)

            val consumerSessionConfig = consumerSession.config
            val messageFilterChain = consumerSessionConfig.messageFilterChain

            val (filterResult, jsonAccumulator) =
                getFilterChainTestResult(messageFilterChain, messageFilterContext, jsonMessage, messageValueToJsonResult)

            val messageToSend = messagePb
                .withAccumulator(jsonAccumulator)
                .withDebugStdout(messageFilterContext.getStdout())

            val messages = filterResult match
                case Right(true) => Seq(messageToSend)
                case _           => Seq()

            val status: Status = filterResult match
                case Right(_)  => Status(code = Code.OK.index)
                case Left(err) => Status(code = Code.INVALID_ARGUMENT.index, message = err)

            val resumeResponse = ResumeResponse(
                status = Some(status),
                messages = messages,
                processedMessages = consumerSession.processedMessagesCount
            )
            responseObserver.onNext(resumeResponse)

        listener.startAcceptingNewMessages()
        consumer.resume()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Pausing consumer. Consumer: $consumerName")

        val consumerSession = Option(consumerSessions.get(consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        consumerSession.consumer.pause()
        consumerSession.listener.stopAcceptingNewMessages()

        val status: Status = Status(code = Code.OK.index)
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        Try {
            val consumerName: ConsumerName = request.consumerName.getOrElse("__dekaf" + UUID.randomUUID().toString)
            logger.info(s"Creating consumer. Consumer: $consumerName")
            val pulsarClient = RequestContext.pulsarClient.get()
            val adminClient = RequestContext.pulsarAdmin.get()

            val topicsToConsume = request.consumerSessionConfig.get.topicsSelector match
                case Some(ts) =>
                    ts.topicsSelector.topicsSelectorByFqns match
                        case Some(bn) => bn.topicFqns.toVector
                case _ =>
                    val status: Status =
                        Status(code = Code.INVALID_ARGUMENT.index, message = "Topic selectors other than byNames are not implemented.")
                    return Future.successful(CreateConsumerResponse(status = Some(status)))

            val config = consumerSessionConfigFromPb(request.consumerSessionConfig.get)
            val listener = TopicMessageListener(StreamDataHandler(onNext = _ => ()))

            val consumerBuilder = buildConsumer(pulsarClient, consumerName, request, logger, listener) match
                case Right(consumer) => consumer
                case Left(error) =>
                    logger.warn(error)
                    val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = error)
                    return Future.successful(CreateConsumerResponse(status = Some(status)))

            val consumer = consumerBuilder.subscribe

            Try(handleStartFrom(
                startFrom = config.startFrom,
                consumer = consumer,
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                topicsToConsume = topicsToConsume
            )) match
                case Success(_) => // ok
                case Failure(err) =>
                    val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = err.getMessage)
                    return Future.successful(CreateConsumerResponse(status = Some(status)))

            val schemasByTopic = getSchemasByTopic(adminClient, topicsToConsume)

            val consumerSession = ConsumerSession(
                config = config,
                messageFilterContext = MessageFilterContext(MessageFilterContextConfig(stdout = new ByteArrayOutputStream())),
                consumer = consumer,
                grpcResponseObserver = None,
                listener = listener,
                schemasByTopic = schemasByTopic,
                processedMessagesCount = 0
            )

            consumerSessions.put(consumerName, consumerSession)
        } match
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(CreateConsumerResponse(status = Some(status)))
            case Failure(err) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val consumerName = request.consumerName
        logger.info(s"Deleting consumer. Consumer: $consumerName")

        val consumerSession = Option(consumerSessions.get(consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(DeleteConsumerResponse(status = Some(status)))

        def tryUnsubscribe: Unit =
            try consumerSession.consumer.unsubscribe()
            catch
                // Unsubscribe fails on partitioned topics in most cases.
                // Anyway we can't handle it meaningfully.
                case _ => ()

        tryUnsubscribe

        consumerSessions.remove(consumerName)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteConsumerResponse(status = Some(status)))

    override def seek(request: SeekRequest): Future[SeekResponse] =
        val consumerName: ConsumerName = request.consumerName
        logger.info(s"Seek over subscription. Consumer: $consumerName")

        val consumerSession = Option(consumerSessions.get(consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer: $consumerName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(SeekResponse(status = Some(status)))

        val consumer = consumerSession.consumer

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
        val consumerSession = Option(consumerSessions.get(request.consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = s"Consumer isn't found: ${request.consumerName}")
                return Future.successful(RunCodeResponse(status = Some(status)))

        val result = consumerSession.messageFilterContext.runCode(request.code)

        val status: Status = Status(code = Code.OK.index)
        val response = RunCodeResponse(status = Some(status), result = Some(result))
        Future.successful(response)
