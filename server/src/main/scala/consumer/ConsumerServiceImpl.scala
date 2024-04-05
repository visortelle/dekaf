package consumer

import _root_.licensing.{Licensing, ProductCode}
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.pulsar_auth.RequestContext
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.{ConsumerServiceGrpc, CreateConsumerRequest, CreateConsumerResponse, DeleteConsumerRequest, DeleteConsumerResponse, PauseRequest, PauseResponse, ResolveTopicSelectorRequest, ResolveTopicSelectorResponse, ResumeRequest, ResumeResponse, RunCodeRequest, RunCodeResponse}
import com.typesafe.scalalogging.Logger
import _root_.consumer.session_target.topic_selector.TopicSelector
import consumer.session_runner.ConsumerSessionRunner

import java.util.concurrent.{ConcurrentHashMap, ScheduledThreadPoolExecutor, TimeUnit}
import scala.concurrent.Future
import scala.jdk.OptionConverters.*
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

type ConsumerSessionName = String

class ConsumerServiceImpl extends ConsumerServiceGrpc.ConsumerService:
    private val logger: Logger = Logger(getClass.getName)
    private val consumerSessions: ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner] = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()

    private val gcExecutor = new ScheduledThreadPoolExecutor(1)

    def initGc(): Unit =
        val task = new Runnable {
            def run(): Unit =
                val sessions = consumerSessions.entrySet().asScala
                val idleSessions = sessions.filter(v => v.getValue.isIdle)

                logger.info(s"Collecting idle ConsumerSessions. Total sessions: ${sessions.size}. Idle sessions: ${idleSessions.size}")
                sessions.foreach(v => logger.info(s"ConsumerSession: ${v.getKey}. Idle: ${v.getValue.isIdle}"))

                idleSessions.foreach(v => {
                    val sessionName = v.getKey
                    val session = v.getValue

                    if session.isIdle then
                        logger.info(s"Deleting idle ConsumerSession $sessionName")
                        session.close()
                        consumerSessions.remove(sessionName)
                })
        }
        gcExecutor.scheduleAtFixedRate(task, 0, 3, TimeUnit.MINUTES)

    initGc()


    override def resume(request: ResumeRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeResponse]): Unit =
        val sessionName = request.consumerName
        logger.info(s"Resuming consumer session: $sessionName")

        val consumerSession = Option(consumerSessions.get(sessionName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer consumer session: $sessionName"
                logger.warn(msg)

                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                val res = ResumeResponse(status = Some(status))
                responseObserver.onNext(res)
                responseObserver.onCompleted()
                return

        try {
            consumerSession.resume(grpcResponseObserver = responseObserver, isDebug = request.isDebug)
        } catch {
            case err: Throwable =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                val res = ResumeResponse(status = Some(status))
                responseObserver.onNext(res)
                responseObserver.onCompleted()
                return
        }

        val status: Status = Status(code = Code.OK.index)
        Future.successful(ResumeResponse(status = Some(status)))

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val sessionName = request.consumerName
        logger.info(s"Pausing consumer session $sessionName")

        val consumerSession = Option(consumerSessions.get(sessionName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val msg = s"No such consumer consumer session: $sessionName"
                logger.warn(msg)

                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = msg)
                return Future.successful(PauseResponse(status = Some(status)))

        try {
            consumerSession.pause()
        } catch {
            case err: Throwable =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(PauseResponse(status = Some(status)))
        }

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

        try {
            consumerSession.close()
            consumerSessions.remove(sessionName)
        } catch {
            case err: Throwable =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.index, message = err.getMessage)
                return Future.successful(DeleteConsumerResponse(status = Some(status)))
        }

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
