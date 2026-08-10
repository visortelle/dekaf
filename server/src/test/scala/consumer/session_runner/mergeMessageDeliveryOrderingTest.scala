package consumer.session_runner

import zio.test.*

/** Cross-topic continuous delivery ordering, pinned without a broker.
  *
  * The contract is BOUNDED LATENESS, never blocked delivery, and it rests on two rules:
  *
  *   - ORDER-SAFE FAST PATH: a head is emitted at once when every silent stream has already
  *     offered something at or past its selected time.
  *   - BOUNDED RESIDENCE: otherwise it waits, but never past the grace measured on the merge's
  *     own MONOTONIC clock from its own arrival. The selected timestamp comes from outside the
  *     session, so it is never compared against any clock of ours - a future-dated head must cost
  *     at most the grace, exactly like everything else.
  *
  * Late arrivals - anything ordered before what already went out - are emitted immediately, out
  * of order, and counted; a redelivery of a message whose delivery FAILED is one of them, never
  * a duplicate to swallow. Time is injected and moves only when a test says so.
  */
object mergeMessageDeliveryOrderingTest extends ZIOSpecDefault:

    private val a = "cs@persistent://public/default/topic-a"
    private val b = "cs@persistent://public/default/topic-b"

    private val graceMs = 500L

    /** Drain the guaranteed barrier: peek+commit until nothing is safe - the unit-level stand-in
      * for the listener's delivery pump, with every send succeeding. */
    private def pumpAll(f: Fixture): Vector[String] =
        val out = Vector.newBuilder[String]
        var going = true
        while going do
            f.merge.peekGuaranteed() match
                case Some(v) => out += v; f.merge.commitGuaranteed()
                case None    => going = false
        out.result()

    private final class TestClock:
        var monoMs: Long = 0L
        def advance(ms: Long): Unit = monoMs += ms

    private final class Fixture(
        streamIds: Vector[String],
        budget: Long = 0,
        withRecordedEnds: Boolean = false,
        policyOverride: Option[OrderingPolicy] = None
    ):
        val clock = TestClock()
        private var nextEntryId = Map.empty[String, Long].withDefaultValue(0L)
        val merge = GlobalSkipMerge[String](
            streamIds = streamIds,
            drainedAtStart = Set.empty,
            discard = StartFromDiscard.shared(budget),
            nowMs = () => clock.monoMs,
            graceMs = graceMs,
            policy = policyOverride.getOrElse(
                if withRecordedEnds then OrderingPolicy.ExactCutThenBestEffort else OrderingPolicy.BestEffortOnly
            )
        )
        private val out = Vector.newBuilder[(String, StartFromOutcome)]

        def offer(streamId: String, publishTime: Long, value: String, atEnd: Boolean = false): Unit =
            val entryId = nextEntryId(streamId)
            nextEntryId = nextEntryId.updated(streamId, entryId + 1)
            offerAt(streamId, publishTime, entryId, value, atEnd)

        /** Offer with an EXPLICIT entry id - how a broker redelivery is reproduced (same entry,
          * same publish time, second arrival). `knownFailedRetry` is the listener's explicit
          * lifecycle fact - only it licenses delivering a watermarked copy. */
        def offerAt(streamId: String, publishTime: Long, entryId: Long, value: String, atEnd: Boolean = false, knownFailedRetry: Boolean = false): Unit =
            val key = MessageOrderKey(publishTime, streamId, ledgerId = 1L, entryId = entryId, batchIndex = -1)
            out ++= merge.offer(streamId, key, atBacklogEnd = atEnd, payload = value, knownFailedRetry = knownFailedRetry)

        def sweep(): Unit = out ++= merge.sweepStalled()

        def noteResolved(resolved: (String, StartFromOutcome)): Unit = out += resolved

        def delivered: Vector[String] = out.result().collect { case (v, StartFromOutcome.Deliver) => v }
        def dropped: Vector[String] = out.result().collect { case (v, StartFromOutcome.Drop) => v }
        def requeued: Vector[String] = out.result().collect { case (v, StartFromOutcome.Requeue) => v }

    def spec = suite(this.getClass.toString)(
        test("a two-stream history replay comes out in GLOBAL publish-time order, never arrival order") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100") // b has never spoken: the startup hold keeps this in hand
            val heldThroughStartup = f.delivered.isEmpty
            f.offer(b, 50, "b-50") // both spoke: 50 emits; 100 waits - b has said nothing past it
            val afterFirstExchange = f.delivered
            f.offer(a, 200, "a-200") // a queues deeper; the merge still waits on b
            val stillPinned = f.delivered
            f.offer(b, 150, "b-150") // b moves past 100: 100 and 150 emit, 200 waits on b again
            val afterCatchUp = f.delivered
            f.offer(b, 250, "b-250") // b moves past 200: 200 emits, 250 now waits on a
            val nearTheEnd = f.delivered
            f.clock.advance(graceMs + 1) // a stays quiet: 250's own residence expires
            f.sweep()
            assertTrue(
                heldThroughStartup,
                afterFirstExchange == Vector("b-50"),
                stillPinned == Vector("b-50"),
                afterCatchUp == Vector("b-50", "a-100", "b-150"),
                nearTheEnd == Vector("b-50", "a-100", "b-150", "a-200"),
                f.delivered == Vector("b-50", "a-100", "b-150", "a-200", "b-250"),
                f.merge.heldCount == 0,
                f.merge.lateDeliveryCount == 0L // an ordered run has nothing to confess
            ) ?? s"delivered=${f.delivered} late=${f.merge.lateDeliveryCount}"
        },
        test("the startup hold releases after one grace even if a stream never speaks at all") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            val beforeGrace = f.delivered
            f.clock.advance(graceMs + 1)
            f.sweep() // the timer half: nothing else will ever call in
            assertTrue(beforeGrace.isEmpty, f.delivered == Vector("a-100"), f.merge.heldCount == 0)
        },
        test("a head nobody has spoken past waits its OWN residence out - that is the whole latency bill") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            f.offer(b, 90, "b-90")
            f.clock.advance(graceMs + 1)
            f.sweep()
            val historyDone = f.delivered
            f.offer(a, 300, "a-300") // b's newest word is 90: nothing proves 300 is safe
            val heldFresh = f.delivered == historyDone
            f.clock.advance(graceMs - 1)
            f.sweep()
            val heldJustUnderGrace = f.delivered == historyDone
            f.clock.advance(2)
            f.sweep()
            assertTrue(
                historyDone == Vector("b-90", "a-100"),
                heldFresh,
                heldJustUnderGrace, // the boundary is exact: one tick short still holds
                f.delivered == Vector("b-90", "a-100", "a-300")
            ) ?? s"delivered=${f.delivered}"
        },
        test("a FUTURE-DATED head cannot wedge its stream - producer clocks are nobody's to trust") {
            // Under a wall-clock release rule a head stamped ten minutes ahead sat pinned for ten
            // minutes. Residence does not care what the producer's clock said.
            val f = Fixture(Vector(a, b))
            f.offer(b, 50, "b-50")
            f.offer(a, 50 + 10 * 60 * 1000, "a-future")
            f.sweep()
            val heldWhileFresh = f.delivered
            f.clock.advance(graceMs + 1)
            f.sweep()
            assertTrue(
                heldWhileFresh == Vector("b-50"),
                f.delivered == Vector("b-50", "a-future"),
                f.merge.heldCount == 0
            ) ?? s"delivered=${f.delivered}"
        },
        test("timestamps running BACKWARD within one stream keep append order, and the dip is counted late") {
            val f = Fixture(Vector(a, b))
            f.offer(b, 60, "b-60")
            f.offer(a, 100, "a-100") // then a's producer clock steps back:
            f.offer(a, 90, "a-90")
            f.clock.advance(graceMs + 1)
            f.sweep()
            assertTrue(
                // b-60 first (both spoke), then a IN APPEND ORDER - 100 before 90 - never resorted.
                f.delivered == Vector("b-60", "a-100", "a-90"),
                f.merge.lateDeliveryCount == 1L // the dip is exactly one confessed disorder
            ) ?? s"delivered=${f.delivered} late=${f.merge.lateDeliveryCount}"
        },
        test("a stream released by the grace delivers LATE when it wakes - immediately, counted, nothing wedged") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            f.clock.advance(graceMs + 1) // b never spoke; the startup hold expires
            f.sweep()
            val emittedPastB = f.delivered
            f.offer(b, 80, "b-late") // older than what already went out: best effort, worn openly
            assertTrue(
                emittedPastB == Vector("a-100"),
                f.delivered == Vector("a-100", "b-late"),
                f.merge.heldCount == 0,
                f.merge.lateDeliveryCount == 1L
            ) ?? s"delivered=${f.delivered} late=${f.merge.lateDeliveryCount}"
        },
        test("THE LIFECYCLE OF A COPY IS EXPLICIT: only a listener-confirmed failure licenses redelivery") {
            // The two loss paths the old inferences opened, closed from both sides. A copy with
            // NO recorded failure is handed back whatever the queue says - the original may be
            // held, limiter-queued, mid-send, or acked-with-the-ack-in-flight. Only the
            // listener's explicit "this delivery failed" turns the next copy into the retry.
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            f.offer(b, 50, "b-50")
            f.clock.advance(graceMs + 1)
            f.sweep()
            val firstPass = f.delivered // both delivered once; nothing held

            // A copy WITHOUT a recorded failure: original left the merge, fate unknown - requeue.
            f.offerAt(a, 100, entryId = 0, value = "a-100-copy-unknown")
            // The listener then SAW the delivery fail; the next copy is the retry.
            f.offerAt(a, 100, entryId = 0, value = "a-100-retry", knownFailedRetry = true)

            // And a copy whose ORIGINAL is still held is handed back too - never acknowledged.
            f.offer(a, 300, "a-300") // held: b's newest word is 50, residence fresh
            f.offerAt(a, 300, entryId = 1, value = "a-300-copy")

            assertTrue(
                firstPass == Vector("b-50", "a-100"),
                f.delivered == Vector("b-50", "a-100", "a-100-retry"),
                f.requeued == Vector("a-100-copy-unknown", "a-300-copy"),
                f.dropped.isEmpty,
                f.merge.lateDeliveryCount >= 1L // the retry is late by definition
            ) ?? s"delivered=${f.delivered} requeued=${f.requeued} dropped=${f.dropped}"
        },
        test("skip-n WITH merge: the cut stays exact, and ordering simply refuses to stop afterwards") {
            val f = Fixture(Vector(a, b), budget = 3, withRecordedEnds = true)
            f.offer(a, 10, "a-10")
            f.offer(b, 20, "b-20")
            f.offer(a, 30, "a-30")
            f.offer(b, 40, "b-40", atEnd = true)
            f.offer(a, 50, "a-50", atEnd = true)
            val atTheCut = (f.dropped, f.delivered)
            // b-40 is out - the very offer of a-50 proved it order-safe (both streams have then
            // spoken at or past 40) - while a-50 itself still waits: b's newest word is 40, so
            // past the cut it is held like any other head, by its peers or its own residence.
            // The exact-cut knowledge is spent; the continuous rules govern.
            f.offer(a, 70, "a-70")
            val afterA70 = f.delivered // a queues deeper; nothing new is provably safe
            f.offer(b, 60, "b-60") // b speaks past 50: the exact path emits 50, then 60
            f.clock.advance(graceMs + 1)
            f.sweep() // a-70's residence expires
            assertTrue(
                atTheCut == (Vector("a-10", "b-20", "a-30"), Vector("b-40")),
                afterA70 == Vector("b-40"),
                f.delivered == Vector("b-40", "a-50", "b-60", "a-70"),
                !f.merge.isSettled,
                f.merge.heldCount == 0
            ) ?? s"dropped=${f.dropped} delivered=${f.delivered}"
        },
        test("the flow-control watermarks keep working after the cut - a hot stream nobody spoke past is paused") {
            val clock = TestClock()
            val merge = GlobalSkipMerge[String](
                streamIds = Vector(a, b),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => clock.monoMs,
                graceMs = graceMs,
                policy = OrderingPolicy.BestEffortOnly,
                pauseStreamAt = 5,
                resumeStreamAt = 1
            )
            def offer(streamId: String, publishTime: Long, entryId: Long): Vector[(String, StartFromOutcome)] =
                merge.offer(streamId, MessageOrderKey(publishTime, streamId, 1L, entryId, -1), atBacklogEnd = false, payload = s"$streamId-$publishTime")
            offer(b, 50, 0) // b speaks once, then stays silent: nothing may pass 50 un-aged
            (1 to 6).foreach(i => offer(a, 100 + i, i))
            val hotStreamPaused = merge.desiredPausedStreams.contains(a)
            offer(b, 5_000, 1) // b speaks far past a's queue: everything drains
            assertTrue(
                hotStreamPaused,
                merge.desiredPausedStreams.isEmpty,
                merge.heldCount == 1 // only b's own final head remains
            ) ?? s"desired=${merge.desiredPausedStreams} held=${merge.heldCount}"
        },
        test("an ordering-only layer never settles and never counts skip progress") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            f.offer(b, 50, "b-50")
            f.merge.settleIfDone()
            assertTrue(
                !f.merge.isSettled,
                f.merge.isContinuousOrdering,
                f.merge.progressDiscard.exists(_.remaining == 0)
            )
        },
        test("a NON-PERSISTENT stream - no knowable positions - merges in order, nothing swallowed as a duplicate") {
            // Non-persistent message ids carry no ledger/entry, so every one used to land at or
            // below the (-1,-1) watermark its first message recorded: swallowed as a duplicate
            // during a cut, or shunted down the late-retry path (instant, out of order) in
            // continuous mode - which is exactly how a mixed-persistency e2e caught it.
            val f = Fixture(Vector(a, b))
            // THE REAL SHAPE, measured against a broker: every non-persistent message arrives as
            // ledger 0, entry 0 - a plausible-looking position that never advances.
            val nonPersistentFqn = "non-persistent://public/default/topic-b"
            def offerUnpositioned(publishTime: Long, value: String): Unit =
                f.merge.offer(b, MessageOrderKey(publishTime, nonPersistentFqn, ledgerId = 0L, entryId = 0L, batchIndex = -1), atBacklogEnd = true, payload = value) match
                    case resolved => resolved.foreach(r => f.noteResolved(r))

            f.offer(a, 100, "a-100")
            offerUnpositioned(50, "b-50")
            offerUnpositioned(150, "b-150") // the message the watermark used to damn as a copy
            f.offer(a, 200, "a-200")
            offerUnpositioned(250, "b-250")
            f.clock.advance(graceMs + 1)
            f.sweep()

            assertTrue(
                f.dropped.isEmpty, // NOTHING is a duplicate on a stream that cannot have any
                f.delivered == Vector("b-50", "a-100", "b-150", "a-200", "b-250"),
                f.merge.lateDeliveryCount == 0L
            ) ?? s"delivered=${f.delivered} dropped=${f.dropped} late=${f.merge.lateDeliveryCount}"
        },
        test("EQUAL producer timestamps are never called order-safe - a tied head waits its residence out") {
            // A silent stream that offered THROUGH time t may offer another AT t (producer
            // timestamps are non-decreasing), and the documented tie-break could sort it first.
            // The floor is therefore STRICT: a tied candidate is not provably safe, so it waits -
            // and a tie is not a "late delivery" either, however the full key orders it.
            val f = Fixture(Vector(a, b))
            f.offer(b, 100, "b-100")
            f.offer(a, 100, "a-100") // both heads: the exact path emits a first (topic tie-break)
            val afterExactPair = f.delivered
            // b-100 remains: a is now the silent stream with lastOffered = 100, and 100 < 100
            // is false - the tie must not ride the fast path.
            val heldOnTie = f.delivered == afterExactPair && f.merge.heldCount == 1
            f.clock.advance(graceMs + 1)
            f.sweep()
            assertTrue(
                afterExactPair == Vector("a-100"),
                heldOnTie,
                f.delivered == Vector("a-100", "b-100"),
                f.merge.lateDeliveryCount == 0L // a millisecond tie is a tie-break, not disorder
            ) ?? s"delivered=${f.delivered} late=${f.merge.lateDeliveryCount}"
        },
        test("an IRREVERSIBLY LATE head skips the wait - no window can un-late it") {
            // Three streams; c speaks once and stays silent with a LOW floor, so nothing newer is
            // ever provably safe. a-100 goes out by residence; then b-50 arrives - already older
            // than what the user has seen. Holding it for another window would be pure latency
            // with zero ordering value: it must go out immediately, counted.
            val f = Fixture(Vector(a, b, "cs@persistent://public/default/topic-c"))
            f.offer("cs@persistent://public/default/topic-c", 10, "c-10")
            f.offer(a, 100, "a-100")
            f.offer(b, 60, "b-60") // all three spoke: startup hold ends; 60 and 100 wait on c's floor
            f.clock.advance(graceMs + 1)
            f.sweep() // residence releases c-10, b-60, a-100 in order
            val historyDone = f.delivered
            f.offer(b, 50, "b-late") // older than a-100, floor still blocked by silent c
            val emittedWithoutWaiting = f.delivered.lastOption.contains("b-late")
            assertTrue(
                historyDone == Vector("c-10", "b-60", "a-100"),
                emittedWithoutWaiting,
                f.merge.lateDeliveryCount == 1L
            ) ?? s"delivered=${f.delivered} late=${f.merge.lateDeliveryCount}"
        },
        test("A THOUSAND STREAMS, 99/1 SKEW: O(1) per message, bounded lateness, flow control engaged, zero disorder") {
            // The wide-session pin the review asked for, in COUNTED operations rather than wall
            // time (wall time flakes; operation counts do not). One hot stream pours 20,000
            // messages through a merge with 999 silent peers. If the emission gate were
            // O(silent streams) per message - the shape the cached-min fast path exists to
            // prevent - this run would read the clock tens of millions of times; O(1) keeps it
            // within a few reads per message.
            var clockReads = 0L
            var mono = 0L
            val streams = (0 until 1000).map(i => s"cs@persistent://public/default/wide-$i").toVector
            val merge = GlobalSkipMerge[String](
                streamIds = streams,
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => { clockReads += 1; mono },
                graceMs = graceMs,
                policy = OrderingPolicy.BestEffortOnly
            )
            val out = Vector.newBuilder[(String, StartFromOutcome)]
            var entry = Map.empty[String, Long].withDefaultValue(0L)
            def offer(id: String, t: Long, v: String): Unit =
                val e = entry(id); entry = entry.updated(id, e + 1)
                out ++= merge.offer(id, MessageOrderKey(t, id, 1L, e, -1), atBacklogEnd = false, payload = v)

            // Every peer speaks once (the startup hold ends with real floors everywhere)...
            val seeds = streams.indices.map(i => f"seed-$i%04d").toVector
            streams.zipWithIndex.foreach((id, i) => offer(id, 10L + i, seeds(i)))
            // ...then the hot stream pours 20,000 newer messages while 999 peers stay silent.
            val hot = streams.head
            val hotValues = (0 until 20_000).map(i => f"hot-$i%05d").toVector
            hotValues.zipWithIndex.foreach((v, i) => offer(hot, 5_000L + i, v))

            val heldAtPeak = merge.heldCount
            val hotPausedUnderPressure = merge.desiredPausedStreams.contains(hot)

            mono += graceMs + 1 // every residence expires; the sweep releases the world in order
            out ++= merge.sweepStalled()

            val delivered = out.result().collect { case (v, StartFromOutcome.Deliver) => v }
            assertTrue(
                // Everything held except exactly TWO exact-path emissions: the last seed's offer
                // makes every stream head-bearing once (silent set momentarily empty), releasing
                // seed-0; the first hot offer re-heads stream 0 and releases seed-1 the same way.
                // From then on stream 1 is the silent floor nobody has spoken past.
                heldAtPeak == 21_000 - 2,
                hotPausedUnderPressure, // the per-stream watermark asked for the hot source to pause
                delivered.size == 21_000,
                delivered == seeds ++ hotValues, // global publish-time order, end to end
                merge.desiredPausedStreams.isEmpty,
                merge.heldCount == 0,
                merge.lateDeliveryCount == 0L,
                clockReads < 21_000L * 10 // O(1) per message; the O(streams) shape would be ~21M
            ) ?? s"held=$heldAtPeak delivered=${delivered.size} clockReads=$clockReads late=${merge.lateDeliveryCount}"
        },
        test("GUARANTEED: a silent stream holds delivery FOREVER - no residence, no startup release, no give-up") {
            val f = Fixture(Vector(a, b), policyOverride = Some(OrderingPolicy.GuaranteedOnly))
            f.offer(a, 100, "a-100")
            f.clock.advance(graceMs * 100) // fifty seconds of silence: best-effort would have released long ago
            f.sweep()
            val heldThroughSilence = (f.delivered, f.merge.heldCount)
            val waitingAfterWarning = f.merge.stalledStreamCount
            f.offer(b, 50, "b-50") // b finally speaks: the exact rule emits b-50 - and ONLY it,
            val pumped = pumpAll(f) // because delivering it makes b silent again and a-100 must
            val stillHeld = f.merge.heldCount // wait for b's NEXT word. No compromises means this.
            val waitingAfterProgress = f.merge.stalledStreamCount
            f.offer(b, 150, "b-150") // b speaks past 100: a-100 is provably safe now
            val pumpedAfter = pumpAll(f)
            assertTrue(
                heldThroughSilence == (Vector.empty, 1),
                waitingAfterWarning == 1,
                pumped == Vector("b-50"),
                stillHeld == 1,
                waitingAfterProgress == 0,
                pumpedAfter == Vector("a-100"), // and b-150 now waits on silent a, in its turn
                f.merge.heldCount == 1,
                f.merge.lateDeliveryCount == 0L
            ) ?? s"held=$heldThroughSilence pumped=$pumped after=$pumpedAfter"
        },
        test("GUARANTEED: the hold is memory-BOUNDED - the ahead stream is paused at its watermark, the blind one never") {
            // The no-escape wait must not be a memory hole. When one stream races ahead while
            // another is headless, the ahead stream's backlog accumulates in the merge only up to
            // the same flow-control watermarks every other mode uses; past them its CONSUMER is
            // marked for pause until the barrier drains it. Delaying RECEIPT cannot violate the
            // order - only early emission could - so the backpressure costs the guarantee nothing.
            // The blind stream holds nothing and must never be paused: its next message is the
            // only thing that can unblock the barrier.
            val clock = TestClock()
            val merge = GlobalSkipMerge[String](
                streamIds = Vector(a, b),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => clock.monoMs,
                graceMs = graceMs,
                policy = OrderingPolicy.GuaranteedOnly,
                pauseStreamAt = 5,
                resumeStreamAt = 1
            )
            def offer(streamId: String, publishTime: Long, entryId: Long): Unit =
                merge.offer(streamId, MessageOrderKey(publishTime, streamId, 1L, entryId, -1), atBacklogEnd = false, payload = s"m-$publishTime")
                ()
            def drain(): Vector[String] =
                val out = Vector.newBuilder[String]
                var going = true
                while going do
                    merge.peekGuaranteed() match
                        case Some(v) => out += v; merge.commitGuaranteed()
                        case None    => going = false
                out.result()

            // b is blind; a races 6 deep - past the per-stream watermark of 5.
            (1 to 6).foreach(i => offer(a, 100L + i, i.toLong))
            val aheadPausedAtWatermark = merge.desiredPausedStreams
            val heldAtPeak = merge.heldCount

            // b speaks far past a's queue: the barrier drains everything a held, in order, and
            // the drain releases the pause marks.
            offer(b, 5_000L, 0L)
            val delivered = drain()

            assertTrue(
                aheadPausedAtWatermark == Set(a), // the ahead stream is held still, the blind one runs
                heldAtPeak == 6,
                delivered == (1 to 6).map(i => s"m-${100 + i}").toVector,
                merge.desiredPausedStreams.isEmpty, // the drain released the backpressure
                merge.heldCount == 1 // b-5000 now waits on drained a, in its turn
            ) ?? s"paused=$aheadPausedAtWatermark delivered=$delivered desired=${merge.desiredPausedStreams}"
        },
        test("GUARANTEED: the barrier retries the SAME head in place - a failed send costs latency, never order") {
            val f = Fixture(Vector(a, b), policyOverride = Some(OrderingPolicy.GuaranteedOnly))
            f.offer(a, 100, "a-100")
            f.offer(b, 50, "b-50")
            // First attempt at the safe head (b-50) fails: commit never happens.
            val peeked1 = f.merge.peekGuaranteed()
            f.merge.abortGuaranteed()
            val heldAfterFailure = f.merge.heldCount
            // The retry sees the SAME head; only success advances.
            val peeked2 = f.merge.peekGuaranteed()
            f.merge.commitGuaranteed()
            // Delivering b-50 makes b silent again: a-100 is NOT provably safe and must wait -
            // the same no-escape rule, seen through the barrier.
            val peeked3 = f.merge.peekGuaranteed()
            assertTrue(
                peeked1.contains("b-50"),
                heldAfterFailure == 2, // nothing left the merge on failure
                peeked2.contains("b-50"),
                peeked3.isEmpty,
                f.merge.heldCount == 1,
                f.merge.lateDeliveryCount == 0L // retried in place = never late
            ) ?? s"p1=$peeked1 p2=$peeked2 p3=$peeked3"
        },
        test("GUARANTEED: a copy of the in-flight head is requeued, never a second delivery") {
            val f = Fixture(Vector(a, b), policyOverride = Some(OrderingPolicy.GuaranteedOnly))
            f.offer(a, 100, "a-100")
            f.offer(b, 50, "b-50")
            val peeked = f.merge.peekGuaranteed() // b-50 is in flight
            f.offerAt(b, 50, entryId = 0, value = "b-50-copy") // unload redelivery meanwhile
            f.merge.commitGuaranteed()
            assertTrue(
                peeked.contains("b-50"),
                f.requeued == Vector("b-50-copy"),
                f.delivered.isEmpty // barrier deliveries do not flow through offer resolutions
            ) ?? s"requeued=${f.requeued}"
        },
        test("GUARANTEED after a skip cut: the cut stays exact, then the REPLAY completes at the recorded ends") {
            // FLIPPED PIN (owner decision 2026-08-09, the exact-replay redesign): this cell used
            // to assert that the barrier re-armed EVERY stream after the cut and held the tail
            // forever. Under the replay contract a stream that reached its recorded end is
            // FINISHED, so once both streams have, the remaining heap drains in key order - the
            // last message included - and the merge reports the chunk caught up.
            val f = Fixture(Vector(a, b), budget = 3, withRecordedEnds = true, policyOverride = Some(OrderingPolicy.ExactCutThenGuaranteed))
            f.offer(a, 10, "a-10")
            f.offer(b, 20, "b-20")
            f.offer(a, 30, "a-30")
            f.offer(b, 40, "b-40", atEnd = true)
            val caughtUpMidReplay = f.merge.isReplayCaughtUp // a's end is still outstanding
            f.offer(a, 50, "a-50", atEnd = true)
            val cut = f.dropped
            // Every recorded end is in hand: the barrier drains the whole heap - no held tail.
            val pumped = pumpAll(f)
            assertTrue(
                cut == Vector("a-10", "b-20", "a-30"),
                !caughtUpMidReplay,
                pumped == Vector("b-40", "a-50"),
                f.merge.heldCount == 0,
                f.merge.isReplayCaughtUp, // the caller's cue to auto-pause and signal
                !f.merge.isSettled // continuous ordering still never settles
            ) ?? s"cut=$cut pumped=$pumped held=${f.merge.heldCount} caughtUp=${f.merge.isReplayCaughtUp}"
        },
        test("GUARANTEED: EQUAL publish times resolve IMMEDIATELY by the documented tiebreak - topic, then log position") {
            // Batching is the producer default, so tied timestamps are the production norm - and
            // Guaranteed is the mode chosen precisely for exact order. A tie must resolve NOW
            // (no residence wait exists in this mode, and none may be invented for ties) and
            // DETERMINISTICALLY, by the documented total order: publish time, then topic FQN,
            // then (ledger, entry, batch index). The stream ids are deliberately ordered AGAINST
            // the topic order, so any fallback to heap/stream-id order goes red here.
            def guaranteedMerge(streams: Vector[String]) = GlobalSkipMerge[String](
                streamIds = streams,
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => 0L,
                graceMs = graceMs,
                policy = OrderingPolicy.GuaranteedOnly
            )
            def drain(merge: GlobalSkipMerge[String]): Vector[String] =
                val out = Vector.newBuilder[String]
                var going = true
                while going do
                    merge.peekGuaranteed() match
                        case Some(v) => out += v; merge.commitGuaranteed()
                        case None    => going = false
                out.result()

            // TOPIC tiebreak: three streams, every head at t=100, stream ids reverse-ordered
            // against their topic FQNs. A second, later message per stream keeps each stream
            // head-bearing while the tied heads drain, so the ties are seen to resolve without
            // any clock movement or sweep - only the last commit leaves a headless stream.
            val topicA = "persistent://public/default/tied-a"
            val topicB = "persistent://public/default/tied-b"
            val topicC = "persistent://public/default/tied-c"
            val byTopic = guaranteedMerge(Vector("z-src", "y-src", "x-src"))
            byTopic.offer("z-src", MessageOrderKey(100L, topicA, 1L, 0L, -1), atBacklogEnd = false, payload = "a-100")
            byTopic.offer("z-src", MessageOrderKey(900L, topicA, 1L, 1L, -1), atBacklogEnd = false, payload = "a-900")
            byTopic.offer("y-src", MessageOrderKey(100L, topicB, 1L, 0L, -1), atBacklogEnd = false, payload = "b-100")
            byTopic.offer("y-src", MessageOrderKey(901L, topicB, 1L, 1L, -1), atBacklogEnd = false, payload = "b-901")
            byTopic.offer("x-src", MessageOrderKey(100L, topicC, 1L, 0L, -1), atBacklogEnd = false, payload = "c-100")
            byTopic.offer("x-src", MessageOrderKey(902L, topicC, 1L, 1L, -1), atBacklogEnd = false, payload = "c-902")
            val topicTieOrder = drain(byTopic)

            // LOG-POSITION tiebreak: two streams over the SAME topic FQN (two targets on one
            // topic) with heads tied on both time and topic - the entry id must decide, again
            // against the stream-id order.
            val tiedTopic = "persistent://public/default/tied-same"
            val byEntry = guaranteedMerge(Vector("za", "yb"))
            byEntry.offer("za", MessageOrderKey(100L, tiedTopic, 1L, 5L, -1), atBacklogEnd = false, payload = "a-e5")
            byEntry.offer("za", MessageOrderKey(100L, tiedTopic, 1L, 8L, -1), atBacklogEnd = false, payload = "a-e8")
            byEntry.offer("yb", MessageOrderKey(100L, tiedTopic, 1L, 3L, -1), atBacklogEnd = false, payload = "b-e3")
            byEntry.offer("yb", MessageOrderKey(100L, tiedTopic, 1L, 9L, -1), atBacklogEnd = false, payload = "b-e9")
            val entryTieOrder = drain(byEntry)

            assertTrue(
                // a/b/c-100 drain at once in TOPIC order, then the exact rule continues with 900;
                // z-src only then runs dry, which is what stops the barrier - not the tie.
                topicTieOrder == Vector("a-100", "b-100", "c-100", "a-900"),
                byTopic.heldCount == 2, // b-901 and c-902 wait on the drained z-src, per the promise
                byTopic.lateDeliveryCount == 0L, // a tie-break is not disorder
                entryTieOrder == Vector("b-e3", "a-e5", "a-e8"),
                byEntry.heldCount == 1, // b-e9 waits on drained za
                byEntry.lateDeliveryCount == 0L
            ) ?? s"topicTieOrder=$topicTieOrder entryTieOrder=$entryTieOrder"
        },
        test("GUARANTEED AT A THOUSAND STREAMS: selected-time merge order, no clock, and the by-design tail") {
            // The width pin for the no-compromise mode, in counted operations like its
            // best-effort sibling above. 1000 streams x 20 messages, offered stream by stream -
            // arrival order maximally unlike emission order - then pumped through the
            // deliver-then-advance barrier. Three facts at width:
            //   - emission is the selected-time order across a thousand append-ordered queues;
            //   - this mode has no residence, so the only clock bill is arrival stamping - O(1)
            //     per offer, nothing per emission;
            //   - on finite data the pump stops the instant the first stream drains dry, so of
            //     the final round exactly ONE message emits - the documented tail; one closing
            //     word per stream then releases everything except, again, the single message
            //     past the globally-last head.
            var clockReads = 0L
            val streams = (0 until 1000).map(i => f"cs@persistent://public/default/gwide-$i%04d").toVector
            val merge = GlobalSkipMerge[String](
                streamIds = streams,
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => { clockReads += 1; 0L },
                graceMs = graceMs,
                policy = OrderingPolicy.GuaranteedOnly
            )
            var entry = Map.empty[String, Long].withDefaultValue(0L)
            val offerResolutions = Vector.newBuilder[(String, StartFromOutcome)]
            def offer(id: String, t: Long, v: String): Unit =
                val e = entry(id); entry = entry.updated(id, e + 1)
                offerResolutions ++= merge.offer(id, MessageOrderKey(t, id, 1L, e, -1), atBacklogEnd = false, payload = v)
            def drain(): Vector[String] =
                val out = Vector.newBuilder[String]
                var going = true
                while going do
                    merge.peekGuaranteed() match
                        case Some(v) => out += v; merge.commitGuaranteed()
                        case None    => going = false
                out.result()

            // Message j of stream i is stamped j*10_000 + i: the global order interleaves ALL
            // thousand streams every round, while each stream arrives as one 20-deep burst.
            streams.zipWithIndex.foreach { (id, i) =>
                (0 until 20).foreach(j => offer(id, j * 10_000L + i, f"m-$j%02d-$i%04d"))
            }
            val drained = drain()
            val heldAtFirstStop = merge.heldCount
            val expectedPrefix = (0 until 19).flatMap(j => (0 until 1000).map(i => f"m-$j%02d-$i%04d")).toVector :+ "m-19-0000"

            streams.zipWithIndex.foreach((id, i) => offer(id, 1_000_000L + i, f"close-$i%04d"))
            val drainedAfterClose = drain()
            val expectedAfter = (1 until 1000).map(i => f"m-19-$i%04d").toVector :+ "close-0000"

            assertTrue(
                drained.size == 19_001,
                drained == expectedPrefix,
                heldAtFirstStop == 999, // the rest of the final round, held on drained stream 0
                drainedAfterClose == expectedAfter,
                merge.heldCount == 999, // the closing words of streams 1..999, in their turn
                offerResolutions.result().isEmpty, // advance() emits NOTHING in this mode - only the barrier delivers
                merge.lateDeliveryCount == 0L, // exactness at width: nothing to confess
                clockReads < 21_000L * 10 // arrival stamps only; any per-emission clock would blow this
            ) ?? s"drained=${drained.size} after=${drainedAfterClose.size} held=${merge.heldCount} clockReads=$clockReads late=${merge.lateDeliveryCount}"
        },
        test("GUARANTEED AND IDLE AT WIDTH: a tick with nothing new to say costs NOTHING per stream") {
            // Every continuous layer was given the BEST-EFFORT 250 ms sweep cadence, and each of
            // those ticks materialized the whole waited-for-but-silent stream set. Guaranteed has
            // no residence to expire and never gives a stream up, so at 2,000 idle streams that was
            // four full-set scans a second, per session, forever - producing nothing whatsoever.
            // The report path was no better: the waiting-stream COUNT the client is shown was
            // another full materialization, once per delivered frame.
            //
            // Counted operations, not wall time (wall time flakes; operation counts do not), and
            // the same instrument the wide-skew tests above use.
            var mono = 0L
            val streams = (0 until 2_000).map(i => f"cs@persistent://public/default/idle-$i%04d").toVector
            val merge = GlobalSkipMerge[String](
                streamIds = streams,
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => mono,
                graceMs = graceMs,
                policy = OrderingPolicy.GuaranteedOnly
            )
            // One stream speaks; the merge is now genuinely waiting on the other 1,999 forever.
            merge.offer(streams.head, MessageOrderKey(100L, streams.head, 1L, 0L, -1), atBacklogEnd = false, payload = "m")

            mono += startFromMergeStallWarnMs + 1
            merge.sweepStalled() // the one tick with something to say: it discloses the stall
            val costOfTheDisclosure = merge.silentStreamInspections

            // A hundred idle ticks and a hundred client frames afterwards, nothing changed.
            (1 to 100).foreach { _ =>
                mono += mergeTopicsSweepPeriodMs
                merge.sweepStalled()
                merge.stalledStreamCount
            }

            val hugeSet = (0 until 2_000).map(i => f"stream-$i%04d")
            val logLine = stalledStreamsForLog(hugeSet)

            assertTrue(
                merge.stallWarningCount == 1L, // surfaced once, as before
                merge.stalledStreamCount == 1_999, // and the answer is unchanged
                merge.heldCount == 1, // still holding: Guaranteed waits forever, by design
                costOfTheDisclosure <= 2L * streams.size, // naming the streams costs one pass
                merge.silentStreamInspections == costOfTheDisclosure, // the 100 idle ticks cost none
                continuousSweepPeriodMs(guaranteed = true) > continuousSweepPeriodMs(guaranteed = false),
                continuousSweepPeriodMs(guaranteed = false) == mergeTopicsSweepPeriodMs,
                logLine.length < 1_000, // one line, not a 2,000-name wall
                logLine.contains("stream-0000"),
                logLine.contains(s"${2_000 - stallLogStreamNameCap} more")
            ) ?? (s"disclosureCost=$costOfTheDisclosure afterwards=${merge.silentStreamInspections} " +
                s"streams=${streams.size} warnings=${merge.stallWarningCount} stalled=${merge.stalledStreamCount} " +
                s"guaranteedPeriod=${continuousSweepPeriodMs(guaranteed = true)} " +
                s"bestEffortPeriod=${continuousSweepPeriodMs(guaranteed = false)} logLineLength=${logLine.length}")
        },
        test("the plans wire the mode through: keepOrderingAfterCut on the skip, OrderOnly for everyone else") {
            import consumer.session_config.MessageDeliveryOrder
            val streams = Vector(StartFromStream(a, EntryPosition(1, 10, -1, 1)), StartFromStream(b, EntryPosition(1, 20, -1, 1)))
            val skipKeep = StartFromOrdering.make[String](StartFromOrderingPlan.GlobalSkip(3, streams, MessageDeliveryOrder.BestEffort))
            val skipGuaranteed = StartFromOrdering.make[String](StartFromOrderingPlan.GlobalSkip(3, streams, MessageDeliveryOrder.Guaranteed))
            val skipPlain = StartFromOrdering.make[String](StartFromOrderingPlan.GlobalSkip(3, streams))
            val orderOnly = StartFromOrdering.make[String](StartFromOrderingPlan.Ordered(
                Vector(StartFromStream(a, EntryPosition.empty), StartFromStream(b, EntryPosition.empty)),
                MessageDeliveryOrder.BestEffort
            ))
            val guaranteedOnly = StartFromOrdering.make[String](StartFromOrderingPlan.Ordered(
                Vector(StartFromStream(a, EntryPosition(1, 10, -1, 1)), StartFromStream(b, EntryPosition(1, 20, -1, 1))),
                MessageDeliveryOrder.Guaranteed
            ))
            val passThrough = StartFromOrdering.make[String](StartFromOrderingPlan.PassThrough)
            assertTrue(
                skipKeep.isContinuousOrdering,
                !skipKeep.isGuaranteedOrdering,
                skipGuaranteed.isContinuousOrdering,
                skipGuaranteed.isGuaranteedOrdering,
                !skipPlain.isContinuousOrdering,
                orderOnly.isContinuousOrdering,
                !orderOnly.isGuaranteedOrdering,
                guaranteedOnly.isGuaranteedOrdering,
                !passThrough.isContinuousOrdering
            )
        }
    ) @@ TestAspect.sequential
