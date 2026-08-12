package consumer.session_runner

import com.typesafe.scalalogging.Logger

import java.util.concurrent.atomic.AtomicBoolean
import scala.collection.mutable.ArrayDeque
import scala.util.Try

/** The delivery rate limiter: a token bucket and a FIFO queue between "the session decided to show
  * this message" and "the browser was sent it".
  *
  * WHERE IT SITS, AND WHY EXACTLY THERE. The limiter is fed only with DELIVER outcomes - after the
  * start-from discard and the global merge have decided a message is going to be shown. Drops fly
  * past it at full speed, so a counted skip or a latest-n walk positions as fast as the broker can
  * serve it; the limit shapes what the user actually watches, which is the only thing a
  * messages-per-second number can honestly mean to them. Feeding it any earlier would slow the
  * positioning the user is waiting on; any later (at the gRPC send) would leave the expensive part
  * - deserialization and the GraalVM filter chain - running at firehose rate with the limit
  * protecting nothing but the tab.
  *
  * WHY A QUEUE AND NOT THE BROKER'S PERMITS. `Consumer.pause()` only stops asking the broker for
  * more; everything already prefetched (up to receiverQueueSize per partition) is still handed to
  * the listener afterwards - this codebase measured that, see ConsumerSessionTargetRunner.pause.
  * Pacing with permits alone therefore bursts by thousands. Here the burst lands in the queue
  * instead of the browser, and the drain releases EXACTLY the configured rate; the permits are
  * used for what they are good at - bounding how much piles up - via the high/low watermarks.
  *
  * WHY NOTHING EVER BLOCKS OR NACKS HERE. Offering is an enqueue under a lock held for
  * nanoseconds, so a Pulsar listener thread is never parked and the global merge - whose offers
  * run under the session's ordering lock - is never starved into its silent-stream give-up.
  * The unlimited (rate 0) inline shortcut is the one exception, and it is REFUSED while a live
  * merge holds its ordering lock around the offer: the caller forces the queue then (see
  * [[ConsumerListener.deliver]]), because processing inline there ran the JS lease and the
  * blocking gRPC write inside that lock. Rejecting instead of queueing would nack, and a
  * sustained rate limit built on nacks is the ~100ms redelivery storm the round-3 review put a
  * bound on, recreated deliberately.
  *
  * ORDER IS THE QUEUE'S ORDER, ALWAYS. Merge-ordered sessions enqueue under the ordering lock, so
  * the queue holds the merge's decision order; the single drainer releases FIFO; and while a drain
  * is in flight or a backlog exists, nothing is processed inline - `drainInProgress` closes the
  * window in which a later message could overtake a queued one into the stateful session filters.
  *
  * The core is deliberately free of threads and clocks: the wrapper below owns scheduling and side
  * effects, this class owns every decision, and the tests drive it with a hand-cranked clock.
  */
