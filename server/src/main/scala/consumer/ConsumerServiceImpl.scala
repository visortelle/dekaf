package consumer

import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.pulsar_auth.RequestContext
import com.google.protobuf.ByteString
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
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
    ResolveTopicSelectorRequest,
    ResolveTopicSelectorResponse,
    ResumeRequest,
    ResumeResponse,
    RunCodeRequest,
    RunCodeResponse
}
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminException}
import _root_.consumer.session_target.topic_selector.TopicSelector
import consumer.session_runner.ConsumerSessionRunner
import org.apache.pulsar.client.api.Message

import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.Future
import scala.jdk.OptionConverters.*
import scala.util.{Failure, Success, Try}

type ConsumerSessionName = String

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    private val logger: Logger = Logger(getClass.getName)
    private val consumerSessions: ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner] = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()

    override def resume(request: ResumeRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeResponse]): Unit =
        val sessionName = request.consumerName
        logger.info(s"Resume consumer session: $sessionName")

        val consumerSession = Option(consumerSessions.get(sessionName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer consumer session: $sessionName"
                logger.warn(msg)

                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                val res = ResumeResponse(status = Some(status))
                responseObserver.onNext(res)
                responseObserver.onCompleted()
                return ()

        consumerSession.resume(
            grpcResponseObserver = responseObserver,
        )

        val status: Status = Status(code = Code.OK.index)
        Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val sessionName = request.consumerName
        logger.info(s"Pausing consumer session $sessionName")

        val status: Status = Status(code = Code.OK.index)
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        Try {
            val sessionName = request.consumerName
            logger.info(s"Creating consumer session. $sessionName")

            val pulsarClient = RequestContext.pulsarClient.get()
            val adminClient = RequestContext.pulsarAdmin.get()

            val consumerSession = ConsumerSessionRunner.make(
                sessionName = sessionName,
                pulsarClient = pulsarClient,
                adminClient = adminClient,
                sessionConfig = ConsumerSessionConfig.fromPb(request.consumerSessionConfig.get)
            )

            consumerSessions.put(sessionName, consumerSession)
        } match
            case Success(_) =>
                val status: Status = Status(code = Code.OK.index)
                Future.successful(CreateConsumerResponse(status = Some(status)))
            case Failure(err) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val sessionName = request.consumerName
        logger.info(s"Deleting consumer session: $sessionName")

        val consumerSession = Option(consumerSessions.get(sessionName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer session: $sessionName"
                logger.warn(msg)
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(DeleteConsumerResponse(status = Some(status)))

        consumerSession.stop()
        consumerSessions.remove(sessionName)

        val status: Status = Status(code = Code.OK.index)
        Future.successful(DeleteConsumerResponse(status = Some(status)))

    override def runCode(request: RunCodeRequest): Future[RunCodeResponse] =
        val consumerSession = Option(consumerSessions.get(request.consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = s"Consumer isn't found: ${request.consumerName}")
                return Future.successful(RunCodeResponse(status = Some(status)))

        val result = consumerSession.sessionContext.runCode(request.code)

        val status: Status = Status(code = Code.OK.index)
        val response = RunCodeResponse(status = Some(status), result = Some(result))
        Future.successful(response)

    override def resolveTopicSelector(request: ResolveTopicSelectorRequest): Future[ResolveTopicSelectorResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()
        val topicSelector = TopicSelector.fromPb(request.topicSelector.get)

        Try(topicSelector.getNonPartitionedTopics(adminClient)) match
            case Success(topicFqns) =>
                val status: Status = Status(code = Code.OK.index)
                val response = ResolveTopicSelectorResponse(status = Some(status), topicFqns = topicFqns)
                Future.successful(response)
            case Failure(err) =>
                val status: Status = Status(code = Code.INVALID_ARGUMENT.index, message = err.getMessage)
                Future.successful(ResolveTopicSelectorResponse(status = Some(status)))
