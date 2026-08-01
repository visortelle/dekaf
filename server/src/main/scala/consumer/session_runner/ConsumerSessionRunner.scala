package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.session_config.ConsumerSessionConfig
import consumer.session_target.ConsumerSessionTarget
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

import scala.util.{Failure, Success, Try}

import java.util.concurrent.{Executors, ScheduledExecutorService, TimeUnit}
import java.util.concurrent.atomic.AtomicLong
import java.io.ByteArrayOutputStream
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import consumer.value_projections.ValueProjectionResult

import scala.util.boundary
import boundary.break

type ConsumerSessionTargetIndex = Int

/** The single shape every ResumeResponse takes, so a message response and a progress-only push
  * cannot drift apart.
  *
  * `startFromProgress` rides along on EVERY response, which is how the client learns that a skip
  * finished: the completing state arrives with the first message that actually gets delivered.
  * `None` means the session's start-from needed no counting at all, and the client is told nothing
  * rather than told zero.
  */
def resumeResponse(
    messages: Seq[consumerPb.Message],
    errors: Vector[String],
    startFromProgress: Option[consumerPb.StartFromProgress]
): consumerPb.ResumeResponse =
    val status = errors.size match
        case 0 => Status(code = Code.OK.value)
        case _ => Status(code = Code.UNKNOWN.value, message = errors.mkString("\n\n"))

    consumerPb.ResumeResponse(
        messages = messages,
        status = Some(status),
        consumerStats = startFromProgress.map(progress => consumerPb.ConsumerStats(startFromProgress = Some(progress)))
    )

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContextPool: ConsumerSessionContextPool,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner]
) {
    /** Session-wide counters, stamped onto EVERY `pb.Message` the browser receives.
      *
      * Atomic, and held in the body rather than as constructor params, because
      * `incrementNumMessageProcessed` is called from the target message handler BEFORE the
      * per-message context lease - i.e. concurrently, one listener thread per partition. As plain
      * `var Long`s these lost read-modify-write updates, so a partitioned session under-reported how
      * many messages it had processed and shipped that wrong number to the UI.
      *
      * `numMessageSent` happens to be incremented inside the lease today and so is already
      * serialized; it is atomic too so the guarantee does not silently depend on that call staying
      * where it is.
      */
    private val numMessageProcessedCounter = AtomicLong(0)
    private val numMessageSentCounter = AtomicLong(0)

    /** The per-resume delivery budget: how many more messages may be LOADED before the drain stops.
      * Long.MaxValue when no budget is armed - the decrement below runs unconditionally, and from
      * MaxValue it cannot reach zero in a session's lifetime. Reset by every resume.
      */
    private val remainingToDeliver = AtomicLong(Long.MaxValue)

    def numMessageProcessed: Long = numMessageProcessedCounter.get
    def numMessageSent: Long = numMessageSentCounter.get

    def incrementNumMessageProcessed(): Unit = numMessageProcessedCounter.incrementAndGet()

    /** Messages the start-from discard has still to drop before this session shows anything.
      *
      * Exposed so a test can assert "exactly n were skipped" instead of inferring it from what came
      * out. `distinct` is identity-based (StartFromDiscard defines no equals), which is what a
      * SharedTotal plan needs: every target holds the SAME counter and it must be counted once.
      *
      * Reads the EFFECTIVE counter, not the reportable one: this is the mechanism, and a latest-n
      * seek correction still has messages to drop even though the client is deliberately not shown
      * a progress bar for it.
      */
    def remainingStartFromDiscard: Long =
        targets.values.map(_.consumerListener.effectiveDiscard).toVector.distinct.map(_.remaining).sum

    /** How far the start-from skip has got, or `None` when there is no skip to do.
      *
      * Absent - not zero-and-complete - for every mode that seeks exactly (earliest, latest, a
      * date/time, a message id, an approximate position): those reach their position with the seek
      * itself, and a progress report for them would be an invention.
      *
      * `distinct` is identity-based, which is what a shared counter needs: every target of a
      * "skip first n" session holds the SAME counter, and counting it once per target would report
      * n times the number of targets. On a partitioned "skip first n" that counter belongs to the
      * global merge rather than to the listener, which is what `progressDiscard` resolves - the
      * merge decides the drops, so it is the only thing that knows how many are left.
      */
    def startFromProgress: Option[consumerPb.StartFromProgress] =
        val discards = targets.values.map(_.consumerListener.progressDiscard).toVector.distinct
        val toSkip = discards.map(_.total).sum

        Option.when(toSkip > 0) {
            val left = discards.map(_.remaining).sum
            // The degradation record rides on every progress frame: a stream the merge abandoned
            // means the position is best-effort, and the client keeps saying so for the session's
            // life. One listener suffices - the ordering layer is session-wide.
            val abandoned = targets.values.headOption.map(_.consumerListener.startFromAbandonedStreams).getOrElse(Vector.empty)
            consumerPb.StartFromProgress(
                messagesSkipped = toSkip - left,
                messagesToSkip = toSkip,
                complete = left <= 0,
                degraded = abandoned.nonEmpty,
                abandonedStreams = abandoned
            )
        }

    /** Whether the client that resumed this session asked for consumer stats
      * (`ResumeRequest.include_consumer_stats`).
      *
      * It used to be read off the request and then dropped, so every client received the stats -
      * including the MESSAGE-LESS progress frames a skip in flight pushes, which a client that
      * asked for no stats has no reason to expect. Set on every resume, like the debug flag.
      */
    var includeConsumerStats: Boolean = true

    /** What may actually go on the wire: nothing at all unless the client asked for it. */
    private def reportableStartFromProgress: Option[consumerPb.StartFromProgress] =
        if includeConsumerStats then startFromProgress else None

    /** Whether a counted start-from is still resolving: the discard has messages left to drop, or
      * the global merge is holding messages while it decides. The rate limiter's permit hold is
      * refused during this window - a consumer whose permits a THROTTLE paused looks exactly like
      * the silent stream the merge gives up on after 30 seconds, and that give-up silently changes
      * a skip's result. Delivers still queue during the window (they are the few at the boundary),
      * so the user-visible rate stays exact; only the broker-side backpressure waits.
      */
    private def startFromResolutionActive: Boolean =
        remainingStartFromDiscard > 0 || targets.values.exists(_.consumerListener.startFromOrdering.heldCount > 0)

    /** Applies or lifts the rate limiter's permit hold on every target. Each target refuses under
      * a closed gate, so a user pause always outranks the limiter's backpressure.
      *
      * ANSWERS whether every target applied it. `Consumer.pause()` can throw (a consumer mid-close
      * during a shutdown race), and swallowing that used to let the limiter latch `permitsHeld`
      * with nothing actually paused - the broker kept filling the queue and no retry ever came,
      * because the flag said the work was done. Every target is still ATTEMPTED (one broken
      * consumer must not shield the others), and the aggregate verdict lets the caller keep the
      * flag honest.
      */
    private val permitLogger = com.typesafe.scalalogging.Logger(getClass.getName)

    private def setPermitHold(hold: Boolean): Boolean =
        targets.values.toVector
            .map { target =>
                Try(target.setPermitHold(hold)) match
                    case Success(_) => true
                    case Failure(err) =>
                        permitLogger.warn(
                            s"Could not ${if hold then "hold" else "release"} permits on target ${target.targetIndex}: ${err.getMessage}"
                        )
                        false
            }
            .forall(identity)

    /** The single timer thread behind the session's delivery rate limiter, created on first use so
      * a session that never throttles never owns one. Only the drain schedule runs here - the
      * drain itself leases the session's JS context and takes the send lock, which is exactly the
      * work the listener threads do today.
      */
    private var rateLimiterExecutor: Option[ScheduledExecutorService] = None

    private def timerExecutor(): ScheduledExecutorService = synchronized {
        rateLimiterExecutor.getOrElse {
            val created = Executors.newSingleThreadScheduledExecutor(runnable => {
                val thread = Thread(runnable, s"delivery-rate-limit-$sessionName")
                thread.setDaemon(true)
                thread
            })
            rateLimiterExecutor = Some(created)
            created
        }
    }

    private def scheduleRateLimiterTick(delayMs: Long, task: Runnable): Unit =
        // A tick scheduled while stop() is shutting the executor down is a delivery that no longer
        // matters; dropping it is the correct outcome, not an error.
        Try(timerExecutor().schedule(task, delayMs, TimeUnit.MILLISECONDS))
        ()

    /** The merge's stall bound is TIME-driven only through this watchdog: the in-band check runs on
      * offers, and after the last held backlog message no offer may ever come again - a
      * retention-trimmed partition then held the merge forever with the give-up window long
      * expired. Armed on resume while a counted start-from is unresolved, disarmed the moment it
      * resolves (the task cancels itself), on pause, and on stop.
      */
    private var stallSweepTask: Option[java.util.concurrent.ScheduledFuture[?]] = None

    private def armStallSweep(): Unit = synchronized {
        if startFromResolutionActive && stallSweepTask.forall(task => task.isDone || task.isCancelled) then
            stallSweepTask = Try(
                ConsumerSessionRunner.maintenanceScheduler.scheduleWithFixedDelay(
                    () =>
                        if !startFromResolutionActive then cancelStallSweep()
                        else
                            Try(targets.values.headOption.foreach(_.consumerListener.sweepStartFromStall())).failed
                                .foreach(err => permitLogger.warn(s"The start-from stall sweep failed; it will run again. ${err.getMessage}")),
                    startFromStallSweepPeriodMs,
                    startFromStallSweepPeriodMs,
                    TimeUnit.MILLISECONDS
                )
            ).toOption
    }

    private def cancelStallSweep(): Unit = synchronized {
        stallSweepTask.foreach(_.cancel(false))
        stallSweepTask = None
    }

    /** The session's delivery rate limiter. ONE per session however many targets and partitions the
      * selector matched, so the configured number means "per second, total" - the only reading a
      * user can act on. Rate 0 (the default) short-circuits to the unlimited path.
      */
    val deliveryRateLimiter: DeliveryRateLimiter[HeldMessage] = DeliveryRateLimiter[HeldMessage](
        core = DeliveryRateLimiterCore[HeldMessage](nowMs = () => System.nanoTime() / 1_000_000L),
        schedule = scheduleRateLimiterTick,
        process = held => held.listener.deliverNow(held),
        holdPermits = () =>
            // Both refusals hand back `false`, and the limiter retries on the next crossing offer:
            // suppression until the counted start-from resolves, and a target whose consumer threw.
            !startFromResolutionActive && setPermitHold(true),
        releasePermits = () =>
            // A failed release is only logged: the flag is already cleared, so the next crossing
            // re-pauses whatever is still pausable, and a consumer that cannot resume is one the
            // next user resume (or stop) deals with anyway.
            setPermitHold(false)
            ()
    )

    /** Hand ONE response to the client, with wherever the start-from skip has got to attached.
      *
      * Every response leaves through here - a delivered message, a count-only placeholder, a
      * progress push - so the client cannot receive one that forgot the stats. That matters for the
      * completing state in particular: the client clears its progress panel when `complete` is true
      * or when the field is absent, so a delivered message that dropped the stats would leave a
      * "skipping..." panel on screen for the rest of the session.
      *
      * SERIALIZED, AND THE RESPONSE IS BUILT INSIDE THE SERIALIZED SECTION. `io.grpc.stub
      * .StreamObserver` is not thread-safe and this is entered from every Pulsar listener thread of
      * the session - one per physical topic - as well as from the gRPC thread that resumed it.
      * Progress pushes made that concrete: several partitions claiming a discard at once each called
      * `onNext` directly, concurrently, on one observer.
      *
      * Taking the lock only around `onNext` was not enough. The response - INCLUDING its start-from
      * counters - was built first, so two threads could snapshot the counters in one order and send
      * in the other: an older, still-incomplete progress frame could be written after a newer,
      * complete one. The client clears its progress panel when it sees `complete`, so the stale
      * frame behind it reopened a "skipping..." panel that stayed for the rest of the session. The
      * snapshot and the write now happen under one lock, which is the only way the two can agree.
      *
      * NOTHING IS WRITTEN AFTER THE STREAM HAS BEEN COMPLETED. See [[stop]].
      */
    def sendResponse(
        observer: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        messages: Seq[consumerPb.Message],
        errors: Vector[String]
    ): Unit =
        sendLock.synchronized {
            if !streamCompleted then observer.onNext(resumeResponse(messages, errors, reportableStartFromProgress))
        }

    /** The one thing every write to this session's response stream goes through - including the
      * terminal `onCompleted`, which is what makes "no response after the end" enforceable. */
    private val sendLock = new Object

    /** Whether the client's stream has been ended. Read and written only under [[sendLock]], so
      * every listener thread sees it as soon as the thread that ended the stream let go.
      *
      * STICKY, deliberately. A session is only stopped on its way out - deleted, or replaced by a
      * new session under the same name - and the runner is discarded immediately afterwards. A
      * resume that raced the stop would otherwise start writing into a completed gRPC stream, which
      * throws; the client's own remedy is to create a session, not to revive this one.
      */
    private var streamCompleted: Boolean = false

    /** Whether this runner's response stream has been ENDED - by [[stop]], or by
      * [[failAndComplete]]. Sticky, like the flag it reads: a terminal runner can never speak
      * again, so `ConsumerServiceImpl.resume` must answer a fresh observer itself rather than wire
      * it into one - every send would be swallowed by the gate and the play stream would hang
      * silent.
      */
    def isStreamCompleted: Boolean = sendLock.synchronized(streamCompleted)

    /** End the client's stream with a non-OK `status`, through the same lock and terminal flag as
      * every other write to it.
      *
      * This exists for the failure paths that used to write to the observer DIRECTLY: a late
      * target throwing out of a resume leaves the earlier targets' listeners live and pushing into
      * the same observer, so a status frame written outside [[sendLock]] could interleave with a
      * push (`StreamObserver` is not thread-safe), and an `onCompleted` that set no terminal flag
      * let every later push land in a completed stream. Both sends are best-effort - the client's
      * call may already be dead - but the flag, which is what stops the pushing, is set regardless.
      */
    def failAndComplete(status: Status): Unit =
        sendLock.synchronized {
            if !streamCompleted then
                streamCompleted = true
                grpcResponseObserver.foreach { observer =>
                    Try(observer.onNext(consumerPb.ResumeResponse(status = Some(status))))
                    Try(observer.onCompleted())
                }
                grpcResponseObserver = None
        }

    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        isDebug: Boolean,
        includeConsumerStats: Boolean = true,
        maxMessagesPerSecond: Long = 0,
        maxMessagesToDeliver: Long = 0
    ): Unit =
        // Under the send lock like every other touch of the observer field: it is read by
        // [[sendResponse]], [[failAndComplete]] and [[stop]] on other threads, and an unserialized
        // write here could interleave with a stop completing the PREVIOUS observer.
        sendLock.synchronized { this.grpcResponseObserver = Some(grpcResponseObserver) }
        this.includeConsumerStats = includeConsumerStats

        // Both delivery controls are per RESUME, like the two flags above them - they belong to
        // the browser that pressed Play, not to the session's saved definition. Configured before
        // the targets resume below, so the gate's volatile write publishes the limiter to the
        // listener threads along with everything else this resume rewired. The user's resume also
        // resumed every consumer regardless of any permit hold the limiter had placed, so the
        // limiter is told to forget it - its next watermark crossing re-asserts the hold instead
        // of believing a stale flag.
        //
        // The delivery budget counts LOADED messages at the send site below; it needs the queue
        // (forceQueue) so the drain can stop the line BETWEEN messages - the budget's whole
        // contract is that the message spending the last unit is the last one sent.
        remainingToDeliver.set(if maxMessagesToDeliver > 0 then maxMessagesToDeliver else Long.MaxValue)
        deliveryRateLimiter.core.setRate(math.max(0, maxMessagesPerSecond))
        deliveryRateLimiter.core.setForceQueue(maxMessagesToDeliver > 0)
        deliveryRateLimiter.onConsumersExternallyResumed()
        targets.values.foreach(_.consumerListener.deliveryRateLimiter = Some(deliveryRateLimiter))
        // The drain is re-armed at the BOTTOM of this method, after every target has rewired its
        // handlers onto this resume's observer. Re-arming here scheduled a zero-delay tick that
        // could run a queued tail through the PREVIOUS play's handler closure - sending messages
        // to the cancelled observer, acknowledging them, and charging them to THIS resume's
        // delivery budget. The messages were consumed and never seen.

        // A message the start-from discard swallowed reaches nobody: the listener drops it before the
        // message handler, so nothing on the path below fires while a skip is in flight. Without
        // this push a session skipping millions of messages looks hung - it delivers nothing and
        // says nothing. Runs on the Pulsar listener threads, one per consumer.
        var degradationReported = false
        def reportStartFromDiscardProgress(): Unit =
            reportableStartFromProgress.foreach { progress =>
                // The FIRST degraded frame bypasses the interval gate. A give-up may resolve only
                // a handful of drops - or none at all - and a session that then goes quiet would
                // never cross another interval boundary: the disclosure would sit in the server
                // forever, which is the exact silent failure the flag exists to prevent.
                val mustDiscloseDegradation = progress.degraded && !degradationReported
                if mustDiscloseDegradation
                    || shouldReportStartFromProgress(progress.messagesSkipped, progress.messagesToSkip, startFromProgressReportInterval)
                then
                    if mustDiscloseDegradation then
                        // Log-worthy in its own right: this is the moment the session's answer
                        // became best-effort, and the one frame the client's banner hangs on.
                        permitLogger.info(
                            s"Disclosing start-from degradation to the client: abandoned ${progress.abandonedStreams.mkString(", ")}"
                        )
                    if progress.degraded then degradationReported = true
                    // Message-less on purpose: nothing was delivered, only the counters moved. The
                    // client reads the stats before it looks for a trailing message.
                    sendResponse(grpcResponseObserver, Seq.empty, Vector.empty)
            }

        def onNext(
            messageFromTarget: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String]
        ): Unit = boundary:
            def createAndSendResponse(messages: Seq[consumerPb.Message], additionalErrors: Vector[String] = Vector.empty): Unit =
                sendResponse(grpcResponseObserver, messages, errors ++ additionalErrors)
                boundary.break(())

            messageFromTarget match
                case None =>
                    val emptyMsgPb = consumerPb.Message(
                        numMessageProcessed = numMessageProcessed,
                        numMessageSent = numMessageSent
                    )
                    // NOT `errors` again: createAndSendResponse already appends the captured
                    // `errors` to every response, so passing them here too doubled every
                    // target-filter debug error the client saw.
                    createAndSendResponse(Seq(emptyMsgPb))

                case Some(msg) =>
                    val messageFilterChainResult = sessionContext.testMessageFilterChain(
                        sessionConfig.messageFilterChain
                    )

                    if !messageFilterChainResult.isOk then
                        // Session-level filter miss: emit the SAME count-only placeholder the drained /
                        // target-filter-miss path (`case None` above) sends - NOT an empty (zero-message)
                        // response. On a zero-message response the client throws reading the trailing
                        // counters (ConsumerSession.tsx: newMessages[newMessages.length - 1]
                        // .getNumMessageProcessed()), which kills the stream handler - so the session
                        // halted at the first non-matching message. A count-only placeholder advances
                        // the processed counter, renders no row, and keeps the stream flowing (matching
                        // the per-target filter, which never halts).
                        val filteredMsgPb = consumerPb.Message(
                            numMessageProcessed = numMessageProcessed,
                            numMessageSent = numMessageSent
                        )
                        val filterErrors = if isDebug then messageFilterChainResult.results.flatMap(r => r.error) else Vector.empty
                        createAndSendResponse(Seq(filteredMsgPb), filterErrors)

                    val coloringRuleChainResult: Vector[ChainTestResult] = if sessionConfig.coloringRuleChain.isEnabled then
                        sessionConfig.coloringRuleChain.coloringRules
                            .filter(_.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(cr.messageFilterChain))
                    else
                        Vector.empty

                    val valueProjectionListResult: Vector[ValueProjectionResult] = if sessionConfig.valueProjectionList.isEnabled then
                        sessionConfig.valueProjectionList.projections
                            .filter(_.isEnabled)
                            .map(_.project(sessionContext.context))
                    else
                        Vector.empty

                    val errors: Vector[String] = if isDebug then
                        val messageFilterChainErrors = messageFilterChainResult.results.flatMap(r => r.error)
                        val coloringRuleChainErrors = coloringRuleChainResult.flatMap(r => r.results.flatMap(r2 => r2.error))
                        messageFilterChainErrors ++ coloringRuleChainErrors
                    else Vector.empty

                    numMessageSentCounter.incrementAndGet()
                    // The delivery budget is spent HERE - on loaded messages, after every filter -
                    // and the send that spends the last unit stops the drain before it returns, so
                    // whatever sits behind it in the batch is requeued instead of delivered. With
                    // no budget armed the counter starts at Long.MaxValue and this never fires.
                    if remainingToDeliver.decrementAndGet() == 0 then deliveryRateLimiter.pauseDraining()

                    val messageToSendPb = msg.messagePb
                        .withSessionContextStateJson(sessionContext.getState)
                        .withDebugStdout(msg._1.debugStdout.getOrElse("") + "\n" + sessionContext.getStdout)
                        .withSessionMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                        .withSessionColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))
                        .withSessionValueProjectionListResult(valueProjectionListResult.map(ValueProjectionResult.toPb))
                        .withNumMessageSent(numMessageSent)
                        .withNumMessageProcessed(numMessageProcessed)

                    createAndSendResponse(Seq(messageToSendPb), errors)

        targets.values.foreach(_.resume(
            onNext = onNext,
            isDebug = isDebug,
            incrementNumMessageProcessed = incrementNumMessageProcessed,
            onStartFromDiscardProgress = reportStartFromDiscardProgress
        ))

        // LAST, deliberately: only now does every listener's handler point at THIS observer, so a
        // queued tail from the previous play drains into the resume that asked for it. See the
        // comment where the limiter is configured above.
        deliveryRateLimiter.resumeDraining()
        // A pause held every source, so paused time proves nothing about a stream's health: hand
        // the silent-stream clock a fresh window instead of letting the first sweep after resume
        // abandon a stream that was merely held along with everything else.
        targets.values.headOption.foreach(_.consumerListener.resetStartFromStallClock())
        armStallSweep()
    def pause(): Unit =
        targets.values.foreach(_.pause())
        // A paused session delivers NOTHING, including from the limiter's backlog: draining stops
        // and the queue waits, unacknowledged, for the next resume.
        deliveryRateLimiter.pauseDraining()
        cancelStallSweep()

    /** Release everything this session owns: its consumers and their subscriptions, its GraalVM
      * contexts, and the client's response stream.
      *
      * EVERY step runs even if an earlier one failed, and the failures are aggregated into one
      * exception at the end. It used to swallow unsubscribe failures entirely and close nothing at
      * all, so `deleteConsumer` removed the only handle to the session and answered OK while the
      * subscription stayed on the broker, the consumers stayed connected, the Graal context stayed
      * open and the browser kept a stream that was never completed.
      *
      * Idempotent: each target clears its consumer map, closing a Graal context twice is a no-op,
      * and the observer is forgotten once completed.
      *
      * ENDING THE STREAM IS ITSELF A WRITE TO IT, so it goes through [[sendLock]] like every other
      * one. `onCompleted` used to be called outside that lock with no terminal flag at all, so it
      * could interleave with an `onNext` still in flight on a listener thread - and any push after
      * it wrote to a stream that had already ended.
      */
    def stop(): Unit =
        Try(pause())
        // The limiter's backlog dies with the session: the messages were never acknowledged, and
        // the NonDurable subscriptions being released below take any redelivery question with
        // them. Clearing promptly is about freeing the payloads, not about correctness.
        Try(deliveryRateLimiter.stop())
        synchronized { rateLimiterExecutor }.foreach(executor => Try(executor.shutdownNow()))
        // An UNEXPECTED throw out of a target's own stop used to become an empty failure vector, so
        // whatever it failed to release was reported as released. It is a failure like any other.
        val targetFailures = targets.values.toVector.flatMap { target =>
            Try(target.stop()) match
                case Success(failures) => failures
                case Failure(err)      => Vector(s"target ${target.targetIndex}: ${err.getMessage}")
        }
        // The pool's own failures count too: a JS context that will not close holds its heap for the
        // life of the process, and this used to be discarded twice over - swallowed inside `close`
        // and then discarded again here.
        val poolFailures = Try(sessionContextPool.close()) match
            case Success(failures) => failures
            case Failure(err)      => Vector(s"JS context pool: ${err.getMessage}")
        val failures = targetFailures ++ poolFailures
        sendLock.synchronized {
            if !streamCompleted then
                streamCompleted = true
                grpcResponseObserver.foreach(observer => Try(observer.onCompleted()))
                grpcResponseObserver = None
        }
        if failures.nonEmpty then
            throw new RuntimeException(s"Consumer session $sessionName could not be fully released. ${failures.mkString("; ")}")
}