final class DeliveryRateLimiterCore[A](
    nowMs: () => Long,
    // What one queued payload costs, for the BYTE watermark. The count watermark alone let a
    // rate-limited session on fat messages hold gigabytes: 2000 queued 5 MB payloads is 10 GB
    // the count marks called fine. The default counts nothing (tests that don't care);
    // production wires the real payload size in.
    payloadBytesOf: A => Long = (_: A) => 0L
):
    /** Messages per second; 0 means unlimited (offers process inline whenever no backlog exists). */
    private var ratePerSecond: Long = 0

    /** The bucket. Capacity is one second's worth (= ratePerSecond), and it STARTS FULL on every
      * rate change: the first screenful after Play appears at once, and the cap shapes what follows.
      * A session limited to 100/s that begins with "latest 50" paints all 50 immediately - the user
      * asked for exactly those - and then trickles.
      */
    private var tokens: Double = 0
    private var lastRefillAtMs: Long = nowMs()

    private val queue = ArrayDeque.empty[A]

    // Payload bytes currently queued - maintained at every append/remove, like the merge's own
    // byte bookkeeping, so reading it never scans the queue.
    private var queuedBytes: Long = 0L

    /** True from the moment a drain is scheduled until [[beginDrain]] hands its batch out, so a
      * second timer is never armed for the same backlog. */
    private var drainScheduled = false

    /** True between [[beginDrain]] and [[finishDrain]], i.e. while the wrapper is processing a
      * batch OUTSIDE this lock. Inline processing is refused while it is set - see the class note
      * on ordering. */
    private var drainInProgress = false

    /** THE USER'S PAUSE AND THE DELIVERIES IT MUST OUTRANK, under ONE lock - which is the whole
      * point of them living here rather than in the wrapper.
      *
      * The wrapper used to hold the flag in an AtomicBoolean and read it as the drain loop's
      * condition, so a Pause landing between that read and the delivery call was answered to the
      * client while the already-decided item went on to be SENT and ACKNOWLEDGED. "Paused" has to
      * mean two things at once - no delivery may start, and none is still running - and two
      * separate pieces of state can never mean that together.
      *
      * `deliveriesInFlight` counts deliveries that have been ADMITTED here and are executing
      * outside this lock, on the drain thread or (for the unlimited inline shortcut) on the
      * offering thread.
      */
    private var deliveriesPaused = false
    private var deliveriesInFlight = 0

    def isDeliveryPaused: Boolean = synchronized(deliveriesPaused)

    /** Admit the next delivery of a drain batch, or refuse it because the session is paused.
      * Refusing leaves the item for the caller to requeue - see [[DeliveryRateLimiter.tick]]. */
    def beginDelivery(): Boolean = synchronized {
        if deliveriesPaused then false
        else
            deliveriesInFlight += 1
            true
    }

    /** One admitted delivery has finished - whether it succeeded, threw, or was skipped. */
    def endDelivery(): Unit = synchronized {
        deliveriesInFlight -= 1
        if deliveriesInFlight <= 0 then notifyAll()
    }

    /** Stop deliveries and WAIT FOR THE BOUNDARY: no delivery may start after this returns, and
      * every delivery already admitted has finished. Answers whether it reached that boundary.
      *
      * `reentrant` is the delivery budget's case - `sendPrepared` pauses the drain from INSIDE the
      * send that spent the last unit, on the delivery thread itself, and waiting there would be a
      * thread waiting for its own completion. The flag is still set (the rest of the batch is
      * refused, which is exactly the budget's contract); only the wait is skipped.
      *
      * BOUNDED, and deliberately by the WALL clock rather than by this class's injected `nowMs`:
      * `nowMs` is the rate bucket's clock and the tests hand-crank it, while this is a safety bound
      * on a delivery that has stopped making progress at all - a user filter in an infinite loop,
      * a transport that will not take the write. Expiring means the pause is not linearized against
      * that one delivery; the alternative is holding a gRPC thread for the life of the process.
      */
    def pauseDeliveries(reentrant: Boolean, timeoutMs: Long): Boolean = synchronized {
        deliveriesPaused = true
        if reentrant then true
        else
            val deadlineNanos = java.lang.System.nanoTime() + timeoutMs * 1_000_000L
            var remainingMs = timeoutMs
            while deliveriesInFlight > 0 && remainingMs > 0 do
                wait(remainingMs)
                remainingMs = (deadlineNanos - java.lang.System.nanoTime()) / 1_000_000L
            deliveriesInFlight <= 0
    }

    def resumeDeliveries(): Unit = synchronized { deliveriesPaused = false }

    def setRate(newRatePerSecond: Long): Unit = synchronized {
        ratePerSecond = newRatePerSecond
        tokens = newRatePerSecond.toDouble
        lastRefillAtMs = nowMs()
    }

    /** True while a DELIVERY BUDGET is armed. The budget is counted downstream (at the send, where
      * "loaded" is decided), but it needs every message to pass through the QUEUE: the inline
      * unlimited shortcut hands the message to processing on the calling thread, past any chance
      * of stopping the batch behind the one that spent the last unit.
      */
    private var forceQueue: Boolean = false

    def setForceQueue(force: Boolean): Unit = synchronized { forceQueue = force }

    def rate: Long = synchronized(ratePerSecond)
    def queuedCount: Int = synchronized(queue.size)
    def queuedBytesCount: Long = synchronized(queuedBytes)

    /** Put back what a drain took but did not process - the tail behind a delivery budget that ran
      * out mid-batch. FRONT of the queue, order intact, and the tokens they were charged handed
      * back: they were never delivered, and the next resume must find them exactly where they were.
      */
    def requeueFront(items: Vector[A]): Unit = synchronized {
        queue.prependAll(items)
        queuedBytes += items.map(payloadBytesOf).sum
        if ratePerSecond > 0 then tokens = math.min(ratePerSecond.toDouble, tokens + items.size)
    }

    /** What [[offer]] told the caller to do. `processNow` and `scheduleDrainAfterMs` are mutually
      * exclusive; `queuedCount` is the size AFTER this offer, for the caller's watermark check. */
    final case class OfferOutcome(processNow: Boolean, queuedCount: Int, scheduleDrainAfterMs: Option[Long])

    def offer(a: A, forceQueueOnce: Boolean = false): OfferOutcome = synchronized {
        // Unlimited and nothing queued and nobody mid-drain: the message may go straight through on
        // the calling thread - byte-for-byte the unlimited path. Any backlog forces the queue, so
        // a flush after a rate change cannot be overtaken - and so does an armed delivery budget,
        // which has to be able to stop the line BETWEEN messages, and a caller-supplied reason
        // (the wrapper passes "the user has the session paused").
        // `!deliveriesPaused` is part of the SAME critical section as the admission below, not a
        // flag the caller read a moment ago: an inline delivery admitted just after a Pause
        // returned is a message sent into a session the user had stopped.
        if ratePerSecond == 0 && !forceQueue && !forceQueueOnce && !deliveriesPaused && queue.isEmpty && !drainInProgress then
            deliveriesInFlight += 1
            OfferOutcome(processNow = true, 0, None)
        else
            queue.append(a)
            queuedBytes += payloadBytesOf(a)
            val schedule = if !drainScheduled && !drainInProgress then
                drainScheduled = true
                Some(nextDrainDelayMs)
            else None
            OfferOutcome(processNow = false, queue.size, schedule)
    }

    /** Take the batch this tick has earned. Refills the bucket from the elapsed clock, spends it,
      * and caps the batch so one tick never monopolizes the drainer thread. */
    def beginDrain(): Vector[A] = synchronized {
        drainScheduled = false
        drainInProgress = true
        refill()
        val earned =
            if ratePerSecond == 0 then queue.size
            else math.min(tokens.toLong, queue.size.toLong).toInt
        val take = math.min(earned, deliveryRateLimitMaxDrainBatch)
        if ratePerSecond > 0 then tokens -= take
        val batch = Vector.fill(take)(queue.removeHead())
        queuedBytes = (queuedBytes - batch.map(payloadBytesOf).sum) max 0L
        batch
    }

    /** The batch is processed; decide what happens next. `rescheduleAfterMs` is set while a backlog
      * remains, sized by how long the next token takes to arrive. */
    final case class FinishOutcome(queuedCount: Int, rescheduleAfterMs: Option[Long])

    def finishDrain(): FinishOutcome = synchronized {
        drainInProgress = false
        val reschedule = if queue.nonEmpty then
            drainScheduled = true
            Some(nextDrainDelayMs)
        else None
        FinishOutcome(queue.size, reschedule)
    }

    /** A tick fired while draining was paused: the timer is consumed, so the flag it represents
      * must be handed back or no future offer would ever arm another. */
    def cancelScheduledDrain(): Unit = synchronized { drainScheduled = false }

    /** Take one delivery token if the bucket has one - the pacing primitive the GUARANTEED
      * pump uses instead of the queue (queueing after the ordering decision would break its
      * deliver-then-advance barrier). Unlimited (rate 0) always answers true. */
    def tryAcquireDeliveryToken(): Boolean = synchronized {
        refill()
        if ratePerSecond == 0 then true
        else if tokens >= 1.0 then
            tokens -= 1
            true
        else false
    }

    /** Hand back ONE delivery token - the guaranteed pump's failed-send refund. The send never
      * took, so the message never left the merge and its retry must not be charged a second
      * token for the same delivery; mirrors [[requeueFront]]'s refund on the queued path.
      * Clamped at the bucket size, and a no-op when unlimited (nothing was acquired). */
    def returnDeliveryToken(): Unit = synchronized {
        if ratePerSecond > 0 then tokens = math.min(ratePerSecond.toDouble, tokens + 1.0)
    }

    /** Re-arm after a pause ended. Answers the delay to schedule, or None when there is nothing
      * queued or a timer is already armed. */
    def rearmDrain(): Option[Long] = synchronized {
        if queue.nonEmpty && !drainScheduled && !drainInProgress then
            drainScheduled = true
            Some(nextDrainDelayMs)
        else None
    }

    /** Empty the queue - the session is stopping and these deliveries are moot. */
    def clear(): Unit = synchronized {
        queue.clear()
        queuedBytes = 0L
        drainScheduled = false
    }

    private def refill(): Unit =
        val now = nowMs()
        if ratePerSecond > 0 then
            val earned = (now - lastRefillAtMs).max(0).toDouble / 1000.0 * ratePerSecond
            tokens = math.min(ratePerSecond.toDouble, tokens + earned)
        lastRefillAtMs = now

    /** How long until the next token is worth waking up for. Zero when a whole token is already
      * banked; otherwise the exact wait, floored so a high rate coalesces into batches instead of
      * waking per message. The floor costs no throughput - tokens accrue while asleep and the next
      * batch is larger by exactly the wait.
      */
    private def nextDrainDelayMs: Long =
        refill()
        if ratePerSecond == 0 || tokens >= 1.0 then 0L
        else
            val exact = math.ceil((1.0 - tokens) * 1000.0 / ratePerSecond.toDouble).toLong
            math.max(exact, deliveryRateLimitMinRescheduleDelayMs)

