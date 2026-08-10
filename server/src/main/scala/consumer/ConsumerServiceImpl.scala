package consumer

import _root_.consumer.session_config.{ConsumerSessionConfig, MessageDeliveryOrder}
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
    RunCodeResponse,
    SetDeliveryOrderRequest,
    SetDeliveryOrderResponse
}
import com.typesafe.scalalogging.Logger
import _root_.consumer.session_target.topic_selector.TopicSelector
import consumer.session_runner.{
    ConsumerSessionRunner,
    LedgerSpan,
    LogEndpoint,
    TopicConsumedBounds,
    TopicPositionInputs,
    TopicPositionRow,
    brokerAnswer,
    buildTopicPositionRow,
    entryIdOf,
    mergeConsumedBounds,
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

    /** How long a session may sit without a live play stream before it is reaped. Generous on
      * purpose: a paused tab is a session with no stream, and a user coming back from a meeting
      * should find their session where they left it. What this bounds is the FOREVER case - a
      * closed tab whose `beforeunload` Delete never delivered used to leave consumers connected
      * and reconnect-looping for the life of the process. */
    private val idleSessionTtlNanos: Long = java.util.concurrent.TimeUnit.HOURS.toNanos(1)

    /** How often the janitor looks - precision is irrelevant at a 1-hour TTL. */
    private val janitorPeriodSeconds: Long = 60

    /** How long a session may sit with no live play stream AND every one of its consumers
      * disconnected before it is reaped - the short leash beside [[idleSessionTtlNanos]].
      *
      * Disconnected + unwatched is dead weight. If the disconnect is a transient broker blip and
      * a user is actually watching, their live play stream fails the first condition and protects
      * the session; if the tab is gone AND the broker connection is gone, nothing of value is
      * lost by reaping in minutes rather than an hour. The case this exists for can never recover
      * at all: a consumer whose topic or namespace was force-deleted reconnect-loops on a
      * subscription with nothing left to reconnect to, at full retry volume, for however long the
      * session survives - an hour of that spam serves nobody.
      *
      * Two janitor periods, so one sweep's sighting never reaps on its own: the state must be
      * seen to HOLD across sweeps before it is believed.
      */
    private val disconnectedSessionGraceNanos: Long =
        java.util.concurrent.TimeUnit.SECONDS.toNanos(janitorPeriodSeconds * 2)

    /** The most sessions this server runs at once. Each session holds consumers, receiver queues
      * and JS contexts; without a bound, abandoned tabs alone could grow that without limit (the
      * idle janitor trims them, but only after the TTL).
      *
      * AN ADMISSION BOUND, not a post-hoc count. It used to be read off the map under a lock
      * scoped to ONE session name, and the expensive build then ran before the insertion - so
      * concurrent creates of DIFFERENT names all observed the same pre-build size and all passed.
      * At an empty map an arbitrary number of builds could pass a 100-session check, each free to
      * subscribe up to 2,000 streams. See [[ConsumerServiceImpl.reserveAdmission]]. */
    val maxActiveSessions: Int = 100


/** @param consumerSessions
  *   the live sessions this service owns. A constructor parameter (with the production default)
  *   only so a test can put a real session behind an RPC without a broker - the resume/delete paths
  *   touch nothing but the runner and the observer.
  * @param makeSession
  *   how a session is built. Injectable for the same reason: the lifecycle ORDERING - that a
  *   predecessor is stopped before its replacement subscribes, and that two creates under one name
  *   never overlap - is a property of this class and has to be testable without a broker.
  * @param idleSessionTtlNanos
  *   how long a session may sit with NO live play stream before the janitor stops and removes it.
  *   A parameter only so a test can expire a session without waiting an hour.
  * @param disconnectedSessionGraceNanos
  *   how long a session with no live play stream AND every consumer disconnected may persist
  *   before the janitor reaps it early - see the companion default for why that state gets the
  *   short leash. A parameter only so a test can cross the window without waiting minutes.
  *
  * DEFERRED, KNOWINGLY: sessions are addressed by name alone. Any caller that knows (or guesses) a
  * session's name can resume it, run code against its JS contexts, pause it or delete it - there
  * is no binding to the creator's identity or connection. Fixing that is an API-surface design
  * (an opaque capability handed back by create, or identity plumbed from auth), not a patch here.
  */
class ConsumerServiceImpl(
    private val consumerSessions: ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner] =
        new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner](),
    private val makeSession: (ConsumerSessionName, ConsumerSessionConfig) => ConsumerSessionRunner =
        ConsumerServiceImpl.makeFromRequestContext,
    private val idleSessionTtlNanos: Long = ConsumerServiceImpl.idleSessionTtlNanos,
    private val disconnectedSessionGraceNanos: Long = ConsumerServiceImpl.disconnectedSessionGraceNanos,
    private val maxActiveSessions: Int = ConsumerServiceImpl.maxActiveSessions
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

    /** Builds that have taken an admission permit and have not yet installed (or abandoned) their
      * runner. The permit has to cover the BUILD, not merely the installed runner: subscribing a
      * session's consumers is where the threads, connections and receiver queues the cap exists to
      * bound are actually taken, and it happens long before anything reaches the map.
      *
      * Counted separately from the map rather than replacing it, so the installed half stays
      * authoritative: delete, the janitor's reap and a replacement all drop the map entry, and
      * none of them needs to remember to hand a permit back for the arithmetic to stay right.
      */
    private val buildsInFlight = java.util.concurrent.atomic.AtomicInteger(0)

    /** Sessions this server is running or building right now - what [[maxActiveSessions]] bounds,
      * and a test's window onto it. */
    private[consumer] def admittedSessionCount: Int = consumerSessions.size + buildsInFlight.get

    /** At most one Topic Positions scan per session, off the gRPC threads and inside the
      * server-wide broker-admin budget. See [[TopicPositionScanner]]. */
    private val topicPositionScans = consumer.session_runner.TopicPositionScanner()

    /** Take one GLOBAL admission permit for a build about to start, or answer false.
      *
      * `allowance` is how many of the currently installed sessions this build is about to remove:
      * 1 for a REPLACEMENT, whose predecessor is stopped a few lines below and therefore does not
      * count against the total the replacement will produce. That is what keeps the browser's
      * ordinary flow - it re-creates the session on every configuration change - admissible at the
      * cap, without the replacement first dropping its predecessor's slot and racing another name
      * for it.
      *
      * A CAS loop rather than a new lock: the count of installed sessions is read fresh on every
      * attempt, so two creates that both see room compete for the same permit and exactly one of
      * them gets it. No lock is introduced and no lock ordering changes - this is called while the
      * caller holds its per-name lifecycle lock and takes nothing else.
      */
    private def reserveAdmission(allowance: Int): Boolean =
        var reserved = false
        var settled = false
        while !settled do
            val inFlight = buildsInFlight.get
            if consumerSessions.size + inFlight - allowance >= maxActiveSessions then settled = true
            else if buildsInFlight.compareAndSet(inFlight, inFlight + 1) then
                reserved = true
                settled = true
        reserved

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

    /** The transport says a play stream's call died - the tab closed, the network dropped, or the
      * client simply cancelled after a pause. Intake is PAUSED, never deleted: the ordinary UI
      * pause cancels its stream too, and the user expects that session to still be there on the
      * next Play. Deletion is the idle janitor's job, an hour later.
      *
      * Under the lifecycle lock like every other lifecycle step, so it cannot interleave
      * target-by-target with a resume in flight; the compare-and-clear inside the runner then
      * makes a LATE cancellation of a replaced stream a no-op instead of a stomp on the
      * successor's play.
      */
    private def onPlayStreamCancelled(
        sessionName: ConsumerSessionName,
        observer: io.grpc.stub.StreamObserver[ResumeResponse]
    ): Unit =
        withLifecycleLock(sessionName) {
            Option(consumerSessions.get(sessionName)).foreach { consumerSession =>
                if consumerSession.releaseCancelledObserver(observer) && !consumerSession.isStreamCompleted then
                    logger.info(s"Play stream for consumer session $sessionName was cancelled by the transport. Pausing its intake.")
                    Try(consumerSession.pause()).failed.foreach(err =>
                        logger.warn(s"Consumer session $sessionName could not be fully paused after its stream was cancelled. ${err.getMessage}")
                    )
            }
        }

    /** When the janitor FIRST saw each still-installed runner with no live play stream AND every
      * consumer disconnected - the early-reap rule's memory between sweeps. An entry is cleared
      * the moment a sweep sees the state break (a consumer reconnected, a stream re-wired), so
      * the grace window measures a state that HELD, not one that flickered. Keyed by name but
      * bound to the runner instance: a replacement under the same name starts its own window.
      * Only [[reapIdleSessions]] touches this map - one janitor thread, or a test driving it
      * directly - and every sweep prunes the entries of sessions that are gone, so client-chosen
      * names cannot accumulate here.
      */
    private val disconnectedIdleFirstSeenNanos = new ConcurrentHashMap[ConsumerSessionName, (ConsumerSessionRunner, Long)]()

    /** Stop and remove every session no client is coming back for. TWO rules say when:
      *
      *   - THE TTL: no live play stream for [[idleSessionTtlNanos]]. Generous on purpose - a
      *     paused tab is a session with no stream, and its user may just be in a meeting.
      *   - THE SHORT LEASH: no live play stream AND every consumer of every target answering
      *     `isConnected == false` (a cheap in-memory flag, not a broker round trip), both seen to
      *     hold across sweeps for [[disconnectedSessionGraceNanos]]. Disconnected + unwatched is
      *     dead weight: a watching user's live stream protects a session through any broker blip,
      *     and in the worst case - the session's topics force-deleted under it - the consumers
      *     reconnect-loop on topics that can never come back, so the remaining TTL buys nothing
      *     but an hour of retry spam.
      *
      * This is the backstop for clients that vanish without a Delete RPC: the browser sends it
      * from `beforeunload`, where delivery is best-effort, so a closed tab could leave its
      * consumers connected - and, once their namespace was deleted, reconnect-looping - for the
      * life of the process. Each expired name is re-checked under its lifecycle lock, so a session
      * the user resumes between the scan and the reap is left exactly as their resume wired it.
      *
      * Package-private and time-injected so a test can expire sessions deterministically; the
      * scheduled task below is the only production caller.
      */
    private[consumer] def reapIdleSessions(nowNanos: Long): Vector[ConsumerSessionName] =
        def noLiveStreamFor(runner: ConsumerSessionRunner, windowNanos: Long): Boolean =
            runner.reapableSinceNanos.exists(since => nowNanos - since >= windowNanos)

        // "Every consumer of every target says it is not connected" - and there IS at least one.
        // A session holding no consumers at all holds nothing on the broker, so the short leash
        // has no business with it; the TTL remains its only bound.
        def fullyDisconnected(runner: ConsumerSessionRunner): Boolean =
            val consumers = runner.targets.values.flatMap(_.consumers.values)
            consumers.nonEmpty && consumers.forall(!_.isConnected)

        // Entries of sessions that no longer exist (deleted, replaced, reaped) go first, then the
        // installed sessions' observations are brought up to date inside the sweep below.
        disconnectedIdleFirstSeenNanos.entrySet.removeIf(entry => consumerSessions.get(entry.getKey) ne entry.getValue._1)

        // The short leash's whole verdict. The first-seen clause is the SUSTAINED requirement: a
        // single sweep's sighting records the state but never reaps it - it must still hold a
        // full grace window later, with `reapableSinceNanos` (which any resume in between would
        // have reset) confirming nobody watched for that window either.
        def earlyExpired(sessionName: ConsumerSessionName, runner: ConsumerSessionRunner): Boolean =
            noLiveStreamFor(runner, disconnectedSessionGraceNanos)
                && Option(disconnectedIdleFirstSeenNanos.get(sessionName))
                    .exists((seen, firstSeen) => (seen eq runner) && nowNanos - firstSeen >= disconnectedSessionGraceNanos)
                && fullyDisconnected(runner)

        def expired(sessionName: ConsumerSessionName, runner: ConsumerSessionRunner): Boolean =
            noLiveStreamFor(runner, idleSessionTtlNanos) || earlyExpired(sessionName, runner)

        consumerSessions.asScala.toVector.flatMap { (sessionName, candidate) =>
            // This sweep's observation first, so the sustained clock is fed by the same sweeps
            // that read it: note a first sighting, keep an existing one, forget a broken one.
            if candidate.reapableSinceNanos.isDefined && fullyDisconnected(candidate) then
                disconnectedIdleFirstSeenNanos.compute(
                    sessionName,
                    (_, existing) => if existing != null && (existing._1 eq candidate) then existing else (candidate, nowNanos)
                )
            else disconnectedIdleFirstSeenNanos.remove(sessionName)

            Option.when(expired(sessionName, candidate)) {
                withLifecycleLock(sessionName) {
                    // Same runner, still expired, now that nothing else can be mid-lifecycle.
                    Option(consumerSessions.get(sessionName)).filter(r => (r eq candidate) && expired(sessionName, r)) match
                        case Some(runner) =>
                            val reason =
                                if noLiveStreamFor(runner, idleSessionTtlNanos) then
                                    s"no live play stream for over ${idleSessionTtlNanos / 1_000_000_000L}s"
                                else
                                    s"no live play stream and every consumer disconnected for over ${disconnectedSessionGraceNanos / 1_000_000_000L}s"
                            logger.info(s"Reaping consumer session $sessionName: $reason.")
                            Try(runner.stop()).failed.foreach(err =>
                                logger.warn(s"Idle consumer session $sessionName could not be fully released. ${err.getMessage}")
                            )
                            consumerSessions.remove(sessionName, runner)
                            disconnectedIdleFirstSeenNanos.remove(sessionName)
                            Some(sessionName)
                        case None => None
                }
            }.flatten
        }

    // The janitor itself: one shared maintenance thread, one scan a minute. Never cancelled - the
    // service lives for the process. It also drives the cleanup quarantine's retry: a consumer that
    // refused to unsubscribe or close is retained rather than forgotten, and this is the only thing
    // that ever calls it again - see [[consumer.session_runner.CleanupQuarantine]].
    ConsumerSessionRunner.maintenanceScheduler.scheduleWithFixedDelay(
        () =>
            Try(reapIdleSessions(System.nanoTime())).failed.foreach(err => logger.warn(s"Idle-session sweep failed. ${err.getMessage}"))
            Try(consumer.session_runner.consumerCleanupQuarantine.retryPending()).failed
                .foreach(err => logger.warn(s"Retrying quarantined consumer cleanups failed. ${err.getMessage}"))
        ,
        ConsumerServiceImpl.janitorPeriodSeconds,
        ConsumerServiceImpl.janitorPeriodSeconds,
        java.util.concurrent.TimeUnit.SECONDS
    )

    /** Whether the transport has already reported this call dead. Only a real server-streaming
      * observer can say; a plain one (a test's, or a unary path) never claims to be cancelled. */
    private def isCancelled(observer: io.grpc.stub.StreamObserver[ResumeResponse]): Boolean =
        observer match
            case sco: io.grpc.stub.ServerCallStreamObserver[ResumeResponse @unchecked] => sco.isCancelled
            case _                                                                     => false

    override def resume(request: ResumeRequest, responseObserver: io.grpc.stub.StreamObserver[ResumeResponse]): Unit =
        val sessionName = request.consumerName
        logger.info(s"Resuming consumer session: $sessionName")

        // FIRST, while gRPC still allows handler registration: hear about the call dying. Without
        // this, a closed tab or dropped connection leaves the session consuming and acknowledging
        // into a dead stream until something else stops it. Installing the handler also switches
        // grpc-java from THROWING on sends into a cancelled call to silently dropping them, which
        // is what every Pulsar listener thread pushing into this observer wants. Plain observers
        // (tests) simply do without.
        responseObserver match
            case observer: io.grpc.stub.ServerCallStreamObserver[ResumeResponse @unchecked] =>
                observer.setOnCancelHandler(() => onPlayStreamCancelled(sessionName, responseObserver))
            case _ => ()

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
                // THE CANCELLATION THAT ARRIVED FIRST. The cancel callback above has to be
                // installed before this lock is taken - gRPC only allows handler registration
                // early - and the observer is wired into the runner only inside the resume below.
                // A call that dies in that window (or while another lifecycle operation holds this
                // lock) runs `onPlayStreamCancelled` against a runner this observer was never
                // wired into: the compare-and-clear finds no match, answers false, and does
                // nothing. Resuming anyway would then wire an ALREADY-DEAD stream, open every
                // target's intake and clear the idle clock - so messages fail into a stream nobody
                // holds and are nacked forever, while the janitor can no longer see the session as
                // abandoned and its subscription pins broker resources for the life of the process.
                //
                // Rechecked HERE, under the lifecycle lock, which is what makes the window empty:
                // a cancellation landing after this read must queue behind us for the lock and
                // will then find the observer wired. Nothing is answered on the observer - the
                // call is gone - and the session is left exactly as it was, so a predecessor play
                // stream (a second tab) keeps running and an idle session stays reapable.
                case Some(consumerSession) if isCancelled(responseObserver) =>
                    logger.info(
                        s"The play stream for consumer session $sessionName was cancelled before it could be wired; " +
                            "leaving the session as it was."
                    )
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

        // ADVISORY FIRST, before the lifecycle lock: close the intake the moment the user asks.
        // The serialized pause below can queue behind a resume still arming a wide session (or the
        // idle janitor holding this name), and for that whole wait the session kept delivering into
        // a browser whose user had already clicked Pause. Pausing is idempotent and every step is
        // safe against a runner in any state (gates are flags, arbiter holds are per-reason, a
        // consumer mid-close just fails its hold) - so this is best-effort and SILENT: the
        // serialized phase below remains the authoritative answer, re-pausing whatever a concurrent
        // resume may have re-opened in between, and ITS verdict is what the client hears. Nothing
        // is lost in the window either way: a closed gate refuses and hands back for redelivery,
        // and the limiter's backlog waits unacknowledged.
        Option(consumerSessions.get(sessionName)).foreach(session => Try(session.pause()))

        // Serialized with create, delete and resume under the same name. Pause used to take no
        // lock, so on a multi-target session it could interleave TARGET BY TARGET with a resume -
        // both answering OK while half the targets finished paused and half running, with the
        // limiter believing whichever call it heard last. The browser makes that race ordinary: a
        // quick hidden-then-visible tab abandons its pending pause and immediately resumes. The
        // advisory above narrows that race to a transient (final state is decided HERE, last in
        // the lock queue); it does not replace the serialization.
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

    /** Change the delivery order of a session that is ALREADY RUNNING - the actionable half of the
      * Guaranteed stall disclosure.
      *
      * A DEDICATED RPC rather than a flag on Resume: this mutates a live session, and a
      * session-mutating operation must be asked for explicitly instead of riding along with
      * pressing Play. It changes the LIVE session only; the saved configuration is the client's to
      * update if it wants the next Play to start this way.
      *
      * Serialized under the same per-name lifecycle lock as create, delete, pause and resume: the
      * switch releases held messages down the ordinary delivery path, so it must not interleave
      * with a resume rewiring the observers those messages are about to be written to, or with a
      * delete stopping the runner underneath it. Inside the runner it then takes the session's
      * ORDERING lock, which is the same order `resume` already establishes (lifecycle lock, then
      * ordering lock, then the merge's own monitor) - no new lock ordering is introduced.
      */
    override def setDeliveryOrder(request: SetDeliveryOrderRequest): Future[SetDeliveryOrderResponse] =
        val sessionName = request.consumerName

        def answer(code: Code, message: String = ""): Future[SetDeliveryOrderResponse] =
            if code != Code.OK then logger.warn(message)
            Future.successful(SetDeliveryOrderResponse(status = Some(Status(code = code.value, message = message))))

        // THE WIRE VALUE IS CHECKED BEFORE THE CONVERSION, and that is load-bearing.
        // `MessageDeliveryOrder.fromPb` resolves both UNSPECIFIED and an unrecognized future value
        // to the product default (Best effort) - right for a session CONFIGURATION, where absence
        // means "the product default", and exactly wrong for a MUTATION, where it would turn
        // "the client said nothing" into "the client asked to switch to Best effort".
        request.messageDeliveryOrder match
            case consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED =>
                answer(Code.INVALID_ARGUMENT, s"message_delivery_order names no order. Say which order session $sessionName should switch to.")
            case unknown: consumerPb.MessageDeliveryOrder.Unrecognized =>
                answer(
                    Code.INVALID_ARGUMENT,
                    s"message_delivery_order ${unknown.unrecognizedValue} is not a delivery order this server knows. Upgrade the server, or choose a known order."
                )
            case wire =>
                val requested = MessageDeliveryOrder.fromPb(wire)
                logger.info(s"Setting the delivery order of consumer session $sessionName to $requested")

                val status: Status = withLifecycleLock(sessionName) {
                    Option(consumerSessions.get(sessionName)) match
                        case None =>
                            val msg = s"No such consumer session: $sessionName"
                            logger.warn(msg)
                            Status(code = Code.FAILED_PRECONDITION.value, message = msg)
                        case Some(consumerSession) if consumerSession.isStreamCompleted =>
                            val msg = s"Consumer session $sessionName is closed; its delivery order cannot be changed. Create the session again."
                            logger.warn(msg)
                            Status(code = Code.FAILED_PRECONDITION.value, message = msg)
                        case Some(consumerSession) =>
                            Try(consumerSession.setDeliveryOrder(requested)) match
                                case Success(_) => Status(code = Code.OK.value)
                                case Failure(err) =>
                                    logger.warn(s"Refused to change the delivery order of consumer session $sessionName. ${err.getMessage}")
                                    Status(code = Code.FAILED_PRECONDITION.value, message = err.getMessage)
                }
                Future.successful(SetDeliveryOrderResponse(status = Some(status)))

    /** Why this CREATE REQUEST is malformed, or `None` - everything decidable from the request
      * ALONE, before a single broker call.
      *
      * These same rules are also enforced inside `ConsumerSessionRunner.make`, and deliberately so:
      * there they guard the build, here they let the refusal be classified honestly. A request that
      * asks for a negative skip, a fraction of NaN, more targets than a session may run, or a start
      * position that cannot describe a compacted target is WRONG - retrying it unchanged can never
      * work - and answering FAILED_PRECONDITION told the client the opposite. Deciding it here also
      * means a malformed request never reaches the broker at all.
      */
    private def malformedRequestReason(sessionName: ConsumerSessionName, sessionConfig: ConsumerSessionConfig): Option[String] =
        val enabledTargets = sessionConfig.targets.filter(_.isEnabled)
        // Indexed over ENABLED targets, exactly as `make` counts them - a disabled target is not
        // part of this session and its consumption mode is not this session's contradiction.
        val readCompactedTargetIndexes = enabledTargets.zipWithIndex.collect {
            case (targetConfig, targetIndex) if targetConfig.consumptionMode.mode
                    .isInstanceOf[_root_.consumer.session_target.consumption_mode.modes.ReadCompactedConsumptionMode] =>
                targetIndex
        }
        ConsumerSessionRunner
            .enabledTargetCountRejectionReason(sessionName, enabledTargets.size)
            .orElse(consumer.session_runner.startFromCountRejectionReason(sessionConfig.startFrom))
            .orElse(consumer.session_runner.startFromFractionRejectionReason(sessionConfig.startFrom))
            .orElse(consumer.session_runner.readCompactedStartFromRejectionReason(sessionConfig.startFrom, readCompactedTargetIndexes))

    override def createConsumer(request: CreateConsumerRequest): Future[CreateConsumerResponse] =
        val sessionName = request.consumerName

        def invalidArgument(message: String): Future[CreateConsumerResponse] =
            logger.warn(s"Refusing to create consumer session $sessionName: $message")
            Future.successful(CreateConsumerResponse(status = Some(Status(code = Code.INVALID_ARGUMENT.value, message = message))))

        // THE REQUEST IS JUDGED BEFORE THE WORLD IS. Everything below this point can fail because
        // of the broker or of what this server is already running, and that is FAILED_PRECONDITION;
        // everything above it is the request itself, and that is INVALID_ARGUMENT. They used to be
        // one status, so a client could not tell "fix your request" from "try again later".
        request.consumerSessionConfig match
            case None => invalidArgument("consumer_session_config is required, but the request carried none.")
            case Some(configPb) =>
                Try(ConsumerSessionConfig.fromPb(configPb)) match
                    case Failure(err) =>
                        invalidArgument(s"consumer_session_config could not be read. ${Option(err.getMessage).getOrElse(err.getClass.getSimpleName)}")
                    case Success(sessionConfig) =>
                        malformedRequestReason(sessionName, sessionConfig) match
                            case Some(reason) => invalidArgument(reason)
                            case None         => buildConsumerSession(sessionName, sessionConfig)

    /** The half that can fail because of the broker, the topology or this server's own load. Every
      * failure here is FAILED_PRECONDITION: the request was fine, the world was not. */
    private def buildConsumerSession(
        sessionName: ConsumerSessionName,
        sessionConfig: ConsumerSessionConfig
    ): Future[CreateConsumerResponse] =
        Try {
            logger.info(s"Creating consumer session. $sessionName")

            withLifecycleLock(sessionName) {
                // ADMISSION BEFORE THE BUILD, and the permit is held across ALL of it. The check
                // used to sit between the predecessor's removal and the build, reading a map size
                // that every concurrent create of a different name read identically - so the cap
                // bounded only what had already finished building, which is nothing anybody is
                // protected by. `allowance = 1` for a replacement: its predecessor is stopped just
                // below and does not count against the total this build will produce.
                val replacing = consumerSessions.containsKey(sessionName)
                if !reserveAdmission(allowance = if replacing then 1 else 0) then
                    throw new RuntimeException(
                        s"This server is already running $admittedSessionCount consumer sessions, its limit. " +
                            "Delete sessions you no longer need (abandoned ones expire on their own) and try again."
                    )

                try
                    // STOP THE PREDECESSOR FIRST. The replacement subscribes under the very same
                    // exclusive, non-durable subscription, so on the same topic a still-live
                    // predecessor refuses it - and the failure arrived long before the atomic map
                    // swap that was supposed to release it. The browser re-creates a session
                    // whenever its configuration changes, so this was the ordinary path, not a
                    // corner.
                    //
                    // Removing before building also means a build that FAILS leaves the name empty
                    // rather than leaving the old session running behind a client that has moved
                    // on: the user asked for this name to hold something else, and is told it does
                    // not.
                    Option(consumerSessions.remove(sessionName)).foreach(previous =>
                        Try(previous.stop()).failed.foreach(err =>
                            logger.warn(s"The consumer session being replaced under $sessionName could not be fully released. ${err.getMessage}")
                        )
                    )

                    // Still not a bare `put`: nothing but this lock stands between two creates, and
                    // a predecessor that somehow survives one must be stopped rather than
                    // abandoned.
                    storeConsumerSession(consumerSessions, sessionName, makeSession(sessionName, sessionConfig))
                finally
                    // The permit goes back LAST, after the runner is in the map - the map entry is
                    // what counts from here. Releasing it first would open a window in which the
                    // session is admitted by nothing at all. On the failure path nothing was
                    // installed, so this is the release that keeps a refused build from
                    // permanently costing the server a session slot.
                    buildsInFlight.decrementAndGet()
                    ()
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
        consumedBounds: Option[TopicConsumedBounds]
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
                firstConsumed = consumedBounds.map(_.first),
                cursor = consumedBounds.map(_.last),
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
                        firstConsumed = consumedBounds.map(_.first),
                        cursor = consumedBounds.map(_.last),
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
        //
        // A TERMINAL RUNNER IS "GONE" TOO, and answering that is what lets a polling client stop.
        // The tab polls once a second for as long as it believes the session exists, and a runner
        // whose stream has ended - stopped, replaced, or failed out of a resume - is unreachable
        // for good (the terminal gate is sticky; the client's remedy is to create the session
        // again). It stays in the map until delete or the janitor removes it, and while it did the
        // poll answered OK and went on scanning the broker on its behalf indefinitely.
        Option(consumerSessions.get(sessionName)).filterNot(_.isStreamCompleted) match
            case None =>
                val status: Status = Status(code = Code.FAILED_PRECONDITION.value, message = s"No such consumer session: $sessionName")
                Future.successful(GetTopicPositionsResponse(status = Some(status)))
            case Some(consumerSession) =>
                // RESOLVED HERE, ON THE gRPC THREAD, and passed into the scan: the request context
                // is a thread-local, so it exists only for as long as this call is on this thread.
                val adminClient = RequestContext.pulsarAdmin.get()

                // One row per PHYSICAL topic, which is what the session actually subscribes to and
                // the only thing `examineMessage` will answer for - it refuses a partitioned parent
                // outright (405).
                val consumedBounds = mergeConsumedBounds(consumerSession.targets.values.map(_.consumerListener.consumedBounds))
                val topicFqns = consumerSession.targets.values.flatMap(_.consumers.keys).toVector.distinct.sorted

                // OFF THIS THREAD, BOUNDED, AND COALESCED - see [[TopicPositionScanner]]. The rows
                // used to be gathered serially, right here, before an already-completed Future was
                // returned: a 2,000-topic session held a service thread for about 6,000 admin calls
                // that no client deadline could cancel, and the tab's once-a-second poll started
                // another sweep on top of every sweep still running.
                topicPositionScans
                    .scan(sessionName, topicFqns, topicFqn => gatherTopicPosition(adminClient, topicFqn, consumedBounds.get(topicFqn)))
                    .transform {
                        case Success(rows) =>
                            Success(GetTopicPositionsResponse(status = Some(Status(code = Code.OK.value)), positions = rows.map(topicPositionToPb)))
                        case Failure(err) =>
                            logger.warn(s"Could not read topic positions for $sessionName. ${err.getMessage}")
                            Success(GetTopicPositionsResponse(status = Some(Status(code = Code.UNKNOWN.value, message = err.getMessage))))
                    }(scala.concurrent.ExecutionContext.parasitic)