/** The logger [[storeConsumerSession]] reports through - a top-level function needs its own name
  * for the log line to be attributable (and for a test to listen on). */
private val storeConsumerSessionLogger = com.typesafe.scalalogging.Logger("consumer.session_runner.storeConsumerSession")

/** Store a freshly built session under its name, STOPPING whatever it replaced.
  *
  * Creating a session under a name that already existed simply overwrote the entry, and the old
  * runner's consumers went on holding their subscriptions and delivering messages into a session
  * nothing could reach - for the life of the process. The browser re-creates a session on an
  * ordinary configuration change, so this was the common path, not a corner.
  *
  * The replacement goes in FIRST and unconditionally: a predecessor that cannot be released must
  * not make its name permanently unusable, so the failure is LOGGED HERE rather than propagated -
  * it used to be discarded outright, while this comment claimed the caller logged it, so a
  * predecessor that failed to release vanished without a trace in exactly the situation an
  * operator needs one. `ConcurrentHashMap.put` is atomic, so two concurrent creates leave exactly
  * one session stored and the other stopped.
  */
def storeConsumerSession(
    sessions: java.util.concurrent.ConcurrentHashMap[String, ConsumerSessionRunner],
    sessionName: String,
    session: ConsumerSessionRunner
): Unit =
    Option(sessions.put(sessionName, session)).foreach(replaced =>
        Try(replaced.stop()).failed.foreach(err =>
            storeConsumerSessionLogger.warn(
                s"The consumer session being replaced under $sessionName could not be fully released. ${err.getMessage}"
            )
        )
    )
    ()