/** One drain never processes more than this, so a fat bucket (high rate or a long sleep) cannot
  * hold the drainer - and with it the session's single JS context - for an unbounded stretch. The
  * remainder reschedules at delay zero. */
val deliveryRateLimitMaxDrainBatch = 500

/** The floor under drain wake-ups. At 1000/s the exact next-token wait is 1ms; waking per token
  * would burn a thread on timers, so waits are coalesced and the batch grows to match. */
val deliveryRateLimitMinRescheduleDelayMs = 25L

/** Backlog size above which the session stops ASKING the broker for more - `Consumer.pause()`, the
  * permits half of flow control. One receiverQueueSize (2000), because that is the burst a pause
  * cannot prevent anyway: whatever was prefetched still arrives after it. */
val deliveryRateLimitHoldPermitsAboveQueued = 2000

/** Backlog size below which the permits are released again. The gap to the hold mark is the
  * hysteresis that keeps a hovering queue from flapping pause/resume at the broker. */
val deliveryRateLimitReleasePermitsBelowQueued = 500

/** Queued payload BYTES above which permits are held whatever the count says - the fat-message
  * half of the same backpressure. 2000 queued 5 MB payloads is 10 GB the count watermark calls
  * fine; this one does not. */
val deliveryRateLimitHoldPermitsAboveQueuedBytes: Long = 128L * 1024 * 1024

