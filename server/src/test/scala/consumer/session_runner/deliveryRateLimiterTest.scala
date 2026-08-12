package consumer.session_runner

import zio.test.*

import scala.collection.mutable.ArrayBuffer

/** The delivery rate limiter's decisions, driven with a hand-cranked clock and a hand-cranked
  * scheduler - no threads, no sleeps, every tick explicit.
  *
  * The properties worth pinning, in the order a message meets them: the bucket starts full so the
  * first screenful is instant; the sustained rate is exact over any window; order is the queue's
  * order under every interleaving; the watermarks fire their callbacks exactly once per crossing;
  * a refused permit hold retries instead of sticking; a user pause stops the drain without losing
  * the backlog; and one failing delivery costs exactly itself.
  */
object deliveryRateLimiterTest extends ZIOSpecDefault:

    /** A core with a manual clock. Tests advance `clock` and call the drain protocol by hand. */
    private final class ManualCore(initialRate: Long):
        var clock: Long = 0L
        val core = DeliveryRateLimiterCore[Int](nowMs = () => clock)
        core.setRate(initialRate)

    /** A limiter whose timer is a list: `runPending()` is the scheduler thread. Delays are recorded
      * so the pacing decisions themselves can be asserted. */
    private final class ManualLimiter(initialRate: Long, holdAnswers: Iterator[Boolean] = Iterator.continually(true)):
        var clock: Long = 0L
        val processed = ArrayBuffer[Int]()
        val scheduledDelays = ArrayBuffer[Long]()
        var holdCalls = 0
        var releaseCalls = 0
        var throwOn: Set[Int] = Set.empty

        private val pending = ArrayBuffer[Runnable]()

        val core = DeliveryRateLimiterCore[Int](nowMs = () => clock)
        val limiter = DeliveryRateLimiter[Int](
            core = core,
            schedule = (delayMs, task) => { scheduledDelays += delayMs; pending += task },
            process = i => { if throwOn.contains(i) then throw RuntimeException(s"boom on $i"); processed += i; () },
            holdPermits = () => { holdCalls += 1; holdAnswers.next() },
            releasePermits = () => { releaseCalls += 1; true }
        )
        core.setRate(initialRate)

        def runPending(): Unit =
            val tasks = pending.toVector
            pending.clear()
            tasks.foreach(_.run())

        def hasPending: Boolean = pending.nonEmpty

    def spec = suite("delivery rate limiter")(
        suite("the core's arithmetic")(
            test("the bucket starts FULL: the first second's worth drains at once") {
                // A session capped at 100/s that begins with "latest 50" paints all 50 immediately -
                // the user asked for exactly those. The cap shapes what follows, not the first paint.
                val m = ManualCore(100)
                (1 to 500).foreach(i => m.core.offer(i))
                val first = m.core.beginDrain()
                m.core.finishDrain()
                assertTrue(first == (1 to 100).toVector)
            },
            test("a returned delivery token refills the bucket by one, never past its size") {
                // The guaranteed pump's failed-send refund: the send never happened, so the
                // token it acquired must come back - and an over-refund must clamp at the
                // bucket, exactly like requeueFront's refund on the queued path.
                val m = ManualCore(1)
                val first = m.core.tryAcquireDeliveryToken()
                val exhausted = m.core.tryAcquireDeliveryToken()
                m.core.returnDeliveryToken()
                m.core.returnDeliveryToken() // a second refund must not bank a second token
                val afterRefund = m.core.tryAcquireDeliveryToken()
                val clamped = m.core.tryAcquireDeliveryToken()
                assertTrue(first, !exhausted, afterRefund, !clamped)
            },
            test("the sustained rate is EXACT: each elapsed second earns exactly the rate") {
                val m = ManualCore(100)
                (1 to 500).foreach(i => m.core.offer(i))
                m.core.beginDrain(); m.core.finishDrain() // the initial burst of 100

                val perSecond = (1 to 4).map { _ =>
                    m.clock += 1000
                    val batch = m.core.beginDrain()
                    m.core.finishDrain()
                    batch.size
                }
                assertTrue(perSecond == Vector(100, 100, 100, 100)) &&
                assertTrue(m.core.queuedCount == 0)
            },
            test("idle time cannot bank more than one second's burst") {
                val m = ManualCore(100)
                m.core.offer(0)
                m.core.beginDrain(); m.core.finishDrain()
                // A minute of silence, then a flood: the bucket is capped at the rate, so the first
                // drain answers with 100, not with 6000 saved-up tokens.
                m.clock += 60_000
                (1 to 300).foreach(i => m.core.offer(i))
                val batch = m.core.beginDrain()
                assertTrue(batch.size == 100)
            },
            test("FIFO: an offer made during a drain lands BEHIND everything queued") {
                val inline = ManualCore(0).core.offer(1)
                assertTrue(inline.processNow)

                // A backlog built under a limit, then the limit lifted MID-DRAIN: the unlimited
                // shortcut must still be refused while the drain is in flight, or the new message
                // would run concurrently with it and could overtake the batch into the session's
                // stateful filters.
                val m = ManualCore(5)
                (2 to 4).foreach(i => m.core.offer(i))
                val batch = m.core.beginDrain()
                m.core.setRate(0)
                val duringDrain = m.core.offer(5)
                m.core.finishDrain()
                assertTrue(!duringDrain.processNow) &&
                assertTrue(batch == Vector(2, 3, 4)) &&
                assertTrue(m.core.beginDrain() == Vector(5))
            },
            test("rate 0 with a backlog refuses the inline shortcut and flushes everything") {
                // The backlog exists because the rate was JUST lowered to 0 with messages queued: the
                // flush must stay ordered, so new offers join the queue until it has drained.
                val m = ManualCore(100)
                (1 to 150).foreach(i => m.core.offer(i))
                m.core.setRate(0)
                val outcome = m.core.offer(151)
                val flush = m.core.beginDrain()
                m.core.finishDrain()
                assertTrue(!outcome.processNow) && assertTrue(flush == (1 to 151).toVector)
            },
            test("one timer per backlog: a second offer never arms a second drain") {
                val m = ManualCore(10)
                val first = m.core.offer(1)
                val second = m.core.offer(2)
                assertTrue(first.scheduleDrainAfterMs.isDefined) &&
                assertTrue(second.scheduleDrainAfterMs.isEmpty)
            },
            test("a cancelled timer can be re-armed, and re-arming an armed one is refused") {
                val m = ManualCore(10)
                m.core.offer(1)
                m.core.cancelScheduledDrain()
                val rearmed = m.core.rearmDrain()
                val again = m.core.rearmDrain()
                assertTrue(rearmed.isDefined) && assertTrue(again.isEmpty)
            },
            test("the next-drain delay is the exact token wait, floored against timer churn") {
                // rate 100: the next token is 10ms away, but waking every 10ms burns a thread on
                // timers, so the wait is floored and the batch grows to match - the tokens keep
                // accruing while asleep, so the floor costs no throughput.
                val fast = ManualCore(100)
                (1 to 200).foreach(i => fast.core.offer(i))
                fast.core.beginDrain()
                val fastNext = fast.core.finishDrain().rescheduleAfterMs

                // rate 1: the exact wait (a full second) is what gets scheduled - no busy ticks.
                val slow = ManualCore(1)
                slow.core.offer(1); slow.core.offer(2)
                slow.core.beginDrain()
                val slowNext = slow.core.finishDrain().rescheduleAfterMs

                assertTrue(fastNext.contains(deliveryRateLimitMinRescheduleDelayMs)) &&
                assertTrue(slowNext.contains(1000L))
            },
            test("one drain is capped, and the remainder reschedules immediately") {
                // A fat bucket must not hold the drainer - and with it the session's single JS
                // context - for an unbounded stretch.
                val m = ManualCore(10_000)
                (1 to 2000).foreach(i => m.core.offer(i))
                val batch = m.core.beginDrain()
                val next = m.core.finishDrain().rescheduleAfterMs
                assertTrue(batch.size == deliveryRateLimitMaxDrainBatch) && assertTrue(next.contains(0L))
            }
        ),
        suite("the wrapper's side effects")(
            test("under a limit, nothing is processed at offer time; the drain releases FIFO") {
                val m = ManualLimiter(100)
                (1 to 5).foreach(m.limiter.offer(_))
                val beforeTick = m.processed.toVector
                m.runPending()
                assertTrue(beforeTick.isEmpty) && assertTrue(m.processed.toVector == (1 to 5).toVector)
            },
            test("unlimited passes straight through on the calling thread") {
                val m = ManualLimiter(0)
                (1 to 5).foreach(m.limiter.offer(_))
                assertTrue(m.processed.toVector == (1 to 5).toVector) && assertTrue(!m.hasPending)
            },
            test("the permit hold fires ONCE at the high watermark and releases ONCE at the low") {
                val m = ManualLimiter(1_000_000)
                (1 to deliveryRateLimitHoldPermitsAboveQueued + 50).foreach(m.limiter.offer(_))
                val holdsAfterCrossing = m.holdCalls
                // Drain it down; the bucket is huge, so only the per-tick cap bounds each batch.
                while m.core.queuedCount > 0 do m.runPending()
                assertTrue(holdsAfterCrossing == 1) &&
                assertTrue(m.holdCalls == 1) &&
                assertTrue(m.releaseCalls == 1) &&
                assertTrue(m.processed.size == deliveryRateLimitHoldPermitsAboveQueued + 50)
            },
            test("a REFUSED hold retries on the next offer - suppression must not stick") {
                // The runner refuses holds while a counted start-from is still resolving. When the
                // refusal's reason has passed, the very next crossing offer must re-assert the hold,
                // not believe a stale flag.
                val m = ManualLimiter(1_000_000, holdAnswers = Iterator(false, true))
                (1 to deliveryRateLimitHoldPermitsAboveQueued).foreach(m.limiter.offer(_))
                val afterRefusal = m.holdCalls
                m.limiter.offer(0)
                assertTrue(afterRefusal == 1) && assertTrue(m.holdCalls == 2)
            },
            test("a user pause stops the drain; resume re-arms it; the backlog survives both") {
                val m = ManualLimiter(100)
                (1 to 5).foreach(m.limiter.offer(_))
                m.limiter.pauseDraining()
                m.runPending() // the tick that was already armed fires into the pause and must no-op
                val processedWhilePaused = m.processed.toVector
                m.limiter.resumeDraining()
                m.runPending()
                assertTrue(processedWhilePaused.isEmpty) && assertTrue(m.processed.toVector == (1 to 5).toVector)
            },
            test("a throwing delivery costs exactly itself") {
                val m = ManualLimiter(100)
                m.throwOn = Set(2)
                (1 to 3).foreach(m.limiter.offer(_))
                m.runPending()
                assertTrue(m.processed.toVector == Vector(1, 3))
            },
            test("stop clears the backlog for good - re-arming afterwards delivers nothing") {
                val m = ManualLimiter(100)
                (1 to 5).foreach(m.limiter.offer(_))
                m.limiter.stop()
                m.limiter.resumeDraining()
                m.runPending()
                assertTrue(m.processed.isEmpty) && assertTrue(m.core.queuedCount == 0)
            },
            test("the held flag stays set until the limiter itself releases - nobody can stomp it any more") {
                // The old contract reset the flag on a user resume, because a user resume used to
                // wake every consumer wholesale. Holds now land on per-consumer pause ARBITERS
                // (reason Limiter), which a user resume cannot release - so the flag stays
                // truthful on its own, and a second crossing must NOT re-call the hold hook.
                val m = ManualLimiter(1_000_000)
                (1 to deliveryRateLimitHoldPermitsAboveQueued).foreach(m.limiter.offer(_))
                m.limiter.offer(0)
                assertTrue(m.holdCalls == 1)
            }
        ),
        suite("the delivery budget's machinery")(
            test("forceQueue closes the unlimited inline shortcut - a budget needs the queue") {
                val m = ManualCore(0)
                m.core.setForceQueue(true)
                val outcome = m.core.offer(1)
                assertTrue(!outcome.processNow) && assertTrue(m.core.queuedCount == 1)
            },
            test("requeueFront puts the unprocessed tail back AT THE HEAD, order intact, tokens refunded") {
                val m = ManualCore(10)
                (1 to 10).foreach(i => m.core.offer(i))
                val batch = m.core.beginDrain() // takes all 10, spends all 10 tokens
                m.core.finishDrain()
                // Pretend the budget stopped after 3: the remaining 7 go back untouched.
                m.core.requeueFront(batch.drop(3))
                // The refund matters: without it those 7 would be double-charged on the next drain.
                val next = m.core.beginDrain()
                assertTrue(batch.size == 10) && assertTrue(next == (4 to 10).toVector)
            },
            test("a stop DURING a drain delivers exactly up to the stop and requeues the rest in order") {
                // The wrapper checks the pause flag between items; the process callback itself
                // flips it at the third delivery - exactly what the runner's send-site budget does.
                var deliveredCount = 0
                val stopAt = 3
                val limiterHolder = scala.collection.mutable.ArrayBuffer[DeliveryRateLimiter[Int]]()
                val core = DeliveryRateLimiterCore[Int](nowMs = () => 0L)
                val pending = scala.collection.mutable.ArrayBuffer[Runnable]()
                val processed = scala.collection.mutable.ArrayBuffer[Int]()
                val limiter = DeliveryRateLimiter[Int](
                    core = core,
                    schedule = (_, task) => { pending += task; () },
                    process = i => {
                        processed += i
                        deliveredCount += 1
                        if deliveredCount == stopAt then limiterHolder.head.pauseDraining()
                    },
                    holdPermits = () => true,
                    releasePermits = () => true
                )
                limiterHolder += limiter
                core.setRate(100)
                (1 to 10).foreach(limiter.offer(_))
                pending.toVector.foreach(_.run()); pending.clear()

                val afterStop = processed.toVector
                // Resume: the tail is exactly where it was, and drains in order.
                limiter.resumeDraining()
                pending.toVector.foreach(_.run()); pending.clear()

                assertTrue(afterStop == Vector(1, 2, 3)) &&
                assertTrue(processed.toVector == (1 to 10).toVector)
            }
        )
    )