object ConsumerSessionRunner:

    private def isReadCompactedTarget(targetConfig: consumer.session_target.ConsumerSessionTarget): Boolean =
        targetConfig.consumptionMode.mode match
            case _: consumer.session_target.consumption_mode.modes.ReadCompactedConsumptionMode => true
            case _                                                                              => false
    /** ONE daemon thread for every session's periodic upkeep (the start-from stall sweeps). Each
      * armed sweep is a tiny check every couple of seconds, and it self-cancels the moment its
      * skip resolves - a thread per session outlived its one job by the whole session lifetime.
      * The rare give-up DRAIN does run session work here (delivering what a silent stream held
      * back), which is accepted: it fires at most once per abandoned stream. The delivery rate
      * limiter keeps its per-session timer - its ticks do real per-message work under the
      * session's own locks and must not serialize sessions against each other.
      */
    private[session_runner] lazy val maintenanceScheduler: ScheduledExecutorService =
        Executors.newSingleThreadScheduledExecutor(runnable => {
            val thread = Thread(runnable, "consumer-session-maintenance")
            thread.setDaemon(true)
            thread
        })
    /** @param sessionContextPool
      *   the session's GraalVM engine and JS contexts. A parameter (with the production default)
      *   only so a test can prove the pool is RELEASED when construction fails - it is created
      *   before anything else and so is the first thing that can be leaked.
      */
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionName: String,
        sessionConfig: ConsumerSessionConfig,
        sessionContextPool: ConsumerSessionContextPool = ConsumerSessionContextPool()
    ): ConsumerSessionRunner =
        var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner] = Map.empty

        // EVERYTHING THIS SESSION OWNS IS RELEASED IF ANY OF IT FAILS, and the pool is inside that
        // guard from the very first step. It used to be built before the guard existed, so a target
        // that failed to build released the targets built before it (`buildAllOrRelease`) and left
        // the GraalVM engine and its JS contexts open with nothing holding a handle to them - a
        // whole engine leaked per failed create, and the browser retries a failed create.
        def releasingSession[A](build: => A): A =
            try build
            catch
                case err: Throwable =>
                    targets.values.foreach(target => Try(target.stop()))
                    Try(sessionContextPool.close())
                    throw err

        // ALL OR NOTHING, at the target level as well as inside each target: a session builds one
        // runner per enabled target, and a plain `map` left every target built before a failing one
        // subscribed and unreachable.
        targets = releasingSession(buildAllOrRelease[(ConsumerSessionTarget, Int), (Int, ConsumerSessionTargetRunner)](
            inputs = sessionConfig.targets.filter(_.isEnabled).zipWithIndex,
            build = (targetConfig, i) =>
                i -> ConsumerSessionTargetRunner.make(
                    sessionName = sessionName,
                    targetIndex = i,
                    pulsarClient = pulsarClient,
                    adminClient = adminClient,
                    schemasByTopic = Map.empty,
                    sessionContextPool = sessionContextPool,
                    targetConfig = targetConfig
                )
            ,
            release = (_, target) => target.stop()
        ).toMap)

        // A session with nothing to consume from used to be accepted: `make` returned a runner with
        // an empty consumer map and ConsumerServiceImpl.createConsumer answered Code.OK, so the UI
        // showed a session in state `running` that could never deliver a message and never said
        // why. Reject it here, before any seeking, so the client gets a real non-OK status.
        if targets.isEmpty then
            Try(sessionContextPool.close())
            throw new IllegalArgumentException(
                s"Consumer session $sessionName has no enabled targets."
            )

        val emptyTargetIndexes = targets.collect { case (targetIndex, target) if target.consumers.isEmpty => targetIndex }.toVector.sorted
        if emptyTargetIndexes.nonEmpty then
            releasingSession(throw new IllegalArgumentException(
                s"Consumer session $sessionName has enabled targets that resolved to no topics: ${emptyTargetIndexes.mkString(", ")}."
            ))

        // DISTINCT: two enabled targets may legitimately select the same topic, and each keeps its
        // own consumer on it. What this vector feeds - schema lookup, the non-persistent rejection,
        // the Message-ID lookup and the single-topic fast path - all ask ABOUT a topic rather than
        // consume from it, and asking twice about one topic broke the Message-ID mode outright.
        val nonPartitionedTopicFqns = targets.values.flatMap(_.nonPartitionedTopicFqns).toVector.distinct
        val schemasByTopic = releasingSession(getSchemasByTopic(adminClient, nonPartitionedTopicFqns))

        targets = targets.map { case (targetIndex, target) =>
            targetIndex -> target.copy(schemasByTopic = schemasByTopic)
        }

        val consumers = targets.values.flatMap(_.consumers).map(_._2).toVector

        val startFromPlan = releasingSession {
            // Target-aware validations, before any broker round trip: a session that cannot mean
            // what it promises is refused while refusing is still cheap.
            val readCompactedTargetIndexes = targets.toVector
                .collect { case (targetIndex, target) if isReadCompactedTarget(target.targetConfig) => targetIndex }
                .sorted
            latestNReadCompactedRejectionReason(sessionConfig.startFrom, readCompactedTargetIndexes)
                .foreach(reason => throw new IllegalArgumentException(reason))
            skipOverlapRejectionReason(sessionConfig.startFrom, targets.values.toVector.map(_.nonPartitionedTopicFqns))
                .foreach(reason => throw new IllegalArgumentException(reason))
            handleStartFrom(
                startFrom = sessionConfig.startFrom,
                consumers = consumers,
                adminClient = adminClient,
                pulsarClient = pulsarClient,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns
            )
        }

        // Arm the start-from discard ONCE, here: the seek has happened and no consumer has been
        // resumed yet. `resume` deliberately knows nothing about it - re-arming on every play would
        // skip a fresh batch of messages each time the session is paused and resumed.
        //
        // A SharedTotal plan is ONE counter over the merged stream, so every target must get the
        // SAME instance; a PerTopic plan gets a fresh counter per target, because two targets may
        // select the same topic and each has its own consumer to correct.
        val sharedDiscard = startFromPlan.discard match
            case StartFromDiscardPlan.SharedTotal(n) => StartFromDiscard.shared(n)
            case _                                   => StartFromDiscard.none

        // The global ordering layer is ONE object for the whole session for the same reason a
        // SharedTotal counter is: "the globally-first n" and "the globally-last n" are counted over
        // every target's stream at once, so a layer per target would answer n per target.
        val ordering = StartFromOrdering.make[HeldMessage](
            startFromPlan.ordering,
            // The byte half of the merge's memory watermarks: what one held message costs.
            payloadBytesOf = held => scala.util.Try(Option(held.message.getData).map(_.length.toLong).getOrElse(0L)).getOrElse(0L)
        )

        targets.values.foreach { target =>
            target.consumerListener.startFromDiscard =
                StartFromDiscard.forTarget(startFromPlan.discard, sharedDiscard, target.nonPartitionedTopicFqns)
            target.consumerListener.startFromOrdering = ordering
        }

        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = sessionConfig,
            schemasByTopic = schemasByTopic,
            sessionContextPool = sessionContextPool,
            targets = targets,
            grpcResponseObserver = None
        )