/** Queued-bytes mark below which the byte hold lets go - hysteresis, like the count pair. */
val deliveryRateLimitReleasePermitsBelowQueuedBytes: Long = 32L * 1024 * 1024

/** THE ABSOLUTE CEILING on the paced backlog - twice the hold watermark, in both dimensions, and
  * the point at which memory safety outranks every reason not to apply backpressure.
  *
  * The ordinary hold at [[deliveryRateLimitHoldPermitsAboveQueued]] can legitimately be REFUSED:
  * a counted start-from still waiting for a stream's next message must not have that stream's
  * permits held, because a throttled-quiet stream is indistinguishable from the silent stream the
  * merge gives up on after 30 seconds. That refusal is a correctness protection, and it is bounded
  * here rather than open-ended: once the backlog is twice the watermark the hold is applied to
  * every stream regardless, because a degraded start-from cut is disclosed to the user
  * (`degraded` / `abandonedStreams`) while an unbounded queue is a dead process.
  *
  * Nothing is dropped, nacked or blocked when this fires - a permit hold only stops ASKING the
  * broker for more, so the messages stay on the broker, unacknowledged, and arrive once the
  * backlog drains. The gap to the watermark is the room the resolution gets to finish first.
  */
val deliveryRateLimitForceHoldPermitsAboveQueued = 2 * deliveryRateLimitHoldPermitsAboveQueued

