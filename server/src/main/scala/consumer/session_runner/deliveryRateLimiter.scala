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
  * Rejecting instead of queueing would nack, and a sustained rate limit built on nacks is the
  * ~100ms redelivery storm the round-3 review put a bound on, recreated deliberately.
  *
  * ORDER IS THE QUEUE'S ORDER, ALWAYS. Merge-ordered sessions enqueue under the ordering lock, so
  * the queue holds the merge's decision order; the single drainer releases FIFO; and while a drain
  * is in flight or a backlog exists, nothing is processed inline - `drainInProgress` closes the
  * window in which a later message could overtake a queued one into the stateful session filters.
  *
  * The core is deliberately free of threads and clocks: the wrapper below owns scheduling and side
  * effects, this class owns every decision, and the tests drive it with a hand-cranked clock.
  */
final class DeliveryRateLimiterCore[A](nowMs: () => Long):
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

    /** True from the moment a drain is scheduled until [[beginDrain]] hands its batch out, so a
      * second timer is never armed for the same backlog. */
    private var drainScheduled = false

    /** True between [[beginDrain]] and [[finishDrain]], i.e. while the wrapper is processing a
      * batch OUTSIDE this lock. Inline processing is refused while it is set - see the class note
      * on ordering. */
    private var drainInProgress = false

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

    /** Put back what a drain took but did not process - the tail behind a delivery budget that ran
      * out mid-batch. FRONT of the queue, order intact, and the tokens they were charged handed
      * back: they were never delivered, and the next resume must find them exactly where they were.
      */
    def requeueFront(items: Vector[A]): Unit = synchronized {
        queue.prependAll(items)
        if ratePerSecond > 0 then tokens = math.min(ratePerSecond.toDouble, tokens + items.size)
    }

    /** What [[offer]] told the caller to do. `processNow` and `scheduleDrainAfterMs` are mutually
      * exclusive; `queuedCount` is the size AFTER this offer, for the caller's watermark check. */
    final case class OfferOutcome(processNow: Boolean, queuedCount: Int, scheduleDrainAfterMs: Option[Long])

    def offer(a: A): OfferOutcome = synchronized {
        // Unlimited and nothing queued and nobody mid-drain: the message may go straight through on
        // the calling thread - byte-for-byte the unlimited path. Any backlog forces the queue, so
        // a flush after a rate change cannot be overtaken - and so does an armed delivery budget,
        // which has to be able to stop the line BETWEEN messages.
        if ratePerSecond == 0 && !forceQueue && queue.isEmpty && !drainInProgress then OfferOutcome(processNow = true, 0, None)
        else
            queue.append(a)
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
        Vector.fill(take)(queue.removeHead())
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
  * reason has passed. [[onConsumersExternallyResumed]] resets the flag when a user resume has
  * overridden the hold underneath us, so the next crossing re-asserts it instead of believing it
  * still holds.
  */
final class DeliveryRateLimiter[A](
    val core: DeliveryRateLimiterCore[A],
    schedule: (Long, Runnable) => Unit,
    process: A => Unit,
    holdPermits: () => Boolean,
    releasePermits: () => Unit
):
    private val logger: Logger = Logger(getClass.getName)

    private val permitsHeld = AtomicBoolean(false)

    /** Set while the USER has the session paused: ticks fall through and nothing is processed, so
      * a paused session delivers nothing - the queue simply waits, unacknowledged, for resume. */
    private val drainingPaused = AtomicBoolean(false)

    def offer(a: A): Unit =
        val outcome = core.offer(a)
        if outcome.processNow then runProtected(a)
        else
            if outcome.queuedCount >= deliveryRateLimitHoldPermitsAboveQueued && !permitsHeld.get then
                // CAS first so two crossing offers cannot double-pause; un-set on refusal so the
                // next offer retries once the refusal's reason (start-from still counting) is gone.
                if permitsHeld.compareAndSet(false, true) then
                    if !holdPermits() then permitsHeld.set(false)
            outcome.scheduleDrainAfterMs.foreach(scheduleTick)

    def pauseDraining(): Unit = drainingPaused.set(true)

    def resumeDraining(): Unit =
        drainingPaused.set(false)
        core.rearmDrain().foreach(scheduleTick)

    /** The user resumed the session, which resumed every consumer regardless of any hold this limiter
      * had placed. Believe the world, not the flag. */
    def onConsumersExternallyResumed(): Unit = permitsHeld.set(false)

    def stop(): Unit =
        drainingPaused.set(true)
        core.clear()

    def queuedCount: Int = core.queuedCount

    private def scheduleTick(delayMs: Long): Unit = schedule(delayMs, () => tick())

    private def tick(): Unit =
        if drainingPaused.get then
            // The timer this tick consumed must not stay recorded as armed, or the backlog would
            // never get another one. Resume re-arms explicitly.
            core.cancelScheduledDrain()
            ()
        else
            val batch = core.beginDrain()
            // Checked BETWEEN items, because the delivery budget stops the line from INSIDE a
            // delivery: the send that spends the last unit flips the flag before it returns, and
            // everything behind it in this batch must go back - untouched, unacknowledged, order
            // intact - to the front of the queue for the next resume.
            var processed = 0
            while processed < batch.size && !drainingPaused.get do
                runProtected(batch(processed))
                processed += 1
            if processed < batch.size then core.requeueFront(batch.drop(processed))
            val fin = core.finishDrain()
            if fin.queuedCount <= deliveryRateLimitReleasePermitsBelowQueued && permitsHeld.get then
                if permitsHeld.compareAndSet(true, false) then releasePermits()
            fin.rescheduleAfterMs.foreach { delay =>
                // A drain stopped by the budget leaves its backlog armed in the core; consuming
                // the reschedule without scheduling would strand it, so the armed flag is handed
                // back for the next resumeDraining to re-arm.
                if drainingPaused.get then core.cancelScheduledDrain() else scheduleTick(delay)
            }

    /** One failing delivery must cost that delivery alone - the drain has a whole batch behind it,
      * and [[ConsumerListener.deliverNow]] already nacks its own failures. This is the same
      * per-message containment the resolved-batch loop learned in round 3, applied to the drainer. */
    private def runProtected(a: A): Unit =
        Try(process(a)).failed.foreach(err => logger.warn(s"A rate-limited delivery failed and was skipped. ${err.getMessage}"))
