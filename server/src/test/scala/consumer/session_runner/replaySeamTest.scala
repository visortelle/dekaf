package consumer.session_runner

import org.apache.pulsar.client.impl.MessageIdImpl
import zio.test.*

/** THE RESUME SEAM, pinned with hand clocks at the merge tier.
  *
  * Within one replay chunk the guaranteed barrier makes cross-stream disorder impossible; across
  * a boundary extension it cannot - a delta message may carry an order key LOWER than something
  * an earlier chunk already emitted (producer clock skew, or an inversion the source log itself
  * stores). The contract (owner decision 2026-08-09): such a message is delivered LOUDLY FLAGGED
  * - never silently late, never dropped - and counted on a session-level ledger. The comparison
  * is against EMITTED KEYS OF THE SAME KIND, never against wall clock: under the event-time key,
  * ordinary old event times are not violations.
  *
  * Also here: the counted start-from budget across the seam - a past-boundary arrival spends
  * nothing, and its post-extension redelivery is delivered exactly once, never re-dropped.
  */
object replaySeamTest extends ZIOSpecDefault:

    private val topicA = "persistent://public/default/seam-a"
    private val topicB = "persistent://public/default/seam-b"
    private val consumerName = "cs-seam-0"
    private def sid(topicFqn: String): String = startFromStreamId(consumerName, topicFqn)

    /** A guaranteed ordering layer over two streams with RECORDED ENDS, plus the pump loop's
      * unit-tier stand-in: peek, read the seam flag, commit - capturing what a client would see. */
    private final class Fixture(endA: EntryPosition, endB: EntryPosition, budget: Long = 0, monoStart: Long = 0L):
        var monoMs: Long = monoStart
        private val streams = Vector(StartFromStream(sid(topicA), endA), StartFromStream(sid(topicB), endB))
        val merge = GlobalSkipMerge[String](
            streamIds = streams.map(_.id),
            drainedAtStart = streams.filter(_.lastAtStart == EntryPosition.empty).map(_.id).toSet,
            discard = StartFromDiscard.shared(budget),
            nowMs = () => monoMs,
            policy = if budget > 0 then OrderingPolicy.ExactCutThenGuaranteed else OrderingPolicy.GuaranteedOnly
        )
        val ordering = new StartFromOrdering[String](Some(merge), streams.map(s => s.id -> s).toMap)

        private val resolutions = Vector.newBuilder[(String, StartFromOutcome)]

        def offer(topicFqn: String, orderTime: Long, entryId: Long, value: String): Unit =
            resolutions ++= ordering.offer(consumerName, topicFqn, orderTime, new MessageIdImpl(1L, entryId, -1), value)

        def dropped: Vector[String] = resolutions.result().collect { case (v, StartFromOutcome.Drop) => v }
        def nextChunk: Vector[String] = resolutions.result().collect { case (v, StartFromOutcome.NextChunk) => v }

        /** Drain the barrier, capturing each emission WITH the seam flag the pump would stamp. */
        def pumpAll(): Vector[(String, Boolean)] =
            val out = Vector.newBuilder[(String, Boolean)]
            var going = true
            while going do
                ordering.peekGuaranteed() match
                    case Some(value) =>
                        out += (value -> ordering.peekIsSeamViolation)
                        ordering.commitGuaranteed()
                    case None => going = false
            out.result()

        def extend(endA: EntryPosition, endB: EntryPosition): Unit =
            ordering.extendReplayBoundary(Vector(StartFromStream(sid(topicA), endA), StartFromStream(sid(topicB), endB)))

    def spec = suite(this.getClass.toString)(
        test("A DELTA KEY BELOW THE EMITTED MAXIMUM IS DELIVERED, FLAGGED AND COUNTED - never silently late, never dropped") {
            val f = Fixture(endA = EntryPosition(1, 0, -1, 1), endB = EntryPosition(1, 0, -1, 1))
            f.offer(topicA, 1000L, entryId = 0, "a-1000") // stream A's whole recorded range
            f.offer(topicB, 2000L, entryId = 0, "b-2000") // stream B's whole recorded range
            val chunkOne = f.pumpAll()
            val caughtUpAfterChunkOne = f.ordering.isReplayCaughtUp

            // Resume extends the boundary; the delta on A carries a key BELOW b-2000, which is
            // already on screen - the producer-clock-skew seam.
            f.extend(endA = EntryPosition(1, 1, -1, 1), endB = EntryPosition(1, 0, -1, 1))
            f.offer(topicA, 1500L, entryId = 1, "a-1500")
            val delta = f.pumpAll()

            assertTrue(
                chunkOne == Vector("a-1000" -> false, "b-2000" -> false),
                caughtUpAfterChunkOne,
                delta == Vector("a-1500" -> true), // delivered, loudly flagged
                f.ordering.replaySeamViolationCount == 1L, // and counted for the banner
                f.merge.lateDeliveryCount == 1L, // the lateness ledger agrees
                f.dropped.isEmpty,
                f.ordering.isReplayCaughtUp // the delta chunk completed too
            ) ?? s"chunkOne=$chunkOne delta=$delta seams=${f.ordering.replaySeamViolationCount}"
        },
        test("AN EQUAL KEY ACROSS THE SEAM IS A TIE-BREAK, NOT A VIOLATION - and a newer one is plain delivery") {
            val f = Fixture(endA = EntryPosition(1, 0, -1, 1), endB = EntryPosition(1, 0, -1, 1))
            f.offer(topicA, 1000L, entryId = 0, "a-1000")
            f.offer(topicB, 2000L, entryId = 0, "b-2000")
            f.pumpAll()

            f.extend(endA = EntryPosition(1, 2, -1, 1), endB = EntryPosition(1, 0, -1, 1))
            f.offer(topicA, 2000L, entryId = 1, "a-2000") // ties the emitted maximum
            f.offer(topicA, 2500L, entryId = 2, "a-2500") // and moves past it
            val delta = f.pumpAll()

            assertTrue(
                delta == Vector("a-2000" -> false, "a-2500" -> false),
                f.ordering.replaySeamViolationCount == 0L,
                f.merge.lateDeliveryCount == 0L
            ) ?? s"delta=$delta seams=${f.ordering.replaySeamViolationCount} late=${f.merge.lateDeliveryCount}"
        },
        test("THE COMPARISON IS AGAINST EMITTED KEYS, NEVER WALL CLOCK: ancient event times are not violations") {
            // The order key is whatever the session selected - under the event-time key it can
            // legitimately be decades behind this process's clock. The fixture's monotonic clock
            // sits far ahead of every key to prove no wall-clock comparison sneaks in: a delta
            // key ABOVE the emitted maximum is clean however old it is in absolute terms, and
            // only a key BELOW the emitted maximum - of the same kind - is flagged.
            val f = Fixture(
                endA = EntryPosition(1, 0, -1, 1),
                endB = EntryPosition(1, 0, -1, 1),
                monoStart = 1_700_000_000_000L // "now" dwarfs every event time below
            )
            f.offer(topicA, 5000L, entryId = 0, "a-5000") // event times near the epoch
            f.offer(topicB, 6000L, entryId = 0, "b-6000")
            f.pumpAll()

            f.extend(endA = EntryPosition(1, 2, -1, 1), endB = EntryPosition(1, 0, -1, 1))
            f.offer(topicA, 7000L, entryId = 1, "a-7000") // older than the wall clock by an era: clean
            f.offer(topicA, 5500L, entryId = 2, "a-5500") // below the emitted maximum: the seam
            val delta = f.pumpAll()

            assertTrue(
                delta == Vector("a-7000" -> false, "a-5500" -> true),
                f.ordering.replaySeamViolationCount == 1L
            ) ?? s"delta=$delta seams=${f.ordering.replaySeamViolationCount}"
        },
        test("THE COUNTED BUDGET NEVER CROSSES THE BOUNDARY: a past-end arrival spends nothing and is delivered once, later") {
            // Skip-first-2 under Guaranteed. The recorded history is a@10, a@30 (stream A) and
            // b@20 (stream B, entry 0 only). A past-boundary arrival lands MID-CUT with budget
            // still unspent - it must not consume a unit, must not be dropped, must not enter
            // the duplicate watermark; after the boundary extends, its redelivery is an ordinary
            // in-chunk message: DELIVERED, with the budget long since spent on the recorded two.
            val f = Fixture(endA = EntryPosition(1, 2, -1, 1), endB = EntryPosition(1, 0, -1, 1), budget = 2)
            def remaining: Long = f.ordering.progressDiscard.map(_.remaining).getOrElse(-1L)

            f.offer(topicA, 10L, entryId = 0, "a-10") // globally first: dropped once B speaks
            f.offer(topicB, 20L, entryId = 0, "b-20") // B's recorded end; a-10 drops (budget 2 -> 1)
            val remainingMidCut = remaining
            f.offer(topicB, 40L, entryId = 1, "b-40") // STRICTLY past B's end: next chunk's business
            val remainingAfterPastEnd = remaining
            f.offer(topicA, 30L, entryId = 2, "a-30") // A's recorded end; b-20 (globally second) drops
            val cutState = (f.dropped, f.nextChunk, remaining)
            val chunkOne = f.pumpAll() // the replay remainder: a-30 alone
            val caughtUpAfterChunkOne = f.ordering.isReplayCaughtUp

            // Resume: the boundary extends over the handed-back entry, and the broker redelivers.
            f.extend(endA = EntryPosition(1, 2, -1, 1), endB = EntryPosition(1, 1, -1, 1))
            f.offer(topicB, 40L, entryId = 1, "b-40-redelivered")
            val delta = f.pumpAll()

            assertTrue(
                remainingMidCut == 1L,
                remainingAfterPastEnd == 1L, // the past-end arrival spent NOTHING
                cutState == (Vector("a-10", "b-20"), Vector("b-40"), 0L), // the cut is the GLOBAL first two
                chunkOne == Vector("a-30" -> false),
                caughtUpAfterChunkOne,
                delta == Vector("b-40-redelivered" -> false), // delivered exactly once, not re-dropped
                f.dropped == Vector("a-10", "b-20") // and the drop set never grew past the budget
            ) ?? (s"remaining=($remainingMidCut, $remainingAfterPastEnd) cut=$cutState chunkOne=$chunkOne " +
                s"delta=$delta dropped=${f.dropped} nextChunk=${f.nextChunk}")
        },
        test("a NON-guaranteed counted cut is untouched by the boundary machinery - past-end interception is guaranteed-only") {
            // The control: the same shape under ExactCutThenBestEffort must keep the old
            // behavior - recorded ends release the wait but nothing is ever handed back as
            // next-chunk, because best effort has no replay boundary. Hand clock, so the
            // residence releases are the test's to trigger.
            var monoMs = 0L
            val streams = Vector(
                StartFromStream(sid(topicA), EntryPosition(1, 0, -1, 1)),
                StartFromStream(sid(topicB), EntryPosition(1, 0, -1, 1))
            )
            val merge = GlobalSkipMerge[String](
                streamIds = streams.map(_.id),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(1),
                nowMs = () => monoMs,
                policy = OrderingPolicy.ExactCutThenBestEffort
            )
            val ordering = new StartFromOrdering[String](Some(merge), streams.map(s => s.id -> s).toMap)
            val out = Vector.newBuilder[(String, StartFromOutcome)]
            out ++= ordering.offer(consumerName, topicA, 10L, new MessageIdImpl(1L, 0L, -1), "a-10")
            out ++= ordering.offer(consumerName, topicB, 20L, new MessageIdImpl(1L, 0L, -1), "b-20")
            out ++= ordering.offer(consumerName, topicB, 40L, new MessageIdImpl(1L, 1L, -1), "b-40")
            monoMs += mergeTopicsGraceMs + 1 // every residence expires; best effort releases the rest
            out ++= ordering.sweepStalled()
            val outcomes = out.result()
            assertTrue(
                outcomes.collect { case (v, StartFromOutcome.Drop) => v } == Vector("a-10"),
                outcomes.collect { case (v, StartFromOutcome.NextChunk) => v }.isEmpty, // no boundary, no next chunk
                outcomes.collect { case (v, StartFromOutcome.Deliver) => v } == Vector("b-20", "b-40"),
                merge.replaySeamViolationCount == 0L
            ) ?? s"outcomes=$outcomes"
        }
    ) @@ TestAspect.sequential