/** The byte twin of [[deliveryRateLimitForceHoldPermitsAboveQueued]] - fat payloads reach the
  * ceiling on bytes long before they reach it on count. */
val deliveryRateLimitForceHoldPermitsAboveQueuedBytes: Long = 2 * deliveryRateLimitHoldPermitsAboveQueuedBytes

/** How long after a FAILED permit release its retry fires. Without it, a release that failed once
  * on a drained queue was never retried - no messages means no crossings means no ticks - and the
  * consumers stayed paused until the user manually cycled the session. */
val deliveryRateLimitReleaseRetryDelayMs: Long = 200L

/** How long Pause waits for an already-admitted delivery to finish before giving up on
  * linearizing against it - see [[DeliveryRateLimiterCore.pauseDeliveries]]. Generous against any
  * ordinary send (a JS filter chain and one gRPC write), short against a delivery that has stopped
  * making progress at all, which is the only thing this bound exists for. */
val deliveryPauseQuiesceTimeoutMs: Long = 5_000L

/** The impure shell around [[DeliveryRateLimiterCore]]: it owns the timer, runs the processing, and
  * turns the queue's watermarks into consumer permit holds.
  *
  * THE CALLBACKS RUN OUTSIDE THE CORE'S LOCK, every one of them. `process` leases the session's JS
  * context and takes the send lock; `holdPermits`/`releasePermits` take the targets' permit locks.
  * Holding the limiter's own lock across any of those would nest it under locks it must never meet.
  *
  * PERMIT ARBITRATION. `holdPermits` answers whether it actually paused anything - the runner
  * refuses while start-from counting is still in flight (a throttled-quiet stream must not look
  * like a SILENT one to the merge's give-up) - and the held flag is only set when it really did.
  * A refused hold retries on the next offer, so backpressure engages the moment the refusal's
  * reason has passed. The hold itself lands on each consumer's pause ARBITER (reason Limiter),
  * so neither a user resume nor the merge releasing a hot stream can wake a consumer this
  * limiter still holds - the flag stays truthful without watching anybody else.
  */
