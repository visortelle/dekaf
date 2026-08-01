package consumer.session_runner

import org.apache.pulsar.client.impl.{BatchMessageIdImpl, MessageIdImpl}
import zio.test.*

/** The two GLOBAL start-from contracts: "skip the first n" and "the latest n" are counted over ALL
  * physical topics of a session, ordered by publish time - not per partition.
  *
  * Contract change context: both modes used to be per physical topic. "Latest 2" on a 3-partition
  * topic delivered SIX messages (the last 2 of each partition), and "skip 5" dropped whichever 5
  * arrived first out of the broker's arbitrary interleaving. Both are now defined over the merged
  * stream, ordered by publish time.
  *
  * The two algorithms differ, and the memory profile is the reason. Skip-N is a streaming k-way
  * merge holding ONE message per topic, because n has deliberately no cap and buffering n messages
  * would let a typed number exhaust the heap. Latest-N is a bounded top-n heap of exactly n, because
  * the last n cannot be known until every partition has been read to its end.
  *
  * Everything here is driven with plain values through the pure state machines: no broker, and no
  * mock.
  */
object globalStartFromTest extends ZIOSpecDefault:

    private val p0 = "persistent://public/default/t-partition-0"
    private val p1 = "persistent://public/default/t-partition-1"
    private val p2 = "persistent://public/default/t-partition-2"

    /** One delivered message as the ordering layers see it. `value` is what the user would read. */
    private final case class Arrival(streamId: String, key: MessageOrderKey, atBacklogEnd: Boolean, value: String)

    private def at(publishTime: Long, topicFqn: String, entryId: Long, batchIndex: Int = -1): MessageOrderKey =
        MessageOrderKey(publishTime = publishTime, topicFqn = topicFqn, ledgerId = 1L, entryId = entryId, batchIndex = batchIndex)

    /** A partition's whole backlog: entry ids run 0..k-1 and the LAST message is flagged as the end
      * of the pre-existing backlog, exactly as the runtime flags it.
      */
    private def backlog(topicFqn: String, messages: (Long, String)*): Vector[Arrival] =
        messages.toVector.zipWithIndex.map { case ((publishTime, value), entryId) =>
            Arrival(topicFqn, at(publishTime, topicFqn, entryId), atBacklogEnd = entryId == messages.size - 1, value)
        }

    private final case class Run(
        dropped: Vector[String],
        delivered: Vector[String],
        maxHeld: Int,
        leftHeld: Int
    )

    private def drive[M <: StartFromMerge[String]](merge: M, arrivals: Vector[Arrival]): Run =
        var maxHeld = 0
        val out = arrivals.flatMap { arrival =>
            val resolved = merge.offer(arrival.streamId, arrival.key, arrival.atBacklogEnd, arrival.value)
            maxHeld = maxHeld max merge.heldCount
            resolved
        }
        Run(
            dropped = out.collect { case (value, StartFromOutcome.Drop) => value },
            delivered = out.collect { case (value, StartFromOutcome.Deliver) => value },
            maxHeld = maxHeld,
            leftHeld = merge.heldCount
        )

    private def skip(n: Long, streams: Vector[String], arrivals: Vector[Arrival], maxHeld: Int = startFromMergeMaxHeld): Run =
        drive(GlobalSkipMerge[String](streams, drainedAtStart = Set.empty, discard = StartFromDiscard.shared(n), maxHeld = maxHeld), arrivals)

    /** Round-robin across partitions - the shape the broker actually delivers a partitioned topic
      * in, and the shape under which "first n delivered" and "globally first n" differ.
      */
    private def interleave(streams: Vector[Arrival]*): Vector[Arrival] =
        val rounds = streams.toVector
        val longest = rounds.map(_.size).maxOption.getOrElse(0)
        (0 until longest).toVector.flatMap(i => rounds.flatMap(stream => stream.lift(i)))

    private val orderSuite = suite("the total order")(
        test("publish time decides first") {
            val earlier = at(100, p2, entryId = 9)
            val later = at(101, p0, entryId = 0)
            assertTrue(MessageOrderKey.ordering.lt(earlier, later))
        },
        test("a publish-time tie is broken by topic name, then by position in the log") {
            // Ties are the COMMON case: a fast producer stamps many messages with one millisecond.
            val a = at(100, p0, entryId = 5)
            val b = at(100, p1, entryId = 0)
            val c = at(100, p1, entryId = 1)
            assertTrue(MessageOrderKey.ordering.lt(a, b), MessageOrderKey.ordering.lt(b, c))
        },
        test("messages inside one batched entry order by batch index") {
            val first = at(100, p0, entryId = 3, batchIndex = 0)
            val second = at(100, p0, entryId = 3, batchIndex = 1)
            assertTrue(MessageOrderKey.ordering.lt(first, second))
        },
        test("an unbatched message sorts before batch index 0 of the same entry, never equal to it") {
            val unbatched = at(100, p0, entryId = 3)
            val batched = at(100, p0, entryId = 3, batchIndex = 0)
            assertTrue(MessageOrderKey.ordering.lt(unbatched, batched), unbatched != batched)
        },
        test("the order is TOTAL - two different shuffles of the same messages sort identically") {
            // Without a full tiebreak this is exactly what flakes: the result would depend on the
            // order the broker happened to deliver in.
            val keys = Vector(
                at(100, p0, 0), at(100, p1, 0), at(100, p1, 1), at(100, p2, 0),
                at(101, p0, 1), at(101, p0, 2), at(99, p2, 7)
            )
            val oneWay = scala.util.Random(1).shuffle(keys).sorted(MessageOrderKey.ordering)
            val otherWay = scala.util.Random(2).shuffle(keys).sorted(MessageOrderKey.ordering)
            assertTrue(oneWay == otherWay, oneWay.distinct.size == keys.size)
        }
    )

    private val backlogEndSuite = suite("finding the end of the pre-existing backlog")(
        test("a message before the last entry is still backlog") {
            assertTrue(!isPastBacklogEnd(EntryPosition(1, 4, -1, 1), EntryPosition(1, 9, -1, 1)))
        },
        test("the last entry of the log ends the backlog") {
            assertTrue(isPastBacklogEnd(EntryPosition(1, 9, -1, 1), EntryPosition(1, 9, -1, 1)))
        },
        test("a message published after the session started is past the end") {
            assertTrue(isPastBacklogEnd(EntryPosition(1, 12, -1, 1), EntryPosition(1, 9, -1, 1)))
        },
        test("a later ledger is past the end even with a smaller entry id") {
            // Entry ids restart at 0 in each ledger, so comparing entry ids alone would declare a
            // fresh ledger to be backlog forever and stall the merge.
            assertTrue(isPastBacklogEnd(EntryPosition(2, 0, -1, 1), EntryPosition(1, 9, -1, 1)))
        },
        test("a batched end is reached only at its own batch index, not at the start of its entry") {
            val end = EntryPosition(1, 9, 4, 5)
            assertTrue(
                !isPastBacklogEnd(EntryPosition(1, 9, 0, 5), end),
                !isPastBacklogEnd(EntryPosition(1, 9, 3, 5), end),
                isPastBacklogEnd(EntryPosition(1, 9, 4, 5), end)
            )
        },
        test("an end reported without a batch index still waits for the whole final batch") {
            // getLastMessageId may answer with a bare entry id even when that entry is a batch;
            // ending at batch index 0 would throw away the rest of the newest batch.
            val end = EntryPosition(1, 9, -1, 1)
            assertTrue(
                !isPastBacklogEnd(EntryPosition(1, 9, 0, 10), end),
                !isPastBacklogEnd(EntryPosition(1, 9, 8, 10), end),
                isPastBacklogEnd(EntryPosition(1, 9, 9, 10), end)
            )
        },
        test("MessageId.earliest resolves to EXACTLY the canonical empty position") {
            // VERIFIED against Pulsar 3.2.1: an empty topic answers getLastMessageIds with
            // MessageId.earliest, whose ledger and entry are -1 and whose batch size is 0. Mapping
            // that to (-1, -1, -1, 1) left it merely NEAR the empty position and not equal to it -
            // and "nothing retained" is recognised by equality, so an empty partition was waited on
            // forever. A live 3-partition "latest 2" with one empty partition delivered ZERO.
            val fromEarliest = EntryPosition.of(org.apache.pulsar.client.api.MessageId.earliest)
            val fromNegativeId = EntryPosition.of(new MessageIdImpl(-1L, -1L, -1))
            assertTrue(fromEarliest == EntryPosition.empty, fromNegativeId == EntryPosition.empty) ??
                s"earliest -> $fromEarliest, (-1,-1) -> $fromNegativeId, empty is ${EntryPosition.empty}"
        },
        test("an empty topic is drained by anything at all") {
            assertTrue(isPastBacklogEnd(EntryPosition(0, 0, -1, 1), EntryPosition.empty))
        },
        test("a plain message id becomes an unbatched position") {
            val position = EntryPosition.of(new MessageIdImpl(7L, 3L, 0))
            assertTrue(position == EntryPosition(7L, 3L, -1, 1))
        },
        test("a batched message id keeps its index and its batch size") {
            val position = EntryPosition.of(new BatchMessageIdImpl(7L, 3L, 0, 2, 10, null))
            assertTrue(position == EntryPosition(7L, 3L, 2, 10))
        }
    )

    /** Three partitions whose publish times interleave, so the global order is NOT the per-partition
      * order and not the delivery order either. Globally, by publish time:
      * a1 a2 b1 c1 a3 b2 c2 b3 c3
      */
    private val threePartitions = Vector(
        backlog(p0, 10L -> "a1", 20L -> "a2", 50L -> "a3"),
        backlog(p1, 30L -> "b1", 60L -> "b2", 80L -> "b3"),
        backlog(p2, 40L -> "c1", 70L -> "c2", 90L -> "c3")
    )

    private val globalOrder = Vector("a1", "a2", "b1", "c1", "a3", "b2", "c2", "b3", "c3")

    private val skipSuite = suite("skip the globally-first n")(
        test("drops the globally-first n by publish time, not the first n the broker delivered") {
            // THE contract change. Round-robin delivery offers a1 b1 c1 a2 b2 c2 ..., so the old
            // arrival-order counter dropped a1 b1 c1 - two of which are NOT among the three oldest.
            val run = skip(3, Vector(p0, p1, p2), interleave(threePartitions*))
            assertTrue(
                run.dropped == globalOrder.take(3),
                run.delivered == globalOrder.drop(3)
            ) ?? s"dropped=${run.dropped} delivered=${run.delivered}"
        },
        test("the count is exactly n, whatever the interleaving") {
            val counts = Vector(0, 1, 4, 8, 9).map(n => n -> skip(n, Vector(p0, p1, p2), interleave(threePartitions*)))
            assertTrue(counts.forall((n, run) => run.dropped.size == n && run.delivered.size == 9 - n)) ??
                s"${counts.map((n, run) => s"n=$n dropped=${run.dropped.size}")}"
        },
        test("the messages left are exactly the globally-latest ones, in order") {
            val run = skip(6, Vector(p0, p1, p2), interleave(threePartitions*))
            assertTrue(run.delivered == Vector("c2", "b3", "c3"), run.dropped == globalOrder.take(6))
        },
        test("the messages HELD at the cut are released in global order") {
            // Scoped deliberately: this is a claim about the batch the merge was still holding when
            // the budget ran out, which it sorts before releasing. It is NOT a claim about
            // everything that arrives afterwards - see the post-cut suite below.
            //
            // The cut lands the moment the LAST unit is claimed (dropping a1 then a2), so the
            // sorted batch is b1 c1 - what was held at that instant - and everything after passes
            // through in ARRIVAL order (b2 c2 a3 b3 c3). The old code kept merging until a later
            // claim ANSWERED no, which happened to widen the sorted batch; that wait is exactly
            // what held boundary messages hostage when the Nth drop emptied a waited-for stream.
            val run = skip(2, Vector(p0, p1, p2), interleave(threePartitions*))
            assertTrue(
                run.dropped == globalOrder.take(2),
                run.delivered == Vector("b1", "c1") ++ Vector("b2", "c2", "a3", "b3", "c3")
            ) ?? s"dropped=${run.dropped} delivered=${run.delivered}"
        },
        test("skipping more than the session holds delivers nothing and drops all of it") {
            val run = skip(100, Vector(p0, p1, p2), interleave(threePartitions*))
            assertTrue(run.delivered.isEmpty, run.dropped.size == 9)
        },
        test("HOLDS AT MOST ONE MESSAGE PER TOPIC - never n") {
            // The memory contract. n has no cap: a merge that buffered n to sort it would let a
            // typed number exhaust the heap.
            val big = Vector(
                backlog(p0, (1L to 400L).map(i => (i * 2, s"a$i"))*),
                backlog(p1, (1L to 400L).map(i => (i * 2 + 1, s"b$i"))*)
            )
            val run = skip(700, Vector(p0, p1), interleave(big*))
            assertTrue(run.maxHeld <= 2, run.dropped.size == 700, run.leftHeld == 0) ??
                s"held up to ${run.maxHeld} messages for a skip of 700"
        },
        test("a topic that has drained its backlog does not stall the merge") {
            // p1 holds one old message and nothing else. Without the +infinity rule the merge would
            // wait forever for a second p1 head and the session would show nothing.
            val arrivals = interleave(
                backlog(p0, 10L -> "a1", 20L -> "a2", 30L -> "a3"),
                backlog(p1, 5L -> "b1")
            )
            val run = skip(2, Vector(p0, p1), arrivals)
            assertTrue(run.dropped == Vector("b1", "a1"), run.delivered == Vector("a2", "a3"), run.leftHeld == 0)
        },
        test("a topic that was already empty at session start never stalls the merge") {
            val merge = GlobalSkipMerge[String](Vector(p0, p1), drainedAtStart = Set(p1), StartFromDiscard.shared(1))
            val run = drive(merge, backlog(p0, 10L -> "a1", 20L -> "a2"))
            assertTrue(run.dropped == Vector("a1"), run.delivered == Vector("a2"))
        },
        test("the same messages arriving in a different interleaving give the same answer") {
            // Determinism: without the full tiebreak the answer would follow the delivery order.
            val tied = Vector(
                backlog(p0, 100L -> "a1", 100L -> "a2"),
                backlog(p1, 100L -> "b1", 100L -> "b2"),
                backlog(p2, 100L -> "c1", 100L -> "c2")
            )
            val roundRobin = skip(3, Vector(p0, p1, p2), interleave(tied*))
            val oneAtATime = skip(3, Vector(p0, p1, p2), tied.flatten)
            assertTrue(roundRobin.dropped == oneAtATime.dropped, roundRobin.dropped == Vector("a1", "a2", "b1")) ??
                s"roundRobin=${roundRobin.dropped} oneAtATime=${oneAtATime.dropped}"
        },
        test("a single stream is exact without holding anything after the skip") {
            val run = skip(2, Vector(p0), backlog(p0, 10L -> "a1", 20L -> "a2", 30L -> "a3"))
            assertTrue(run.dropped == Vector("a1", "a2"), run.delivered == Vector("a3"), run.leftHeld == 0)
        },
        test("a silent stream cannot make the merge grow without bound - the hot SOURCE is paused, not bounced") {
            // p1 never delivers and never reaches its backlog end, so the merge can never know
            // whether p1 holds something older than p0's head. At the watermark it marks p0 for
            // PAUSE: in production the consumer stops delivering, so growth stops at the watermark
            // plus the in-flight overshoot. Nothing is handed back - a declined message's
            // redelivery races its own successors, which was the order bug - and nothing is
            // decided while a stream that could still contribute has not spoken.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(5), maxHeld = 4)
            (1L to 4L).foreach(i => merge.offer(p0, at(i, p0, i - 1), atBacklogEnd = false, s"a$i"))
            val pausedAtCap = merge.desiredPausedStreams
            // The pause is asynchronous, so a few in-flight messages still land: ACCEPTED, never bounced.
            val inFlight = merge.offer(p0, at(5, p0, 4), atBacklogEnd = false, "a5")
            assertTrue(
                pausedAtCap == Set(p0),
                inFlight.isEmpty,
                merge.heldCount == 5,
                merge.desiredPausedStreams == Set(p0),
                !merge.desiredPausedStreams.contains(p1) // the BLIND stream is never paused
            ) ?? s"pausedAtCap=$pausedAtCap inFlight=$inFlight held=${merge.heldCount}"
        },
        test("AT THE MEMORY CAP THE MERGE MUST NOT GUESS which messages to drop") {
            // The counterexample the cap used to answer wrongly: with n = 1 and room for two held
            // messages, p0 delivers 100 and 200 while p1 is delayed. Advancing at the cap dropped
            // p0/100 - and then p1 answered with 1, which was GLOBALLY EARLIEST and should have
            // been the one message dropped, but was delivered instead.
            //
            // The count was exact either way; the SET was not, and the set is the contract.
            val arrivals = Vector(
                Arrival(p0, at(100, p0, 0), atBacklogEnd = false, "a1"),
                Arrival(p0, at(200, p0, 1), atBacklogEnd = false, "a2"),
                Arrival(p1, at(1, p1, 0), atBacklogEnd = true, "b1")
            )
            val run = skip(1, Vector(p0, p1), arrivals, maxHeld = 2)
            assertTrue(
                run.dropped == Vector("b1"),
                run.delivered == Vector("a1", "a2")
            ) ?? s"dropped=${run.dropped} delivered=${run.delivered}"
        },
        test("arrivals past the watermark are ACCEPTED - the pause has a bounded overshoot, never a bounce") {
            // The pause takes effect asynchronously, so whatever was already in flight still
            // lands. Accepting it is safe (it is in its stream's append order) and refusing it
            // was the order bug. When the delayed stream finally speaks, everything held resolves
            // exactly as if the stream had never been slow at all.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1), maxHeld = 2)
            merge.offer(p0, at(100, p0, 0), atBacklogEnd = false, "a1")
            merge.offer(p0, at(200, p0, 1), atBacklogEnd = false, "a2")
            val pastWatermark = merge.offer(p0, at(300, p0, 2), atBacklogEnd = false, "a3")
            val pausedBefore = merge.desiredPausedStreams
            val afterDelayed = merge.offer(p1, at(1, p1, 0), atBacklogEnd = true, "b1")
            assertTrue(
                pastWatermark.isEmpty, // accepted and held, not bounced
                pausedBefore == Set(p0),
                afterDelayed == Vector(
                    "b1" -> StartFromOutcome.Drop,
                    "a1" -> StartFromOutcome.Deliver,
                    "a2" -> StartFromOutcome.Deliver,
                    "a3" -> StartFromOutcome.Deliver
                ),
                merge.desiredPausedStreams.isEmpty // the cut releases the pause
            ) ?? s"pastWatermark=$pastWatermark pausedBefore=$pausedBefore afterDelayed=$afterDelayed"
        },
        test("the stream the merge is BLIND on is never paused - it is what unblocks the merge") {
            // Pausing everything at the cap would deadlock: the merge is waiting for exactly this
            // stream. A blind stream has an empty queue, so no watermark can ever mark it.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1), maxHeld = 1)
            merge.offer(p0, at(100, p0, 0), atBacklogEnd = false, "a1")
            val fromBlind = merge.offer(p1, at(50, p1, 0), atBacklogEnd = true, "b1")
            assertTrue(fromBlind == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Deliver)) ??
                s"the blind stream was refused at the cap and the merge could never advance: $fromBlind"
        },
        test("progress is read off the merge's own budget") {
            val discard = StartFromDiscard.shared(4)
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, discard)
            drive(merge, interleave(backlog(p0, 10L -> "a1", 20L -> "a2"), backlog(p1, 30L -> "b1", 40L -> "b2")))
            assertTrue(merge.progressDiscard.map(_.total) == Some(4L), merge.progressDiscard.map(_.remaining) == Some(0L))
        },
        test("n = 0 delivers everything and holds nothing") {
            val run = skip(0, Vector(p0, p1, p2), interleave(threePartitions*))
            assertTrue(run.dropped.isEmpty, run.delivered.size == 9, run.maxHeld == 0)
        }
    )

    /** A topic described from its END: element 0 is the LAST entry, as `(publish time, messages in
      * that entry)`. Entry ids are `"<topic>#<k>"`, so an assertion names the topic and how far
      * back the walk went.
      */
    private def entries(spec: Map[String, Vector[(Long, Int)]]): String => Long => Option[LogEntry[String]] =
        topicFqn =>
            k =>
                val log = spec.getOrElse(topicFqn, Vector.empty)
                Option.when(k >= 1 && k <= log.size) {
                    val (publishTime, messages) = log(k.toInt - 1)
                    LogEntry(s"$topicFqn#$k", publishTime, messages)
                }

    /** One unbatched entry per message, newest first. */
    private def unbatched(publishTimes: Long*): Vector[(Long, Int)] = publishTimes.toVector.map(_ -> 1)

    /** The entry order the walk uses on the `entries` labels: `#k` is the k-th entry from the END, so
      * a larger ordinal is strictly OLDER. The production comparator is `MessageIdImpl.compareTo`;
      * here the label carries the same information. */
    private def olderByHashOrdinal(a: String, b: String): Boolean = a.split("#").last.toInt > b.split("#").last.toInt

    /** The three partitions above as stored logs - newest entry first. */
    private val threeLogs = Map(
        p0 -> unbatched(50L, 20L, 10L),
        p1 -> unbatched(80L, 60L, 30L),
        p2 -> unbatched(90L, 70L, 40L)
    )

    private def cut(n: Long, spec: Map[String, Vector[(Long, Int)]]): Map[String, LatestNSeek[String]] =
        resolveLatestN(n, spec.keys.toVector.sorted, entries(spec), olderByHashOrdinal)

    /** THE LAST N, RESOLVED FROM ENTRY METADATA AND NOT FROM DELIVERED MESSAGES.
      *
      * Contract change context: "latest 2" on a 3-partition topic used to deliver SIX messages (the
      * last 2 of each partition). It was then narrowed to the globally-last two by a top-n HEAP of
      * delivered messages - which made the session's memory a number the user typed, let live
      * traffic evict the historical tail it was supposed to be picking from, and showed nothing at
      * all until every partition had drained.
      *
      * The cut is now computed BEFORE anything is delivered, by one merged backward walk over entry
      * metadata: take whichever topic's current entry was published latest, count its messages, step
      * that topic back one entry, repeat until n are accounted for. Every consumer then starts in
      * the right place and simply streams. Memory is one cursor per topic; nothing is buffered.
      */
    private val latestSuite = suite("resolve the cut for the globally-last n")(
        test("cuts exactly n across the whole session, not n per partition") {
            // THE contract change. Only the two partitions holding the newest messages contribute;
            // the third is ANCHORED at its inspected tail - that entry is delivered and dropped -
            // so it shows no history and still keeps anything published after the inspection.
            assertTrue(
                cut(2, threeLogs) == Map(
                    p0 -> LatestNSeek.FromEntry(s"$p0#1", 1L),
                    p1 -> LatestNSeek.FromEntry(s"$p1#1", 0L),
                    p2 -> LatestNSeek.FromEntry(s"$p2#1", 0L)
                )
            ) ?? s"${cut(2, threeLogs)}"
        },
        test("the cut is the global tail by publish time, spread over whichever partitions hold it") {
            // b2(60) c2(70) b3(80) c3(90) - so p1 and p2 each go two entries back, p0 none.
            assertTrue(
                cut(4, threeLogs) == Map(
                    p0 -> LatestNSeek.FromEntry(s"$p0#1", 1L),
                    p1 -> LatestNSeek.FromEntry(s"$p1#2", 0L),
                    p2 -> LatestNSeek.FromEntry(s"$p2#2", 0L)
                )
            ) ?? s"${cut(4, threeLogs)}"
        },
        test("a partition holding only older messages is ANCHORED at its inspected tail") {
            // Never at EARLIEST - that would show its whole log - and never at seek-time LATEST
            // either: the seek happens after the inspection, so "latest" would silently jump any
            // message published in between, where every CONTRIBUTING partition kept its concurrent
            // appends. The anchor is the tail the walk actually saw; that one entry is delivered
            // and dropped (a per-topic head-drop), which is exactly "everything after it".
            assertTrue(
                cut(1, threeLogs)(p0) == LatestNSeek.FromEntry(s"$p0#1", 1L),
                cut(1, threeLogs)(p1) == LatestNSeek.FromEntry(s"$p1#1", 1L)
            )
        },
        test("a non-contributing topic's BATCHED tail is anchored and dropped WHOLE") {
            // The anchor drop is counted in messages, so a 10-message batch tail costs a
            // 10-message head-drop - the seek can only land on the entry boundary.
            val spec = Map(p0 -> Vector(100L -> 10), p1 -> unbatched(200L))
            assertTrue(
                cut(1, spec) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 10L), p1 -> LatestNSeek.FromEntry(s"$p1#1", 0L))
            ) ?? s"${cut(1, spec)}"
        },
        test("the cut reaches back into a partition only as far as it has to") {
            // 5 asked for: c3(90) b3(80) c2(70) b2(60) a3(50) - p0 contributes its newest entry.
            assertTrue(
                cut(5, threeLogs) == Map(
                    p0 -> LatestNSeek.FromEntry(s"$p0#1", 0L),
                    p1 -> LatestNSeek.FromEntry(s"$p1#2", 0L),
                    p2 -> LatestNSeek.FromEntry(s"$p2#2", 0L)
                )
            ) ?? s"${cut(5, threeLogs)}"
        },
        test("HOLDS ONE ENTRY PER TOPIC - the answer never grows with n") {
            // The memory contract, and the whole reason the heap is gone. 900 messages over three
            // partitions, any n: the answer is three positions.
            val big = Map(
                p0 -> unbatched((1L to 300L).reverse.map(_ * 3)*),
                p1 -> unbatched((1L to 300L).reverse.map(_ * 3 + 1)*),
                p2 -> unbatched((1L to 300L).reverse.map(_ * 3 + 2)*)
            )
            assertTrue(cut(10, big).size == 3, cut(500, big).size == 3)
        },
        test("the walk asks the broker O(n / batch size) times, not once per partition per message") {
            // Strictly cheaper than the per-topic walks this replaced, which cost that PER TOPIC.
            var lookups = 0
            val counting: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    lookups += 1
                    entries(threeLogs)(topicFqn)(k)
            resolveLatestN(2, Vector(p0, p1, p2), counting, olderByHashOrdinal)
            // Three to prime the cursors, then one step after taking c3.
            assertTrue(lookups == 4) ?? s"$lookups lookups"
        },
        test("a batched entry contributes all its messages, and the overshoot is discarded at the head") {
            // A seek can only land on an entry boundary, so the only exact way to reach the n-th
            // message inside a batch is to seek to its entry and drop what precedes it.
            val batched = Map(p0 -> Vector(100L -> 10, 90L -> 10))
            assertTrue(cut(3, batched) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 7L))) ?? s"${cut(3, batched)}"
        },
        test("the overshoot lands on the topic the walk STOPPED on, and on no other") {
            // p2 contributes two unbatched entries (90, 85); the walk then takes p1's newest entry,
            // a batch of 10, for the single message still wanted - so 9 are dropped from p1's head
            // and NOTHING from p2's, whose two entries were both wanted in full.
            val mixed = Map(p1 -> Vector(80L -> 10), p2 -> unbatched(90L, 85L, 70L))
            assertTrue(
                cut(3, mixed) == Map(p1 -> LatestNSeek.FromEntry(s"$p1#1", 9L), p2 -> LatestNSeek.FromEntry(s"$p2#2", 0L))
            ) ?? s"${cut(3, mixed)}"
        },
        test("a session holding fewer than n messages shows all of it") {
            val small = Map(p0 -> unbatched(10L), p1 -> unbatched(20L))
            assertTrue(cut(50, small) == Map(p0 -> LatestNSeek.Everything, p1 -> LatestNSeek.Everything))
        },
        test("an empty partition contributes nothing and cannot hold the cut back") {
            // The heap had to wait for every partition to reach its recorded end before it could
            // release anything, so an empty or stalled partition showed the user zero messages.
            // A partition with no entries simply answers nothing here.
            val withEmpty = Map(p0 -> unbatched(30L, 20L, 10L), p1 -> Vector.empty[(Long, Int)])
            // The empty partition maps to EVERYTHING: it held nothing when inspected, so whatever
            // it holds at seek time arrived after the inspection - live traffic the session shows.
            assertTrue(cut(2, withEmpty) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#2", 0L), p1 -> LatestNSeek.Everything))
        },
        test("a publish-time tie is cut deterministically, by topic name") {
            // The same tiebreak [[MessageOrderKey]] uses, so an entry-level cut and a message-level
            // order cannot disagree.
            val tied = Map(p0 -> unbatched(100L, 100L), p1 -> unbatched(100L, 100L))
            assertTrue(
                cut(2, tied) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 1L), p1 -> LatestNSeek.FromEntry(s"$p1#2", 0L))
            ) ?? s"${cut(2, tied)}"
        },
        test("a clamping broker is detected within a bounded number of steps, not by the first repeat") {
            // `examineMessage` CLAMPS rather than fails on the earliest side; a Pulsar version that
            // clamped on the latest side too would otherwise make the running total grow forever.
            //
            // CHANGED EXPECTATION, deliberately: the old code concluded "exhausted" the instant an
            // entry id repeated and stopped in exactly 3 lookups. That same first repeat is what a
            // SINGLE concurrent append also produces (the moving anchor - see `movingAnchorSuite`),
            // so reading it as exhaustion was the whole-backlog bug. A clamp is now told apart from
            // an append by ONE VERIFICATION LOOKUP at the k that produced the last accepted entry -
            // a clamped end never moves, a grown end answers a newer entry - so it still resolves
            // to `Everything`, one lookup later than the old first-repeat guard.
            var lookups = 0
            val clamping: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    lookups += 1
                    val clamped = k.min(2).max(1)
                    Some(LogEntry(s"$topicFqn#$clamped", 100L - clamped, 3))
            val resolved = resolveLatestN(100, Vector(p0), clamping, olderByHashOrdinal)
            assertTrue(
                resolved == Map(p0 -> LatestNSeek.Everything),
                lookups > 3,
                lookups <= maxLatestNReanchorSteps + 4
            ) ?? s"resolved=$resolved lookups=$lookups (bound $maxLatestNReanchorSteps)"
        },
        test("a walk that outlives its TIME budget fails with guidance instead of grinding on") {
            // N bounds the request; TIME bounds the cost - an unbatched topic pays one broker
            // lookup per entry, and n alone cannot tell a thousand lookups from ten million.
            var clock = 0L
            val slowLog = Map(p0 -> unbatched((1L to 100L).reverse.map(_ * 10)*))
            val slow: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    clock += 1_000L // each lookup costs a second
                    entries(slowLog)(topicFqn)(k)
            val outcome = scala.util.Try(
                resolveLatestN(50, Vector(p0), slow, olderByHashOrdinal, resolveBudgetMs = 5_000L, nowMs = () => clock)
            )
            assertTrue(
                outcome.isFailure,
                outcome.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                outcome.failed.toOption.exists(_.getMessage.contains("budget"))
            ) ?? s"$outcome"
        },
        test("a walk inside its time budget is untouched by it") {
            var clock = 0L
            val counting: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    clock += 10L
                    entries(threeLogs)(topicFqn)(k)
            val resolved = resolveLatestN(2, Vector(p0, p1, p2), counting, olderByHashOrdinal, resolveBudgetMs = 5_000L, nowMs = () => clock)
            assertTrue(resolved.values.count { case LatestNSeek.FromEntry(_, _) => true; case _ => false } == 3)
        },
        test("n = 0 asks the broker nothing and positions everything at the live tail") {
            var lookups = 0
            val counting: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    lookups += 1
                    entries(threeLogs)(topicFqn)(k)
            val resolved = resolveLatestN(0, Vector(p0, p1), counting, olderByHashOrdinal)
            assertTrue(resolved == Map(p0 -> LatestNSeek.Nothing, p1 -> LatestNSeek.Nothing), lookups == 0)
        },
        test("one topic named twice is walked once") {
            // A session's topic vector is the concatenation of every enabled target's resolved
            // topics, and two targets may legitimately select the same topic.
            var lookups = 0
            val counting: String => Long => Option[LogEntry[String]] = topicFqn =>
                k =>
                    lookups += 1
                    entries(threeLogs)(topicFqn)(k)
            val resolved = resolveLatestN(1, Vector(p0, p0, p0), counting, olderByHashOrdinal)
            assertTrue(resolved == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 0L)), lookups == 1) ?? s"lookups=$lookups"
        }
    )

    /** A log with STABLE absolute entry ids `e1..eN` (e1 oldest), read the way
      * `examineMessage(topic, "latest", k)` reads it: the k-th entry counted back from the CURRENT
      * end. `appendsBefore` names the lookup ordinals at which a producer appends one entry FIRST -
      * i.e. the anchor the walk counts back from moves forward under it, exactly as it does when a
      * real producer writes during session creation. A frozen-log lambda cannot express this, which
      * is why every existing latest-n test missed the moving anchor.
      */
    private def growingLog(startEntries: Long, appendsBefore: Map[Int, Long] = Map.empty): (String => Long => Option[LogEntry[String]], () => Int) =
        var total = startEntries
        var lookups = 0
        val lambda: String => Long => Option[LogEntry[String]] = _ =>
            k =>
                lookups += 1
                total += appendsBefore.getOrElse(lookups, 0L)
                val idx = total - k + 1 // 1-based index from the start; 1 is the oldest retained entry
                Option.when(idx >= 1) { LogEntry(s"e$idx", idx * 10, 1) }
        (lambda, () => lookups)

    /** Older = smaller absolute index, which is how `MessageIdImpl.compareTo` orders real entry ids
      * (ledger, then entry). Shared by the growing-log tests so the walk can tell a strictly-older
      * answer from a re-anchored one. */
    private def olderByAbsoluteId(a: String, b: String): Boolean = a.drop(1).toLong < b.drop(1).toLong

    private val movingAnchorSuite = suite("the backward walk survives a log that grows under it")(
        test("a SINGLE append per gap is not misread as exhaustion - the whole backlog bug") {
            // e1..e10 at start; the last 3 are e8, e9, e10. One entry is appended just before the
            // SECOND lookup, so `latest, 2` answers e10 AGAIN (the anchor moved forward by one).
            // The old guard read that repeated id as "exhausted", fell back to EARLIEST, and a
            // request for the last 3 delivered the entire backlog while reporting success.
            val (log, _) = growingLog(startEntries = 10, appendsBefore = Map(2 -> 1L))
            val resolved = resolveLatestN(3, Vector(p0), log, olderByAbsoluteId)
            assertTrue(resolved == Map(p0 -> LatestNSeek.FromEntry("e8", 0L))) ??
                s"a single concurrent append turned 'latest 3' into ${resolved(p0)}"
        },
        test("a BURST of appends does not make the cursor jump forward and double-count") {
            // e1..e10 at start (last 4 = e7..e10); two entries land before the second lookup, so
            // `latest, 2` answers e11 - NEWER than the e10 just taken. Taking it walks the cursor
            // FORWARD off the contiguous suffix and double-counts, cutting the history too shallow
            // (the old code stopped at e9, hiding e7 and e8). The cut must still be the four that
            // were newest AT START, namely e7..e10; the two live appends stream in behind them.
            val (log, _) = growingLog(startEntries = 10, appendsBefore = Map(2 -> 2L))
            val resolved = resolveLatestN(4, Vector(p0), log, olderByAbsoluteId)
            assertTrue(resolved == Map(p0 -> LatestNSeek.FromEntry("e7", 0L))) ??
                s"a burst of concurrent appends cut 'latest 4' at ${resolved(p0)} instead of e7"
        },
        test("a log that OUTRUNS the walk for the whole bound fails LOUDLY, naming the topic") {
            // One entry lands before EVERY lookup, so the anchor moves exactly as fast as the walk
            // steps and `latest, k` keeps answering at or above the entry just taken, forever.
            // There is no honest "last n" on such a topic at this moment, and both silent endings
            // answer a question nobody asked: classifying it as exhaustion seeks EARLIEST (the
            // whole backlog as a successful session - the original defect), and stopping short
            // delivers fewer than n as success. Refusing is the only honest outcome, and it names
            // the topic so the user knows which producer to quiet down.
            val (log, lookups) = growingLog(startEntries = 200, appendsBefore = (1 to 1_000).map(i => i -> 1L).toMap)
            val outcome = scala.util.Try(resolveLatestN(5, Vector(p0), log, olderByAbsoluteId))
            assertTrue(
                outcome.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                outcome.failed.toOption.exists(_.getMessage.contains(p0)),
                // The refusal is BOUNDED: a prime, one ambiguous repeat plus its verification, and
                // at most the re-anchor budget of catch-up lookups - never an unbounded chase.
                lookups() <= maxLatestNReanchorSteps + 8
            ) ?? s"outcome=$outcome after ${lookups()} lookups"
        }
    )

    /** THE CONTRACT, STATED RATHER THAN APOLOGISED FOR: APPEND ORDER WITHIN A PARTITION, PUBLISH
      * TIME ACROSS PARTITIONS.
      *
      * Pulsar preserves APPEND order within a partition and stamps `publishTime` from the PRODUCER's
      * clock. Those two are not the same thing: several producers writing one partition, or one
      * producer whose clock steps back, append publish times that run backwards inside a single log.
      *
      * Neither counting mode reads a whole log, and neither can: "skip first n" is a streaming merge
      * over per-stream heads, "latest n" is a backward walk over per-topic entry cursors, and both
      * would have to buffer or scan an entire partition to notice that it is not in clock order.
      * That is O(topic) at any n, which is the cost both designs exist to avoid.
      *
      * So the guarantee is: the COUNT is exact without qualification, and WHICH messages make the
      * cut is exact as far as each log really is in publish-time order. These tests pin that as the
      * real behaviour - including the case where it visibly differs from an exact publish-time
      * answer - so no documentation, UI label or downstream test can claim more than the code does.
      * The UI labels ("Skip first n messages", "Latest n messages") must not imply otherwise.
      */
    private val nonMonotonicSuite = suite("the contract: append order within a partition")(
        test("a stream whose publish times run backwards is NOT resorted") {
            // p0's second message is stamped OLDER than its first - two producers, or one clock
            // that stepped back. Globally by publish time the oldest message is a2 (1), so an
            // order-by-publish-time contract would drop a2. The merge drops b1 (50) instead,
            // because within p0 it takes the log's order as given and a2 is not yet a head.
            val arrivals = Vector(
                Arrival(p0, at(100, p0, 0), atBacklogEnd = false, "a1"),
                Arrival(p1, at(50, p1, 0), atBacklogEnd = true, "b1"),
                Arrival(p0, at(1, p0, 1), atBacklogEnd = true, "a2")
            )
            val run = skip(1, Vector(p0, p1), arrivals)
            assertTrue(
                run.dropped == Vector("b1"),
                run.delivered == Vector("a1", "a2")
            ) ?? s"dropped=${run.dropped} delivered=${run.delivered}"
        },
        test("an INTERIOR clock reversal is not resorted either, and the count survives it") {
            // Not merely at the tail: p0's middle message is the oldest thing in the session. An
            // exact publish-time contract would drop a2(1) and a3(5); the merge drops a1(100) and
            // a2(1), because a3 is not a head until a2 has been taken.
            val arrivals = Vector(
                Arrival(p0, at(100, p0, 0), atBacklogEnd = false, "a1"),
                Arrival(p0, at(1, p0, 1), atBacklogEnd = false, "a2"),
                Arrival(p0, at(5, p0, 2), atBacklogEnd = true, "a3"),
                Arrival(p1, at(200, p1, 0), atBacklogEnd = true, "b1")
            )
            val run = skip(2, Vector(p0, p1), arrivals)
            assertTrue(
                run.dropped == Vector("a1", "a2"),
                run.delivered == Vector("a3", "b1")
            ) ?? s"dropped=${run.dropped} delivered=${run.delivered}"
        },
        test("the COUNT is exact even when a stream's clock runs backwards") {
            // The half of the contract that does survive: n messages are dropped, whatever the
            // producer clocks did. Only WHICH n is approximate.
            val arrivals = Vector(
                Arrival(p0, at(100, p0, 0), atBacklogEnd = false, "a1"),
                Arrival(p1, at(50, p1, 0), atBacklogEnd = false, "b1"),
                Arrival(p0, at(1, p0, 1), atBacklogEnd = true, "a2"),
                Arrival(p1, at(2, p1, 1), atBacklogEnd = true, "b2")
            )
            val counts = Vector(0, 1, 2, 3, 4).map(n => n -> skip(n, Vector(p0, p1), arrivals))
            assertTrue(counts.forall((n, run) => run.dropped.size == n && run.delivered.size == 4 - n)) ??
                s"${counts.map((n, run) => s"n=$n dropped=${run.dropped.size} delivered=${run.delivered.size}")}"
        },
        test("LATEST-N CUTS BY APPEND POSITION TOO - a buried high-timestamp message is not found") {
            // p0's newest ENTRY is stamped 1 while an older entry of the same log is stamped 100.
            // An exact publish-time answer for "the latest 1" would be that buried a1(100). The
            // walk compares each topic's CURRENT entry, so it sees p0 offering 1, prefers p1's
            // 50, and never looks deeper into p0.
            //
            // Deliberate, and it is the same limit as everywhere else here: finding that message
            // would mean scanning the whole log. Recorded as behaviour so the contract and the code
            // cannot drift apart - NOT as the answer an exact publish-time contract would give.
            val reversed = Map(p0 -> unbatched(1L, 100L), p1 -> unbatched(50L))
            assertTrue(
                cut(1, reversed) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 1L), p1 -> LatestNSeek.FromEntry(s"$p1#1", 0L))
            ) ?? s"${cut(1, reversed)}"
        },
        test("the COUNT of a latest-n cut is exact even when a log's clock ran backwards") {
            val reversed = Map(p0 -> unbatched(1L, 100L), p1 -> unbatched(50L))
            // Two asked for: p1's only entry, then p0's newest. Exactly two messages, whatever the
            // clocks did.
            assertTrue(
                cut(2, reversed) == Map(p0 -> LatestNSeek.FromEntry(s"$p0#1", 0L), p1 -> LatestNSeek.Everything)
            ) ?? s"${cut(2, reversed)}"
        }
    )

    /** WHAT HAPPENS AFTER THE SKIP'S BUDGET IS SPENT.
      *
      * The merge exists to decide WHICH n messages are dropped. Once the budget is spent it stops
      * merging entirely and every later message is passed straight through, because continuing to
      * merge would mean holding a message from every stream for the whole life of the session -
      * unbounded memory for a session that is now just streaming.
      *
      * So the delivery SEQUENCE after the cut is the order the brokers delivered in, one listener
      * thread per physical topic. Pinned here so no documentation or downstream test can claim a
      * global ordering that the code deliberately does not provide.
      */
    private val postCutSuite = suite("delivery order after the cut")(
        test("the budget's LAST unit finishes the skip immediately - no N+1st head is waited for") {
            // Skip 1 over two streams; the drop EMPTIES p1, which is not at its backlog end. The
            // old code kept `dropping` true until a LATER claim answered no, so it went blind on
            // p1 and held a1 hostage - for up to the whole stall window - to learn something the
            // spent budget had already decided.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1))
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1") // held; p1 blind
            val resolved = merge.offer(p1, at(5, p1, 0), atBacklogEnd = false, "b1")
            assertTrue(
                resolved == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Deliver),
                merge.heldCount == 0
            ) ?? s"resolved=$resolved held=${merge.heldCount}"
        },
        test("settleIfDone flips exactly when the budget is spent and nothing is held - and only then") {
            // The settled flag is what lets the session drop its ordering lock for the rest of its
            // life, so it must never flip early - and it only flips when ASKED, after the settling
            // batch has been fully handled by the listener.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1))
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            merge.settleIfDone()
            val midSkip = merge.isSettled // still dropping, one message held: must stay false
            merge.offer(p1, at(5, p1, 0), atBacklogEnd = true, "b1") // spends the budget, drains a1
            val beforeAsked = merge.isSettled // one-way, but only settleIfDone may flip it
            merge.settleIfDone()
            assertTrue(!midSkip, !beforeAsked, merge.isSettled)
        },
        test("after the cut, a later message can be delivered before an older one from another stream") {
            // Both streams are individually monotonic, so this is not the clock problem above: it
            // is simply that nothing is held back once the skip is done.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1))
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            val atCut = merge.offer(p1, at(5, p1, 0), atBacklogEnd = true, "b1")
            val afterA = merge.offer(p0, at(100, p0, 1), atBacklogEnd = false, "a2")
            val afterB = merge.offer(p1, at(30, p1, 1), atBacklogEnd = false, "b2")

            assertTrue(
                atCut == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Deliver),
                afterA == Vector("a2" -> StartFromOutcome.Deliver),
                afterB == Vector("b2" -> StartFromOutcome.Deliver),
                merge.heldCount == 0
            ) ?? s"a2 (published at 100) was delivered before b2 (published at 30): atCut=$atCut afterA=$afterA afterB=$afterB"
        },
        test("nothing at all is held once the budget is spent") {
            // The memory half of the same decision, and the reason it is not going to change.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(1))
            merge.offer(p1, at(5, p1, 0), atBacklogEnd = true, "b1")
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            (1 to 500).foreach(i => merge.offer(p0, at(1000L + i, p0, i.toLong), atBacklogEnd = false, s"a$i"))
            assertTrue(merge.heldCount == 0)
        }
    )

    /** A silent waited-for stream must not hold the merge forever. */
    private val stallSuite = suite("a stream that never speaks is bounded and surfaced, not waited on forever")(
        test("RESETTING the stall clock hands a silent stream a fresh window - paused time proves nothing") {
            // The runner resets on RESUME: a pause holds every source, so a stream that was blind
            // for one second before a five-minute pause must get a full window after it - the old
            // wall-clock accounting abandoned it on the first sweep after resume.
            var clock = 1_000L
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(1),
                maxHeld = 2,
                stallWindowMs = startFromMergeStallWindowMs,
                nowMs = () => clock
            )
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1") // held; p1 blind
            clock += startFromMergeStallWindowMs - 1_000 // a long user pause elapses
            merge.resetStallClock()                       // resume
            clock += 2_000                                // two REAL seconds after resume
            val justAfterResume = merge.sweepStalled()    // old code: gave up here (31s elapsed)
            val stillWaiting = merge.waitingOn.contains(p1)
            clock += startFromMergeStallWindowMs + 1      // a full window of real silence
            val afterRealWindow = merge.sweepStalled()
            assertTrue(
                justAfterResume.isEmpty,
                stillWaiting,
                afterRealWindow == Vector("a1" -> StartFromOutcome.Drop),
                merge.heldCount == 0
            ) ?? s"justAfterResume=$justAfterResume stillWaiting=$stillWaiting afterRealWindow=$afterRealWindow"
        },
        test("a stream silent past the give-up window is abandoned and the merge advances") {
            // p1's backlog was trimmed after the session recorded its end, so it delivers nothing.
            // p0 reaches the watermark and is marked for PAUSE (its in-flight tail still lands).
            // Once p1 has stayed silent past the window the merge stops waiting for it, drains
            // what it held, and carries on - instead of holding a paused world forever in silence.
            var clock = 1_000L
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(1),
                maxHeld = 2,
                stallWindowMs = startFromMergeStallWindowMs,
                nowMs = () => clock
            )
            val a1 = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1") // held; p1 blind
            val a2 = merge.offer(p0, at(20, p0, 1), atBacklogEnd = false, "a2") // held; watermark reached
            val a3 = merge.offer(p0, at(30, p0, 2), atBacklogEnd = false, "a3") // in-flight overshoot: accepted, p0 marked for pause
            val pausedWhileBlind = merge.desiredPausedStreams
            val waitingBefore = merge.waitingOn

            clock += startFromMergeStallWindowMs + 1 // p1 still silent, past the window
            val afterGiveUp = merge.offer(p0, at(40, p0, 3), atBacklogEnd = false, "a4")

            assertTrue(
                a1.isEmpty,
                a2.isEmpty,
                a3.isEmpty,
                pausedWhileBlind == Set(p0),
                waitingBefore == Set(p1),
                afterGiveUp == Vector(
                    "a1" -> StartFromOutcome.Drop,
                    "a2" -> StartFromOutcome.Deliver,
                    "a3" -> StartFromOutcome.Deliver,
                    "a4" -> StartFromOutcome.Deliver
                ),
                !merge.waitingOn.contains(p1) // p1 was abandoned; p0 is momentarily empty but still legitimately waited for
            ) ?? s"pausedWhileBlind=$pausedWhileBlind waitingBefore=$waitingBefore afterGiveUp=$afterGiveUp stillWaiting=${merge.waitingOn}"
        },
        test("the SWEEP gives up with NO further offer - the last backlog message has nobody behind it") {
            // p0 delivered everything it had and ended its backlog; p1 was trimmed and never
            // speaks. The offer-driven check can never run again - there are no offers left - so
            // only the time-driven sweep can honour the window. It used to hang forever here.
            var clock = 1_000L
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(1),
                maxHeld = 2,
                stallWindowMs = startFromMergeStallWindowMs,
                nowMs = () => clock
            )
            val a1 = merge.offer(p0, at(10, p0, 0), atBacklogEnd = true, "a1") // p0's LAST message; p1 blind
            val beforeSweep = merge.sweepStalled() // window not yet passed: nothing moves

            clock += startFromMergeStallWindowMs + 1
            val swept = merge.sweepStalled()

            assertTrue(
                a1.isEmpty,
                beforeSweep.isEmpty,
                swept == Vector("a1" -> StartFromOutcome.Drop),
                merge.heldCount == 0
            ) ?? s"beforeSweep=$beforeSweep swept=$swept held=${merge.heldCount}"
        },
        test("a stream that speaks before the window is NOT given up on - a slow stream is not cut") {
            var clock = 1_000L
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                drainedAtStart = Set.empty,
                discard = StartFromDiscard.shared(1),
                maxHeld = 2,
                stallWindowMs = startFromMergeStallWindowMs,
                nowMs = () => clock
            )
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            clock += startFromMergeStallWindowMs - 1 // just under the window
            val stillWaiting = merge.waitingOn
            // p1 finally speaks: its message is the globally-earliest, so it is dropped and a1 delivered.
            val fromP1 = merge.offer(p1, at(5, p1, 0), atBacklogEnd = true, "b1")
            assertTrue(
                stillWaiting == Set(p1),
                fromP1 == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Deliver)
            ) ?? s"stillWaiting=$stillWaiting fromP1=$fromP1"
        }
    )

    /** The exactness limit at the cap boundary - documented, not fixed (see [[startFromMergeMaxHeld]]). */
    private val capBoundarySuite = suite("the watermark keeps the COUNT exact but not always WHICH n")(
        test("a NON-MONOTONIC log can still cross streams at the boundary - the append-order contract, not the flow control") {
            // p0's log is not in publish-time order (two producers, or a clock that stepped back):
            // its entries append as A(10), B(40), C(20). All three are accepted - nothing is
            // declined any more - and the drops follow HEAD order: A(10) against b1(50), then
            // B(40), because C sits BEHIND B in its own log. The COUNT is exactly 2; the SET is
            // the append-order answer: the globally-earliest two by publish time are A(10) and
            // C(20), but C cannot be seen past B. This is [[MessageOrderKey]]'s documented
            // contract surfacing - reordering a stream against its own log would mean reading the
            // whole log - and no watermark or pause changes it. Pinned so the limit stays
            // documented rather than believed away.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(2), maxHeld = 2)
            val a = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "A")
            val b = merge.offer(p0, at(40, p0, 1), atBacklogEnd = false, "B")
            val c = merge.offer(p0, at(20, p0, 2), atBacklogEnd = false, "C") // accepted past the watermark
            val resolved = merge.offer(p1, at(50, p1, 0), atBacklogEnd = true, "b1")
            val droppedSet = resolved.collect { case (v, StartFromOutcome.Drop) => v }.toSet
            assertTrue(
                a.isEmpty,
                b.isEmpty,
                c.isEmpty,
                resolved == Vector(
                    "A" -> StartFromOutcome.Drop,
                    "B" -> StartFromOutcome.Drop,
                    "C" -> StartFromOutcome.Deliver,
                    "b1" -> StartFromOutcome.Deliver
                ),
                droppedSet == Set("A", "B"), // the limit: C(20) should have been dropped instead of B(40)
                !droppedSet.contains("C")
            ) ?? s"resolved=$resolved"
        }
    )

    /** FLOW CONTROL REPLACED DECLINING, AND WITH IT THE WHOLE OVERTAKE CLASS.
      *
      * A declined message came back through broker redelivery while its successors kept arriving,
      * so a stream could re-enter the merge out of its own append order - the one premise a k-way
      * merge cannot survive. The floor guard held the door for the FIRST declined message, but
      * successors declined BY THE GUARD were not remembered: two of them returning out of order
      * could still spend the budget's last unit on the wrong message, on a perfectly monotonic
      * stream. Nothing is declined now - hot sources are PAUSED - so there is nothing to return
      * out of order, and the counterexample is structurally impossible: the first test drives the
      * exact sequence that used to break.
      */
    private val flowControlSuite = suite("hot sources are paused, and a stream can no longer overtake itself")(
        test("THE OLD COUNTEREXAMPLE IS GONE: the exact set survives a full merge on a monotonic stream") {
            // Skip 5, room for 2. Under declining: t7 bounced at the cap, t8 bounced by the floor
            // guard UNREMEMBERED, t7's return cleared the floor, and t9 could then spend the last
            // unit while t8 was still in flight - dropped {t1,t5,t6,t7,t9}, t8 delivered. Under
            // pause the arrivals are simply accepted in order and the dropped set is exactly the
            // first five of the merged stream: {t1,t5,t6,t7,t8}.
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.shared(5), maxHeld = 2)
            val h5 = merge.offer(p1, at(50, p1, 0), atBacklogEnd = false, "t5")
            val h6 = merge.offer(p1, at(60, p1, 1), atBacklogEnd = false, "t6")
            val h7 = merge.offer(p1, at(70, p1, 2), atBacklogEnd = false, "t7") // past the watermark: accepted, p1 marked for pause
            val burst = merge.offer(p0, at(10, p0, 0), atBacklogEnd = true, "t1")
            val t8 = merge.offer(p1, at(80, p1, 3), atBacklogEnd = false, "t8")
            val t9 = merge.offer(p1, at(90, p1, 4), atBacklogEnd = false, "t9")

            val dropped = (burst ++ t8 ++ t9).collect { case (v, StartFromOutcome.Drop) => v }
            assertTrue(
                h5.isEmpty,
                h6.isEmpty,
                h7.isEmpty,
                merge.desiredPausedStreams.isEmpty, // budget spent at t8: the pause lifted with it
                burst == Vector(
                    "t1" -> StartFromOutcome.Drop,
                    "t5" -> StartFromOutcome.Drop,
                    "t6" -> StartFromOutcome.Drop,
                    "t7" -> StartFromOutcome.Drop
                ),
                t8 == Vector("t8" -> StartFromOutcome.Drop),
                t9 == Vector("t9" -> StartFromOutcome.Deliver),
                dropped.toSet == Set("t1", "t5", "t6", "t7", "t8")
            ) ?? s"burst=$burst t8=$t8 t9=$t9 paused=${merge.desiredPausedStreams}"
        },
        test("a stream paused for its own queue RESUMES once it drains below the low watermark") {
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                Set.empty,
                StartFromDiscard.shared(10),
                pauseStreamAt = 3,
                resumeStreamAt = 1
            )
            merge.offer(p0, at(30, p0, 0), atBacklogEnd = false, "a1")
            merge.offer(p0, at(40, p0, 1), atBacklogEnd = false, "a2")
            merge.offer(p0, at(50, p0, 2), atBacklogEnd = false, "a3")
            val pausedAtHigh = merge.desiredPausedStreams
            // p1's NEWER head lets the merge drain p0's whole queue - well under the low watermark.
            merge.offer(p1, at(100, p1, 0), atBacklogEnd = true, "b1")
            val afterDrain = merge.desiredPausedStreams
            assertTrue(
                pausedAtHigh == Set(p0),
                afterDrain.isEmpty,
                merge.heldCount == 1 // only b1: p0 drained and is blind again, so its pause lifted
            ) ?? s"pausedAtHigh=$pausedAtHigh afterDrain=$afterDrain held=${merge.heldCount}"
        },
        test("the BYTE watermark pauses a fat stream that the count watermarks would never notice") {
            val merge = GlobalSkipMerge[String](
                Vector(p0, p1),
                Set.empty,
                StartFromDiscard.shared(5),
                pauseBytesAt = 10L,
                resumeBytesAt = 5L,
                payloadBytesOf = (v: String) => v.length.toLong
            )
            merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "aaaaaa") // 6 bytes: under
            val underBytes = merge.desiredPausedStreams
            merge.offer(p0, at(20, p0, 1), atBacklogEnd = false, "bbbbbb") // 12 bytes total: over
            val overBytes = merge.desiredPausedStreams
            assertTrue(
                underBytes.isEmpty,
                overBytes == Set(p0),
                merge.heldBytesCount == 12L,
                !overBytes.contains(p1) // blind, and empty-queued: never paused
            ) ?? s"under=$underBytes over=$overBytes heldBytes=${merge.heldBytesCount}"
        }
    )

    /** A broker unload redelivers everything un-acked while the originals may still be HELD in the
      * merge or already decided. Re-deciding a copy would spend a second budget unit on one
      * message - count exact, set short. The guard is the per-stream APPEND position watermark:
      * within one stream it only grows (publish time does not have to), so "at or below" is
      * exactly "offered before".
      */
    private val duplicateSuite = suite("a redelivered duplicate never spends a second budget unit")(
        test("a duplicate of a message still HELD is acknowledged without a claim") {
            val discard = StartFromDiscard.shared(2)
            val merge = GlobalSkipMerge[String](Vector(p0, p1), Set.empty, discard)
            val first = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            val copy = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1-copy") // unload redelivery
            val resolved = merge.offer(p1, at(5, p1, 0), atBacklogEnd = true, "b1")
            assertTrue(
                first.isEmpty,
                copy == Vector("a1-copy" -> StartFromOutcome.Drop), // shown to nobody, acknowledged, claimed from NOTHING
                resolved == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Drop),
                discard.remaining == 0L // exactly two claims: b1 and a1 - the copy spent nothing
            ) ?? s"copy=$copy resolved=$resolved remaining=${discard.remaining}"
        },
        test("a duplicate of a message already DECIDED is acknowledged without a claim") {
            val discard = StartFromDiscard.shared(2)
            val merge = GlobalSkipMerge[String](Vector(p0), Set.empty, discard)
            val dropped = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1")
            val copy = merge.offer(p0, at(10, p0, 0), atBacklogEnd = false, "a1-copy")
            val next = merge.offer(p0, at(20, p0, 1), atBacklogEnd = true, "a2")
            assertTrue(
                dropped == Vector("a1" -> StartFromOutcome.Drop),
                copy == Vector("a1-copy" -> StartFromOutcome.Drop),
                next == Vector("a2" -> StartFromOutcome.Drop),
                discard.remaining == 0L // exactly two claims: a1 and a2, never the copy
            ) ?? s"dropped=$dropped copy=$copy next=$next remaining=${discard.remaining}"
        },
        test("a batched entry's LATER piece is not mistaken for a duplicate of an earlier one") {
            // Same ledger and entry, higher batch index: a legitimate successor, not a copy.
            val discard = StartFromDiscard.shared(1)
            val merge = GlobalSkipMerge[String](Vector(p0), Set.empty, discard)
            val first = merge.offer(p0, at(10, p0, 0, batchIndex = 0), atBacklogEnd = false, "a1#0")
            val second = merge.offer(p0, at(10, p0, 0, batchIndex = 1), atBacklogEnd = true, "a1#1")
            assertTrue(
                first == Vector("a1#0" -> StartFromOutcome.Drop),
                second == Vector("a1#1" -> StartFromOutcome.Deliver),
                discard.remaining == 0L
            ) ?? s"first=$first second=$second"
        }
    )

    private val sharedCounterSuite = suite("the merge refuses a counter it could never claim")(
        test("a PerTopic discard is refused at construction - the merge claims by STREAM id") {
            // `advance` claims `discard.claim(streamId)`, and a stream id ("consumer@topic") is not
            // a topic FQN. Only a SHARED counter matches any key; a PerTopic counter would never
            // find its key, never claim, and the skip would silently drop nothing at all. The
            // session wiring only ever hands the merge a shared counter today - this makes wiring
            // anything else fail at construction instead of never-claiming.
            val outcome = scala.util.Try(
                GlobalSkipMerge[String](Vector(p0, p1), Set.empty, StartFromDiscard.perTopic(Map(p0 -> 3L)))
            )
            assertTrue(
                outcome.isFailure,
                outcome.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException])
            ) ?? s"a PerTopic counter was accepted: $outcome"
        }
    )

    def spec = suite(this.getClass.toString)(
        orderSuite,
        backlogEndSuite,
        skipSuite,
        latestSuite,
        movingAnchorSuite,
        nonMonotonicSuite,
        postCutSuite,
        stallSuite,
        capBoundarySuite,
        flowControlSuite,
        duplicateSuite,
        sharedCounterSuite
    )
