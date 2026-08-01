package consumer

import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.pulsar_auth.RequestContext
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
    GetTopicPositionsRequest,
    GetTopicPositionsResponse,
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
import _root_.consumer.session_target.topic_selector.TopicSelector
import consumer.session_runner.{
    ConsumerSessionRunner,
    LedgerSpan,
    LogEndpoint,
    TopicCursor,
    TopicPositionInputs,
    TopicPositionRow,
    brokerAnswer,
    buildTopicPositionRow,
    entryIdOf,
    furthestCursors,
    storeConsumerSession,
    topicPositionToPb
}
import org.apache.pulsar.client.admin.PulsarAdmin

import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import scala.util.{Failure, Success, Try}

type ConsumerSessionName = String

object ConsumerServiceImpl:
    /** The production session builder. The Pulsar clients come from the gRPC request context, which
      * is why this is a function rather than a direct call: a test can drive the lifecycle through
      * the real RPC surface without a broker or a request context. */
    def makeFromRequestContext(sessionName: ConsumerSessionName, sessionConfig: ConsumerSessionConfig): ConsumerSessionRunner =
        ConsumerSessionRunner.make(
            sessionName = sessionName,
            pulsarClient = RequestContext.pulsarClient.get(),
            adminClient = RequestContext.pulsarAdmin.get(),
            sessionConfig = sessionConfig
        )


/** @param consumerSessions
  *   the live sessions this service owns. A constructor parameter (with the production default)
  *   only so a test can put a real session behind an RPC without a broker - the resume/delete paths
  *   touch nothing but the runner and the observer.
  * @param makeSession
  *   how a session is built. Injectable for the same reason: the lifecycle ORDERING - that a
  *   predecessor is stopped before its replacement subscribes, and that two creates under one name
  *   never overlap - is a property of this class and has to be testable without a broker.
  */