final class DeliveryRateLimiter[A](
    val core: DeliveryRateLimiterCore[A],
    schedule: (Long, Runnable) => Unit,
    process: A => Unit,
    holdPermits: () => Boolean,
    releasePermits: () => Boolean,
    // The ceiling's escalation: hold EVERY stream, whatever the ordinary hook is currently
    // refusing to suppress. Refusing by default is inert for a limiter whose ordinary hold is
    // never refused - the ceiling is only ever reached once a hold has been declined.
    forceHoldPermits: () => Boolean = () => false
):
    private val logger: Logger = Logger(getClass.getName)

    /** Whether the ORDINARY watermark hold is applied. It can be a PARTIAL hold: the runner leaves
      * running any stream whose next message a counted start-from is still waiting for. */
    private val permitsHeld = AtomicBoolean(false)

    /** Whether the ABSOLUTE ceiling has forced a hold on every stream, suppression included.
      *
      * ITS OWN LATCH rather than [[permitsHeld]], because the two are not the same event: the
      * ordinary hold can be latched while some streams were deliberately left running, and those
      * are exactly the streams that can carry the backlog on to the ceiling afterwards.
      */
    private val permitsForceHeld = AtomicBoolean(false)

    /** Whether THIS THREAD is inside a delivery this limiter admitted.
      *
      * The delivery budget pauses the drain from inside the send that spends its last unit
      * ([[ConsumerSessionRunner]]'s `sendPrepared`), so the pause boundary below would otherwise
      * be a thread waiting for itself to finish. Thread-local rather than "the" delivery thread
      * because the unlimited inline path delivers on whichever listener thread offered.
      */
    private val inDelivery: ThreadLocal[java.lang.Boolean] = ThreadLocal.withInitial(() => java.lang.Boolean.FALSE)

    def offer(a: A, forceQueueOnce: Boolean = false): Unit =
        // NEVER inline while the user has the session paused: the unlimited fast path used to
        // process (and acknowledge) a message that arrived between the pause RPC returning and
        // its consumers actually stopping - delivery after pause, on the offering thread. The
        // core refuses it under its own lock and the queue takes it instead; resume drains it.
        // The CALLER's forceQueueOnce is the other reason never to run inline: an offer made
        // under the session's ordering lock (a live merge) must stay an enqueue, or the JS lease
        // and the gRPC write run inside that lock and a backpressured client parks every listener
        // thread - see [[ConsumerListener.deliver]].
        val outcome = core.offer(a, forceQueueOnce = forceQueueOnce)
        if outcome.processNow then runAdmittedDelivery(a)
        else
            val queuedBytes = core.queuedBytesCount
            if (outcome.queuedCount >= deliveryRateLimitHoldPermitsAboveQueued
                    || queuedBytes >= deliveryRateLimitHoldPermitsAboveQueuedBytes)
                && !permitsHeld.get
            then
                // CAS first so two crossing offers cannot double-pause; un-set on refusal so the
                // next offer retries once the refusal's reason (start-from still counting) is
                // gone. A refused AGGREGATE may still have paused SOME consumers (one target of
                // several threw), so the partial holds are rolled back - without this they sat
                // in their arbiters with the limiter believing it owned nothing, paused forever.
                if permitsHeld.compareAndSet(false, true) then
                    if !holdPermits() then
                        permitsHeld.set(false)
                        releasePermits()
                        ()
            // THE FINAL SAFETY NET, and deliberately independent of the latch above: the ordinary
            // hold is allowed to be refused, or to be applied to only SOME streams, while a
            // counted start-from still needs the rest running. Past the ceiling that allowance
            // ends - see [[deliveryRateLimitForceHoldPermitsAboveQueued]].
            if (outcome.queuedCount >= deliveryRateLimitForceHoldPermitsAboveQueued
                    || queuedBytes >= deliveryRateLimitForceHoldPermitsAboveQueuedBytes)
                && !permitsForceHeld.get
            then
                if permitsForceHeld.compareAndSet(false, true) then
                    if forceHoldPermits() then
                        // Per SESSION and once per crossing, not per message, and it means a
                        // maintainer-visible degradation really did happen: the session was
                        // pushing more than its limit could pace while its start position was
                        // still being resolved.
                        logger.warn(
                            s"A rate-limited consumer session's paced backlog reached ${outcome.queuedCount} messages / " +
                                s"$queuedBytes bytes, so broker flow control was applied to every stream even though a counted " +
                                "start-from was still resolving. The resolved start position may be reported as degraded."
                        )
                    else permitsForceHeld.set(false)
            outcome.scheduleDrainAfterMs.foreach(scheduleTick)

    /** STOP DELIVERING, AND DO NOT ANSWER UNTIL NOTHING IS STILL ON ITS WAY OUT.
      *
      * The wait is what makes a Pause the client can act on: without it the drain loop's flag read
      * and its delivery call were two steps, and a Pause landing between them returned OK while
      * that message was sent to the browser and acknowledged to the broker.
      */
    def pauseDraining(): Unit =
        val quiesced = core.pauseDeliveries(reentrant = inDelivery.get, timeoutMs = deliveryPauseQuiesceTimeoutMs)
        if !quiesced then
            // Maintainer-visible, once per pause and never per message: a delivery that outlasts
            // this bound is a stuck user filter or a transport that will not take the write, and
            // it means this pause is NOT linearized against that one message.
            logger.warn(
                s"A consumer session's delivery did not finish within ${deliveryPauseQuiesceTimeoutMs}ms of Pause, so the pause " +
                    "could not be linearized against it. That delivery may still reach the client."
            )

    def resumeDraining(): Unit =
        core.resumeDeliveries()
        core.rearmDrain().foreach(scheduleTick)
        // A FAILED permit release has no queue to ride back on: the re-arm above only schedules
        // when something is QUEUED, and the release only failed because the drain had just
        // emptied the queue. Retrying here is what stops a hold this limiter owns from outliving
        // the pause that swallowed its retry. The retry re-checks the watermark, so a hold that is
        // still EARNED is left exactly where it is.
        if permitsHeld.get || permitsForceHeld.get then scheduleReleaseRetry()

    def stop(): Unit =
        core.pauseDeliveries(reentrant = inDelivery.get, timeoutMs = deliveryPauseQuiesceTimeoutMs)
        core.clear()

    def queuedCount: Int = core.queuedCount

    /** Whether draining is paused right now (user pause, spent budget) - the guaranteed pump's
      * stop signal, since it bypasses the queue this flag normally guards. */
    def isDrainingPausedNow: Boolean = core.isDeliveryPaused

    /** See [[DeliveryRateLimiterCore.tryAcquireDeliveryToken]]. */
    def tryAcquireDeliveryToken(): Boolean = core.tryAcquireDeliveryToken()

    /** See [[DeliveryRateLimiterCore.returnDeliveryToken]] - the failed-send refund. */
    def returnDeliveryToken(): Unit = core.returnDeliveryToken()

    private def scheduleTick(delayMs: Long): Unit = schedule(delayMs, () => tick())

    private def tick(): Unit =
        if core.isDeliveryPaused then
            // The timer this tick consumed must not stay recorded as armed, or the backlog would
            // never get another one. Resume re-arms explicitly.
            core.cancelScheduledDrain()
            rearmIfResumedUnderneath()
        else
            val batch = core.beginDrain()
            // ADMITTED between items, not merely CHECKED between them. The delivery budget stops
            // the line from INSIDE a delivery, and a user pause can land at any instant; both need
            // the flag test and the delivery's claim on it to be one step, or a message decided a
            // moment before Pause is still sent and acknowledged a moment after it answered.
            // Everything behind the refusal goes back - untouched, unacknowledged, order intact -
            // to the front of the queue for the next resume.
            var processed = 0
            while processed < batch.size && core.beginDelivery() do
                runAdmittedDelivery(batch(processed))
                processed += 1
            if processed < batch.size then core.requeueFront(batch.drop(processed))
            val fin = core.finishDrain()
            if underReleaseWatermark && (permitsHeld.get || permitsForceHeld.get) then releaseHeldPermits()
            fin.rescheduleAfterMs.foreach { delay =>
                // A drain stopped by the budget leaves its backlog armed in the core; consuming
                // the reschedule without scheduling would strand it, so the armed flag is handed
                // back for the next resumeDraining to re-arm.
                if core.isDeliveryPaused then
                    core.cancelScheduledDrain()
                    rearmIfResumedUnderneath()
                else scheduleTick(delay)
            }

    /** THE OTHER HALF OF HANDING THE DRAIN FLAG BACK, and it is not optional.
      *
      * A Resume that lands between a tick DECIDING it is paused and that tick clearing the armed
      * flag calls `rearmDrain` while the flag still reads "armed", so it schedules nothing - and
      * the clear then removes the only timer the backlog had. Queue nonempty, no timer, and
      * nothing further is required to arrive: the backlog was stuck for good while the session
      * reported Running.
      *
      * Re-reading the flag AFTER the clear makes whoever runs last arm the backlog, under every
      * order, and never twice: `rearmDrain` refuses while a timer is already recorded.
      */
    private def rearmIfResumedUnderneath(): Unit =
        if !core.isDeliveryPaused then core.rearmDrain().foreach(scheduleTick)

    /** Whether the paced backlog is back under the marks at which the permits are handed back. */
    private def underReleaseWatermark: Boolean =
        core.queuedCount <= deliveryRateLimitReleasePermitsBelowQueued
            && core.queuedBytesCount <= deliveryRateLimitReleasePermitsBelowQueuedBytes

    /** Let go of every permit this limiter owns - the ordinary hold and the ceiling's forced one
      * together, since the release hook lets go of every stream either way.
      *
      * A FAILED release puts the flags back and arms a retry: a drained queue produces no further
      * crossings, so nothing else would ever notice, and the consumers would stay held until the
      * user cycled the session.
      */
    private def releaseHeldPermits(): Unit =
        val hadHold = permitsHeld.compareAndSet(true, false)
        val hadForcedHold = permitsForceHeld.compareAndSet(true, false)
        if (hadHold || hadForcedHold) && !releasePermits() then
            if hadHold then permitsHeld.set(true)
            if hadForcedHold then permitsForceHeld.set(true)
            scheduleReleaseRetry()

    /** THE RELEASE RETRY IS ITS OWN WORK, never a drain tick.
      *
      * Armed as a tick it was swallowed whole by a user pause - the paused branch hands the drain
      * flag back and returns - and Resume only re-arms a drain when the QUEUE is nonempty, which it
      * never is after the drain that failed the release. The Limiter's hold then sat on every
      * consumer for the rest of the session: no data, and no recovery from the user's Resume.
      */
    private def scheduleReleaseRetry(): Unit =
        schedule(deliveryRateLimitReleaseRetryDelayMs, () => retryPermitRelease())

    private def retryPermitRelease(): Unit =
        // Re-checked rather than assumed: by the time a retry fires the backlog may have crossed
        // the hold watermark again, and letting go then would be flapping rather than recovery.
        // Deliberately NOT gated on the user's pause - with per-reason arbitration releasing the
        // Limiter reason can never resume a consumer the User still holds.
        if (permitsHeld.get || permitsForceHeld.get) && underReleaseWatermark then releaseHeldPermits()

    /** Run a delivery the core has ADMITTED, and hand the admission back however it ends.
      *
      * The `finally` is the pause boundary's other half: a delivery that threw still has to release
      * the count, or Pause would wait out its whole timeout for a delivery that finished long ago.
      * The thread-local marks the reentrant case - see [[inDelivery]].
      */
    private def runAdmittedDelivery(a: A): Unit =
        inDelivery.set(java.lang.Boolean.TRUE)
        try runProtected(a)
        finally
            inDelivery.set(java.lang.Boolean.FALSE)
            core.endDelivery()

    /** One failing delivery must cost that delivery alone - the drain has a whole batch behind it,
      * and [[ConsumerListener.deliverNow]] already nacks its own failures. This is the same
      * per-message containment the resolved-batch loop learned in round 3, applied to the drainer. */
    private def runProtected(a: A): Unit =
        Try(process(a)).failed.foreach(err => logger.warn(s"A rate-limited delivery failed and was skipped. ${err.getMessage}"))
