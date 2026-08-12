package consumer.session_runner

import consumer.session_config.MessageDeliveryOrder
import zio.test.*

import java.util.concurrent.{ConcurrentLinkedQueue, CountDownLatch}
import java.util.concurrent.atomic.AtomicBoolean
import scala.jdk.CollectionConverters.*

/** CHANGING THE DELIVERY ORDER OF A SESSION THAT IS ALREADY RUNNING.
  *
  * Guaranteed - the product default since 2026-08-11 - can wait on an
  * idle source forever. The wait is disclosed; this is what makes it ACTIONABLE - one call
  * switches the live session to Best effort and the messages the barrier was holding are
  * RELEASED, in the new order, exactly once. Nothing is re-read from the broker, nothing is
  * dropped, nothing arrives twice.
  *
  * Two levels are pinned here: the pure decision matrix (which direction is honoured, which is
  * refused and why), and the merge's own switch (what happens to the held set, the counted budget
  * and the flow-control marks). The listener/consumer path is pinned in
  * [[liveDeliveryOrderSwitchTest]] and the RPC surface in `consumerServiceDeliveryOrderTest`.
  *
  * Time is injected and moves only when a test says so.
  */
object deliveryOrderSwitchTest extends ZIOSpecDefault:

    private val a = "cs@persistent://public/default/switch-a"
    private val b = "cs@persistent://public/default/switch-b"
    private val c = "cs@persistent://public/default/switch-c"

    private val graceMs = 500L

    private final class MonoClock:
        @volatile var monoMs: Long = 0L
        def advance(ms: Long): Unit = monoMs += ms

    /** The refusal reason, or a legible complaint when the switch was not refused at all. */
    private def reasonOf(switch: DeliveryOrderSwitch): String = switch match
        case DeliveryOrderSwitch.Refused(reason) => reason
        case other                               => s"NOT REFUSED: $other"

    private final class Fixture(
        streamIds: Vector[String],
        policy: OrderingPolicy = OrderingPolicy.GuaranteedOnly,
        budget: Long = 0,
        pauseStreamAt: Int = startFromMergePauseStreamAt,
        resumeStreamAt: Int = startFromMergeResumeStreamAt
    ):
        val clock = MonoClock()
        private var nextEntryId = Map.empty[String, Long].withDefaultValue(0L)
        val merge = GlobalSkipMerge[String](
            streamIds = streamIds,
            drainedAtStart = Set.empty,
            discard = StartFromDiscard.shared(budget),
            nowMs = () => clock.monoMs,
            pauseStreamAt = pauseStreamAt,
            resumeStreamAt = resumeStreamAt,
            policy = policy,
            graceMs = graceMs
        )
        private val out = Vector.newBuilder[(String, StartFromOutcome)]

        def offer(streamId: String, publishTime: Long, value: String): Unit =
            val entryId = nextEntryId(streamId)
            nextEntryId = nextEntryId.updated(streamId, entryId + 1)
            val key = MessageOrderKey(publishTime, streamId, ledgerId = 1L, entryId = entryId, batchIndex = -1)
            out ++= merge.offer(streamId, key, atBacklogEnd = false, payload = value)

        /** The unit-level stand-in for the listener's guaranteed pump: peek and commit until
          * nothing is safe, every send succeeding. */
        def pumpAll(): Vector[String] =
            val delivered = Vector.newBuilder[String]
            var going = true
            while going do
                merge.peekGuaranteed() match
                    case Some(v) => delivered += v; merge.commitGuaranteed()
                    case None    => going = false
            delivered.result()

        def switchToBestEffort(): Vector[String] =
            val released = merge.relaxGuaranteedToBestEffort()
            out ++= released
            released.collect { case (v, StartFromOutcome.Deliver) => v }

        def sweep(): Unit = out ++= merge.sweepStalled()

        def delivered: Vector[String] = out.result().collect { case (v, StartFromOutcome.Deliver) => v }
        def dropped: Vector[String] = out.result().collect { case (v, StartFromOutcome.Drop) => v }

    def spec = suite(this.getClass.toString)(
        // ------------------------------------------------------------------ the decision matrix
        test("the ONE honoured direction is Guaranteed -> Best effort") {
            assertTrue(
                deliveryOrderSwitchFor(MessageDeliveryOrder.Guaranteed, MessageDeliveryOrder.BestEffort)
                    == DeliveryOrderSwitch.RelaxToBestEffort
            )
        },
        test("asking for the order the session already delivers in is a no-op, not an error") {
            // Two clients, or one impatient one, must not turn a repeated click into a failure.
            assertTrue(
                deliveryOrderSwitchFor(MessageDeliveryOrder.Guaranteed, MessageDeliveryOrder.Guaranteed) == DeliveryOrderSwitch.AlreadyThere,
                deliveryOrderSwitchFor(MessageDeliveryOrder.BestEffort, MessageDeliveryOrder.BestEffort)
                    == DeliveryOrderSwitch.AlreadyThere,
                deliveryOrderSwitchFor(MessageDeliveryOrder.AsReceived, MessageDeliveryOrder.AsReceived) == DeliveryOrderSwitch.AlreadyThere
            )
        },
        test("PROMOTION TO GUARANTEED IS REFUSED, because it cannot be honestly delivered mid-stream") {
            // Guaranteed promises that Dekaf introduced no cross-stream disorder into what the user
            // has SEEN. A session already running under a weaker order has emitted past silent
            // streams and cannot un-emit; granting the promise now would be a lie about messages
            // already on screen. The refusal must say what to do instead.
            val fromBestEffort = deliveryOrderSwitchFor(MessageDeliveryOrder.BestEffort, MessageDeliveryOrder.Guaranteed)
            val fromFastest = deliveryOrderSwitchFor(MessageDeliveryOrder.AsReceived, MessageDeliveryOrder.Guaranteed)
            assertTrue(
                fromBestEffort.isInstanceOf[DeliveryOrderSwitch.Refused],
                fromFastest.isInstanceOf[DeliveryOrderSwitch.Refused],
                reasonOf(fromBestEffort).contains("Start the session again")
            ) ?? s"fromBestEffort=$fromBestEffort fromFastest=$fromFastest"
        },
        test("SWITCHING TO FASTEST IS REFUSED: it is the absence of the merge, not a weaker order") {
            // The same layer also resolves a counted start-from cut, so removing it mid-session
            // could change WHICH messages the session shows - the exact failure that ruled out
            // recreating the session. Fastest stays a configuration choice.
            val fromGuaranteed = deliveryOrderSwitchFor(MessageDeliveryOrder.Guaranteed, MessageDeliveryOrder.AsReceived)
            val fromBestEffort = deliveryOrderSwitchFor(MessageDeliveryOrder.BestEffort, MessageDeliveryOrder.AsReceived)
            assertTrue(
                fromGuaranteed.isInstanceOf[DeliveryOrderSwitch.Refused],
                fromBestEffort.isInstanceOf[DeliveryOrderSwitch.Refused],
                reasonOf(fromGuaranteed).contains("Play")
            ) ?? s"fromGuaranteed=$fromGuaranteed fromBestEffort=$fromBestEffort"
        },

        // ------------------------------------------------------------- the merge's own switch
        test("THE HELD SET IS RELEASED, EXACTLY ONCE, IN BEST-EFFORT ORDER - not dropped, not re-read") {
            // The stall this exists for: c never speaks, so the guaranteed barrier holds
            // everything the other two streams delivered, for as long as it takes. Arrival order
            // is deliberately not publish-time order, so a release that merely dumped the queues
            // would be visibly wrong.
            val f = Fixture(Vector(a, b, c))
            f.offer(a, 100, "a-100")
            f.offer(a, 300, "a-300")
            f.offer(b, 200, "b-200")
            f.offer(b, 400, "b-400")
            f.offer(a, 500, "a-500")
            val pumpedWhileGuaranteed = f.pumpAll()
            val heldBehindTheSilentStream = f.merge.heldCount

            // The user has been staring at a stalled session; every held head is long past its
            // best-effort residence by the time they click.
            f.clock.advance(graceMs + 1)
            val released = f.switchToBestEffort()

            assertTrue(
                pumpedWhileGuaranteed.isEmpty, // the barrier delivered nothing while c was silent
                heldBehindTheSilentStream == 5,
                released == Vector("a-100", "b-200", "a-300", "b-400", "a-500"),
                f.delivered == released, // exactly once: the release IS the whole delivery
                f.delivered.distinct == f.delivered,
                f.dropped.isEmpty, // nothing was thrown away to make the switch
                f.merge.heldCount == 0,
                !f.merge.isGuaranteedOrdering, // the barrier is gone...
                f.merge.isContinuousOrdering, // ...but the session is still ordered
                f.merge.peekGuaranteed().isEmpty
            ) ?? s"pumped=$pumpedWhileGuaranteed released=$released delivered=${f.delivered} held=${f.merge.heldCount}"
        },
        test("messages arriving AFTER the switch obey the new rules - held for the grace, then out") {
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100") // b silent: the barrier holds it
            f.clock.advance(graceMs + 1)
            val released = f.switchToBestEffort()

            // A fresh arrival on the still-silent-peer side: best effort holds it for its own
            // residence and no longer waits for b indefinitely.
            f.offer(a, 700, "a-700")
            val heldWhileFresh = f.delivered
            f.clock.advance(graceMs + 1)
            f.sweep()

            assertTrue(
                released == Vector("a-100"),
                heldWhileFresh == Vector("a-100"),
                f.delivered == Vector("a-100", "a-700"),
                f.merge.heldCount == 0
            ) ?? s"released=$released delivered=${f.delivered}"
        },
        test("a peek left in flight across the switch is released ONCE, and a late commit cannot double it") {
            // Defence in depth: production holds the ordering lock across peek/commit, so a switch
            // cannot land between them. If one ever did, the head must not both be released by the
            // switch and popped again by the stale commit.
            val f = Fixture(Vector(a, b))
            f.offer(a, 100, "a-100")
            f.offer(b, 200, "b-200")
            val peeked = f.merge.peekGuaranteed()
            f.clock.advance(graceMs + 1)
            val released = f.switchToBestEffort()
            f.merge.commitGuaranteed() // stale: the barrier it belonged to no longer exists

            assertTrue(
                peeked.contains("a-100"),
                released == Vector("a-100", "b-200"),
                f.delivered.distinct == f.delivered,
                f.merge.heldCount == 0
            ) ?? s"peeked=$peeked released=$released held=${f.merge.heldCount}"
        },
        test("switching MID-CUT leaves the counted start-from budget exactly where it was") {
            // The cut is defined over the merged stream and must stay exact whatever the delivery
            // order does afterwards: the switch may not spend, refund or skip a single unit.
            val f = Fixture(Vector(a, b), policy = OrderingPolicy.ExactCutThenGuaranteed, budget = 3)
            f.offer(a, 10, "a-10")
            f.offer(b, 20, "b-20") // resolves a-10 as the first drop
            f.offer(a, 30, "a-30") // resolves b-20 as the second
            val remainingBeforeSwitch = f.merge.progressDiscard.map(_.remaining)

            val releasedMidCut = f.switchToBestEffort()
            val remainingAfterSwitch = f.merge.progressDiscard.map(_.remaining)

            // The cut carries on exactly as before, and only then does ordering continue.
            f.offer(b, 40, "b-40")
            f.clock.advance(graceMs + 1)
            f.sweep()

            assertTrue(
                remainingBeforeSwitch.contains(1L),
                releasedMidCut.isEmpty, // the exact rule still waits for b - the switch did not skip it
                remainingAfterSwitch.contains(1L),
                f.dropped == Vector("a-10", "b-20", "a-30"), // exactly the 3 the user asked to skip
                f.merge.progressDiscard.map(_.remaining).contains(0L),
                f.delivered == Vector("b-40"),
                !f.merge.isGuaranteedOrdering,
                f.merge.isContinuousOrdering
            ) ?? s"before=$remainingBeforeSwitch after=$remainingAfterSwitch dropped=${f.dropped} delivered=${f.delivered}"
        },
        test("flow control survives the switch: what the watermark paused is released when the drain empties it") {
            val f = Fixture(Vector(a, b), pauseStreamAt = 5, resumeStreamAt = 1)
            (1 to 6).foreach(i => f.offer(a, 100L + i, s"a-$i")) // b is blind; a races past its watermark
            val pausedUnderGuaranteed = f.merge.desiredPausedStreams
            f.clock.advance(graceMs + 1)
            val released = f.switchToBestEffort()

            assertTrue(
                pausedUnderGuaranteed == Set(a),
                released.size == 6,
                released == (1 to 6).map(i => s"a-$i").toVector,
                f.merge.desiredPausedStreams.isEmpty, // the drain released the backpressure
                f.merge.heldCount == 0
            ) ?? s"pausedUnderGuaranteed=$pausedUnderGuaranteed released=$released desired=${f.merge.desiredPausedStreams}"
        },
        test("relaxing a layer that is not guaranteed changes nothing at all") {
            val bestEffort = Fixture(Vector(a, b), policy = OrderingPolicy.BestEffortOnly)
            bestEffort.offer(a, 100, "a-100")
            val released = bestEffort.switchToBestEffort()
            val passThrough = StartFromOrdering.passThrough[String]

            assertTrue(
                released.isEmpty,
                bestEffort.merge.heldCount == 1, // still held by its own residence, untouched
                bestEffort.merge.isContinuousOrdering,
                !bestEffort.merge.isGuaranteedOrdering,
                passThrough.relaxGuaranteedToBestEffort().isEmpty
            ) ?? s"released=$released held=${bestEffort.merge.heldCount}"
        },
        test("THE SWITCH IS SAFE AGAINST CONCURRENT DELIVERY: nothing is lost and nothing is doubled") {
            // The production discipline modelled exactly: every decision - an offer, a pump cycle,
            // the switch itself - runs under the session's ORDERING lock, and the merge's own
            // monitor nests inside it. Offer threads, a delivery pump and the switch all run at
            // once; afterwards every single message must have come out exactly once.
            val streams = Vector(a, b, c)
            val perStream = 400
            val orderingLock = new Object
            val clock = MonoClock()
            val merge = GlobalSkipMerge[String](
                streamIds = streams,
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(0),
                nowMs = () => clock.monoMs,
                policy = OrderingPolicy.GuaranteedOnly,
                graceMs = graceMs
            )
            val delivered = ConcurrentLinkedQueue[String]()
            val otherOutcomes = ConcurrentLinkedQueue[String]()
            def record(resolved: Vector[(String, StartFromOutcome)]): Unit =
                resolved.foreach {
                    case (v, StartFromOutcome.Deliver) => delivered.add(v)
                    case (v, _)                        => otherOutcomes.add(v)
                }

            val start = CountDownLatch(1)
            val switched = AtomicBoolean(false)
            val done = AtomicBoolean(false)

            val offerers = streams.zipWithIndex.map { (streamId, s) =>
                val runnable: Runnable = () =>
                    start.await()
                    var i = 0
                    while i < perStream do
                        val key = MessageOrderKey(i.toLong * 10 + s, streamId, 1L, i.toLong, -1)
                        orderingLock.synchronized(record(merge.offer(streamId, key, atBacklogEnd = false, payload = f"m-$s-$i%04d")))
                        i += 1
                val t = Thread(runnable, s"offer-$s")
                t.setDaemon(true)
                t
            }
            val pump = {
                val runnable: Runnable = () =>
                    start.await()
                    while !done.get do
                        orderingLock.synchronized {
                            var going = true
                            while going do
                                merge.peekGuaranteed() match
                                    case Some(v) => delivered.add(v); merge.commitGuaranteed()
                                    case None    => going = false
                        }
                        // Outside the lock, so the pump cannot starve the offerers or the switch.
                        Thread.`yield`()
                val t = Thread(runnable, "guaranteed-pump")
                t.setDaemon(true)
                t
            }
            val switcher = {
                val runnable: Runnable = () =>
                    start.await()
                    // Let real work pile up behind the barrier first, but never wait forever: the
                    // switch has to happen for this test to be about anything.
                    val deadlineNanos = System.nanoTime() + 10_000_000_000L
                    while merge.heldCount < 50 && System.nanoTime() < deadlineNanos do Thread.`yield`()
                    orderingLock.synchronized(record(merge.relaxGuaranteedToBestEffort()))
                    switched.set(true)
                val t = Thread(runnable, "order-switcher")
                t.setDaemon(true)
                t
            }

            val workers = offerers :+ pump :+ switcher
            workers.foreach(_.start())
            start.countDown()
            (offerers :+ switcher).foreach(_.join(120_000))
            done.set(true)
            pump.join(120_000)

            // Everything still held is released by the ordinary best-effort residence bound.
            clock.advance(graceMs + 1)
            var draining = true
            while draining do
                val resolved = orderingLock.synchronized(merge.sweepStalled())
                record(resolved)
                draining = resolved.nonEmpty

            val out = delivered.asScala.toVector
            val expected = streams.indices.flatMap(s => (0 until perStream).map(i => f"m-$s-$i%04d")).toSet
            assertTrue(
                switched.get,
                workers.forall(!_.isAlive),
                otherOutcomes.asScala.toVector.isEmpty, // no drops, no requeues: nobody offered a copy
                out.size == expected.size,
                out.toSet == expected, // nothing lost
                out.distinct.size == out.size, // nothing doubled
                merge.heldCount == 0
            ) ?? (s"delivered=${out.size}/${expected.size} duplicates=${out.size - out.distinct.size} " +
                s"missing=${(expected -- out.toSet).size} held=${merge.heldCount} other=${otherOutcomes.asScala.toVector.take(5)}")
        }
    ) @@ TestAspect.sequential