class ConsumerServiceImpl(
    private val consumerSessions: ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner] =
        new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner](),
    private val makeSession: (ConsumerSessionName, ConsumerSessionConfig) => ConsumerSessionRunner =
        ConsumerServiceImpl.makeFromRequestContext
) extends ConsumerServiceGrpc.ConsumerService:
    private val logger: Logger = Logger(getClass.getName)

    /** Lifecycle operations on ONE session name run one at a time.
      *
      * Every target subscribes as `${sessionName}-${targetIndex}`, non-durable and EXCLUSIVE, so two
      * runners under one name cannot coexist on the broker at all - the second to subscribe is
      * refused. Create and delete therefore have to be single operations rather than a read, some
      * broker work, and a write - and resume joins them, because it must not wire a fresh observer
      * into a runner a racing delete is stopping.
      *
      * ONE LOCK PER NAME, not a striped array. The lock is held across the predecessor's stop and
      * the replacement's ENTIRE build - subscribing every consumer, seeking it, and for a Latest-N
      * start-from a backward walk costing one admin lookup per entry - which is unbounded broker
      * work, not one round trip. Striping made two UNRELATED names serialize whenever their hashes
      * collided (1 stripe in 64), so one slow create could stall another session's create, delete
      * and resume for as long as that broker work took. A map entry is a bare Object of a few dozen
      * bytes against names the client chooses; the entries are REF-COUNTED away by
      * [[withLifecycleLock]] below, so the map holds only the names something is actively locking
      * right now - not every name any client has ever sent.
      */
    private val lifecycleLocks = new ConcurrentHashMap[ConsumerSessionName, (Object, java.util.concurrent.atomic.AtomicInteger)]()

    /** How many distinct names currently hold or wait for a lifecycle lock - a test's window into
      * the map's lifetime, and nothing else's. */
    private[consumer] def lifecycleLockCount: Int = lifecycleLocks.size

    /** Run `body` holding this name's lifecycle lock. REF-COUNTED: the entry exists only while
      * someone holds or waits for it, and the last one out removes it. The names arrive on RPC
      * input, so the previous keep-forever map let any client grow the heap without bound by
      * naming sessions that never existed; plain eviction was no answer either, because evicting
      * an entry a thread was WAITING on hands the next caller a different lock for the same name
      * and the exclusion silently vanishes. The count is what makes removal safe: it only happens
      * when nobody is inside and nobody is queued.
      */
    private def withLifecycleLock[T](sessionName: ConsumerSessionName)(body: => T): T =
        val entry = lifecycleLocks.compute(
            sessionName,
            (_, existing) =>
                if existing == null then (Object(), java.util.concurrent.atomic.AtomicInteger(1))
                else
                    existing._2.incrementAndGet()
                    existing
        )
        try entry._1.synchronized(body)
        finally
            lifecycleLocks.compute(
                sessionName,
                (_, current) =>
                    if current == null then null
                    else if current._2.decrementAndGet() == 0 then null
                    else current
            )

    override def resume(request: ResumeRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeResponse]): Unit =
        val sessionName = request.consumerName
        logger.info(s"Resuming consumer session: $sessionName")

        // For the cases where the observer was never wired into anything: nothing else can be
        // writing to it, so answering it directly is safe here and only here.
        def answerAndClose(message: String, code: Code = Code.FAILED_PRECONDITION): Unit =
            logger.warn(message)
            responseObserver.onNext(ResumeResponse(status = Some(Status(code = code.value, message = message))))
            responseObserver.onCompleted()

        // The same trust boundary the start-from counts cross: a nonsense number is refused loudly
        // here, never clamped into a guess about what the client meant. 0 is the documented
        // "unlimited" / "no budget", so only genuinely negative values are nonsense.
        if request.maxMessagesPerSecond < 0 then
            answerAndClose(
                s"max_messages_per_second must not be negative, got ${request.maxMessagesPerSecond}. 0 means unlimited.",
                Code.INVALID_ARGUMENT
            )
            return
        if request.maxMessagesToDeliver < 0 then
            answerAndClose(
                s"max_messages_to_deliver must not be negative, got ${request.maxMessagesToDeliver}. 0 means no delivery budget.",
                Code.INVALID_ARGUMENT
            )
            return

        // Serialized with create and delete under the same name. Resume used to take no lock at
        // all, so it could read the runner while a delete was stopping it and wire the fresh
        // observer into a stream the stop was about to complete - the play stream then hung
        // silently, every later send swallowed by the terminal gate, with nothing telling the
        // client why.
        withLifecycleLock(sessionName) {
            Option(consumerSessions.get(sessionName)) match
                case None =>
                    answerAndClose(s"No such consumer consumer session: $sessionName")
                case Some(consumerSession) if consumerSession.isStreamCompleted =>
                    // Stopped - deleted, replaced, or failed - but still reachable. The terminal
                    // gate is sticky, so wiring the observer in would swallow every response;
                    // the client's remedy is to create the session again.
                    answerAndClose(s"Consumer session $sessionName is closed and cannot be resumed. Create the session again.")
                case Some(consumerSession) =>
                    try
                        // BOTH request flags, not just the debug one: `include_consumer_stats` is
                        // the client saying whether it can handle consumer stats at all - including
                        // the message-less progress frames a skip in flight pushes - and it used to
                        // be read and then ignored.
                        consumerSession.resume(
                            grpcResponseObserver = responseObserver,
                            isDebug = request.isDebug,
                            includeConsumerStats = request.includeConsumerStats,
                            maxMessagesPerSecond = request.maxMessagesPerSecond,
                            maxMessagesToDeliver = request.maxMessagesToDeliver
                        )
                    catch
                        case err: Throwable =>
                            // THROUGH THE RUNNER, never straight to the observer: a late target's
                            // throw leaves the earlier targets' listeners live and pushing into
                            // this same observer, so the status frame and the completion must go
                            // through the runner's send lock and set its terminal flag. Written
                            // directly they interleaved with a push, and every push after the
                            // onCompleted landed in a completed stream.
                            consumerSession.failAndComplete(Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage))
                            // And then STOP THE INTAKE: the targets resumed before the throw have
                            // open gates and running consumers, and with the stream terminal their
                            // output is suppressed - they were consuming and ACKNOWLEDGING messages
                            // nobody would ever see, until the session was recreated. Pausing
                            // closes the gates (buffered messages are handed back, not swallowed)
                            // and stops the consumers; best-effort, because the failed target may
                            // be in any state.
                            Try(consumerSession.pause())
                            ()
        }

    override def pause(request: PauseRequest): Future[PauseResponse] =
        val sessionName = request.consumerName
        logger.info(s"Pausing consumer session $sessionName")

        // Serialized with create, delete and resume under the same name. Pause used to take no
        // lock, so on a multi-target session it could interleave TARGET BY TARGET with a resume -
        // both answering OK while half the targets finished paused and half running, with the
        // limiter believing whichever call it heard last. The browser makes that race ordinary: a
        // quick hidden-then-visible tab abandons its pending pause and immediately resumes.
        val status: Status = withLifecycleLock(sessionName) {
            Option(consumerSessions.get(sessionName)) match
                case None =>
                    val msg = s"No such consumer consumer session: $sessionName"
                    logger.warn(msg)
                    Status(code = Code.FAILED_PRECONDITION.value, message = msg)
                case Some(consumerSession) =>
                    Try(consumerSession.pause()) match
                        case Success(_)   => Status(code = Code.OK.value)
                        case Failure(err) => Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
        }
        Future.successful(PauseResponse(status = Some(status)))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        Try {
            val sessionName = request.consumerName
            logger.info(s"Creating consumer session. $sessionName")

            val sessionConfig = ConsumerSessionConfig.fromPb(request.consumerSessionConfig.get)

            withLifecycleLock(sessionName) {
                // STOP THE PREDECESSOR FIRST. The replacement subscribes under the very same
                // exclusive, non-durable subscription, so on the same topic a still-live
                // predecessor refuses it - and the failure arrived long before the atomic map swap
                // that was supposed to release it. The browser re-creates a session whenever its
                // configuration changes, so this was the ordinary path, not a corner.
                //
                // Removing before building also means a build that FAILS leaves the name empty
                // rather than leaving the old session running behind a client that has moved on:
                // the user asked for this name to hold something else, and is told it does not.
                Option(consumerSessions.remove(sessionName)).foreach(previous =>
                    Try(previous.stop()).failed.foreach(err =>
                        logger.warn(s"The consumer session being replaced under $sessionName could not be fully released. ${err.getMessage}")
                    )
                )

                // Still not a bare `put`: nothing but this lock stands between two creates, and a
                // predecessor that somehow survives one must be stopped rather than abandoned.
                storeConsumerSession(consumerSessions, sessionName, makeSession(sessionName, sessionConfig))
            }
        } match
            case Success(_) =>
                val status: Status = Status(code = Code.OK.value)
                Future.successful(CreateConsumerResponse(status = Some(status)))
            case Failure(err) =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
                Future.successful(CreateConsumerResponse(status = Some(status)))

    override def deleteConsumer(request: DeleteConsumerRequest): Future[DeleteConsumerResponse] =
        val sessionName = request.consumerName
        logger.info(s"Deleting consumer session: $sessionName")

        // Serialized against creates under the same name: reading the runner, stopping it (a broker
        // round trip) and removing the entry have to be one operation.
        val stopped = withLifecycleLock(sessionName) {
            Option(consumerSessions.get(sessionName)) match
                case None =>
                    val msg = s"No such consumer session: $sessionName"
                    logger.warn(msg)
                    Left(msg)
                case Some(consumerSession) =>
                    val outcome = Try(consumerSession.stop())

                    // The handle goes WHATEVER stopping did. `stop` releases everything it can
                    // before it reports, so keeping the entry after a partial failure would leave a
                    // session that nothing can reach and nothing can retry - and the previous order
                    // (remove only on success) meant a broker that refused one unsubscribe made the
                    // session name permanently undeletable.
                    //
                    // COMPARE-AND-REMOVE, not a bare remove: only the session this call actually
                    // stopped may be unhooked. An unconditional remove would silently drop a
                    // replacement installed meanwhile, leaving it running and unreachable.
                    consumerSessions.remove(sessionName, consumerSession)
                    Right(outcome)
        }

        val outcome = stopped match
            case Left(msg) =>
                return Future.successful(DeleteConsumerResponse(status = Some(Status(code = Code.FAILED_PRECONDITION.value, message = msg))))
            case Right(outcome) => outcome

        outcome match
            case Success(_) =>
                Future.successful(DeleteConsumerResponse(status = Some(Status(code = Code.OK.value))))
            case Failure(err) =>
                logger.warn(s"Consumer session $sessionName was removed but could not be fully released. ${err.getMessage}")
                Future.successful(DeleteConsumerResponse(status = Some(Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage))))

    override def runCode(request: RunCodeRequest): Future[RunCodeResponse] =
        val consumerSession = Option(consumerSessions.get(request.consumerName)) match
            case Some(consumerSession) => consumerSession
            case _ =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = s"Consumer isn't found: ${request.consumerName}")
                return Future.successful(RunCodeResponse(status = Some(status)))

        // Leased, not grabbed: this runs on a gRPC thread while the session's listener threads are
        // using the SAME context, so a raw handle here answered the user's expression with
        // "[ERROR] Multi threaded access requested by thread ..." whenever the two overlapped.
        val result = consumerSession.sessionContextPool.withContext(0)(_.runCode(request.code))

        val status: Status = Status(code = Code.OK.value)
        val response = RunCodeResponse(status = Some(status), result = Some(result))
        Future.successful(response)

    override def resolveTopicSelector(request: ResolveTopicSelectorRequest): Future[ResolveTopicSelectorResponse] =
        val adminClient = RequestContext.pulsarAdmin.get()

        Try {
            val topicSelector = TopicSelector.fromPb(request.topicSelector.get)
            topicSelector.getNonPartitionedTopics(adminClient)
        } match
            case Success(topicFqns) =>
                val status: Status = Status(code = Code.OK.value)
                val response = ResolveTopicSelectorResponse(status = Some(status), topicFqns = topicFqns)
                Future.successful(response)
            case Failure(err) =>
                val status: Status = Status(code = Code.INVALID_ARGUMENT.value, message = err.getMessage)
                Future.successful(ResolveTopicSelectorResponse(status = Some(status)))

    /** Read one physical topic's endpoints and entry count, and pair them with how far the session
      * has read.
      *
      * THREE ADMIN ROUND TRIPS, each O(1) in the size of the topic: the first entry, the last entry,
      * and the internal stats. That per-topic cost is the whole reason this is polled on demand
      * behind a client-side switch instead of riding along with the message stream - a session over
      * a hundred partitions pays it a hundred times per refresh.
      *
      * EVERY LOOKUP IS ALLOWED TO DECLINE, and the two ways it can decline mean different things:
      *
      *   - `brokerAnswer` returns `None` for "the broker says this log is empty" - `examineMessage`
      *     THROWS for "latest" on an empty topic where "earliest" answers 412 - and that is not an
      *     error. The row simply has no endpoints.
      *   - A topic Pulsar refuses to examine at all answers with a REASON. A non-persistent topic is
      *     the ordinary case (405): it retains nothing to examine. Distinguishing the two is why
      *     `unavailable_reason` exists rather than leaving the client to guess from blank cells.
      */
    private def gatherTopicPosition(
        adminClient: PulsarAdmin,
        topicFqn: String,
        cursor: Option[TopicCursor]
    ): TopicPositionRow =
        Try {
            val first = brokerAnswer("examining the first entry", topicFqn)(
                adminClient.topics.examineMessage(topicFqn, "earliest", 1)
            ).map(message => LogEndpoint(entryIdOf(message.getMessageId), message.getPublishTime))

            val last = brokerAnswer("examining the last entry", topicFqn)(
                adminClient.topics.examineMessage(topicFqn, "latest", 1)
            ).map(message => LogEndpoint(entryIdOf(message.getMessageId), message.getPublishTime))

            val stats = adminClient.topics.getInternalStats(topicFqn)
            val ledgers = stats.ledgers.asScala.toVector.map(info => LedgerSpan(info.ledgerId, info.entries))

            TopicPositionInputs(
                topicFqn = topicFqn,
                first = first,
                last = last,
                cursor = cursor,
                ledgers = ledgers,
                currentLedgerEntries = stats.currentLedgerEntries,
                retainedEntries = stats.numberOfEntries,
                unavailableReason = None
            )
        } match
            case Success(inputs) => buildTopicPositionRow(inputs)
            case Failure(err) =>
                // Report the topic with a reason rather than failing the whole call: one
                // non-persistent topic in a multi-topic session must not blank the other rows.
                logger.debug(s"Topic positions unavailable for $topicFqn. ${err.getMessage}")
                buildTopicPositionRow(
                    TopicPositionInputs(
                        topicFqn = topicFqn,
                        first = None,
                        last = None,
                        cursor = cursor,
                        ledgers = Vector.empty,
                        currentLedgerEntries = 0,
                        retainedEntries = 0,
                        unavailableReason = Some(Option(err.getMessage).getOrElse(err.getClass.getSimpleName))
                    )
                )

    override def getTopicPositions(request: GetTopicPositionsRequest): Future[GetTopicPositionsResponse] =
        val sessionName = request.consumerName

        // The session lookup comes FIRST, and the admin client is fetched only once there is
        // something to ask about. A client polling this tab before the session has been started is
        // the ordinary case, not an error path, and resolving the request context up here made even
        // that answer impossible to produce - or to test - without a broker behind it.
        Option(consumerSessions.get(sessionName)) match
            case None =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = s"No such consumer session: $sessionName")
                Future.successful(GetTopicPositionsResponse(status = Some(status)))
            case Some(consumerSession) =>
                val adminClient = RequestContext.pulsarAdmin.get()

                // One row per PHYSICAL topic, which is what the session actually subscribes to and
                // the only thing `examineMessage` will answer for - it refuses a partitioned parent
                // outright (405).
                val cursors = furthestCursors(consumerSession.targets.values.map(_.consumerListener.cursors))
                val topicFqns = consumerSession.targets.values.flatMap(_.consumers.keys).toVector.distinct.sorted

                Try(topicFqns.map(topicFqn => gatherTopicPosition(adminClient, topicFqn, cursors.get(topicFqn)))) match
                    case Success(rows) =>
                        val status: Status = Status(code = Code.OK.value)
                        Future.successful(GetTopicPositionsResponse(status = Some(status), positions = rows.map(topicPositionToPb)))
                    case Failure(err) =>
                        logger.warn(s"Could not read topic positions for $sessionName. ${err.getMessage}")
                        val status: Status = Status(code = Code.UNKNOWN.value, message = err.getMessage)
                        Future.successful(GetTopicPositionsResponse(status = Some(status)))
