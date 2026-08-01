package consumer.session_runner

import _root_.consumer.start_from.{ConsumerSessionStartFrom, NthMessageAfterEarliest, NthMessageBeforeLatest}
import org.apache.pulsar.client.api.{Consumer, MessageIdAdv, Message as PulsarMessage, MessageId as PulsarMessageId}

import com.typesafe.scalalogging.Logger

import scala.collection.mutable
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

/** Where a message sits in its own log: the entry that holds it, plus its place inside that entry
  * when the entry is a producer batch.
  *
  * `batchIndex` is -1 for a message that was not batched, which is also how Pulsar's own ids report
  * it - so an unbatched message sorts before batch index 0 of the same entry, and the two can never
  * be confused. `batchSize` is how many messages the entry holds (1 when unbatched); it is only
  * needed to answer "was that the last message of this entry".
  */
final case class EntryPosition(ledgerId: Long, entryId: Long, batchIndex: Int, batchSize: Int)

object EntryPosition:
    /** Nothing retained: what `MessageId.earliest` reports, and what an empty topic answers with. */
    val empty: EntryPosition = EntryPosition(-1L, -1L, -1, 0)

    /** The position a delivered Pulsar message occupies.
      *
      * `MessageIdAdv` is the interface every addressable id implements - plain, batched, and the
      * topic-qualified wrapper a multi-topic consumer hands back, which forwards these accessors to
      * the id underneath. It reports `batchIndex` -1 and `batchSize` 0 for an unbatched message.
      *
      * Anything else is an id nothing here can address, and is reported as [[empty]] rather than
      * guessed at - an unaddressable id must not be allowed to sort somewhere plausible.
      */
    def of(messageId: PulsarMessageId): EntryPosition = messageId match
        // An EMPTY topic answers with MessageId.earliest, whose ledger and entry are both -1. It has
        // to land on exactly [[empty]] and not merely near it: "nothing retained" is recognised by
        // equality, and a position of (-1, -1, -1, 1) is not equal to (-1, -1, -1, 0), so an empty
        // partition would be waited on forever and hold the whole session at zero messages.
        case id: MessageIdAdv if id.getLedgerId >= 0 && id.getEntryId >= 0 =>
            EntryPosition(id.getLedgerId, id.getEntryId, id.getBatchIndex, id.getBatchSize max 1)
        case _ => empty

/** THE TOTAL ORDER the two counting start-from modes are defined over: publish time, then topic
  * name, then position in the log (ledger, entry, batch index).
  *
  * A total order is not a nicety here, it is what makes the modes testable. Publish-time ties are
  * COMMON - a producer that sends fast stamps many messages with the same millisecond - so an order
  * that stopped at the timestamp would leave the result of "the last 5" up to whichever partition
  * the broker happened to deliver first, and a test asserting an exact set would flake.
  *
  * THE CONTRACT IS APPEND ORDER ACROSS PARTITIONS BY PUBLISH TIME - NOT EXACT PUBLISH-TIME ORDER.
  * Stated plainly here rather than hedged, because neither algorithm can provide more and nothing
  * downstream may claim they do:
  *
  *  1. `publishTime` is stamped by the PRODUCER's clock, and Pulsar keeps no global sequence in any
  *     version. Across partitions written by producers whose clocks disagree, this order is only as
  *     good as those clocks.
  *
  *  2. WITHIN one partition, Pulsar preserves APPEND order - NOT producer-clock order. Several
  *     producers on one partition, or one producer whose clock steps back, append publish times
  *     that run backwards inside a single log. Both modes read each partition as a SEQUENCE and
  *     compare only its current end: [[GlobalSkipMerge]] compares per-stream heads going forwards,
  *     `resolveLatestN` compares per-topic entry cursors going backwards. Neither can see where a
  *     log is not in clock order, because seeing that would mean reading the whole log - O(topic)
  *     at any n, which is exactly the cost both designs exist to avoid. So the position is taken BY
  *     THE LOG within a partition and by publish time across partitions.
  *
  *  3. Once a skip's budget is spent the merge stops merging entirely and passes everything
  *     straight through, so the DELIVERY SEQUENCE after the cut is the brokers' delivery order, not
  *     this one. "Latest n" never had a delivery order to give: it positions each partition and
  *     then lets it stream, exactly as every other mode does. See [[GlobalSkipMerge]].
  *
  * The COUNT both modes deliver is exact under all three; WHICH messages make the cut is exact only
  * as far as the logs really are in publish-time order. `globalStartFromTest` pins each of these as
  * behaviour so the claim and the code cannot drift apart.
  */
final case class MessageOrderKey(publishTime: Long, topicFqn: String, ledgerId: Long, entryId: Long, batchIndex: Int)

object MessageOrderKey:
    given ordering: Ordering[MessageOrderKey] =
        Ordering.by(key => (key.publishTime, key.topicFqn, key.ledgerId, key.entryId, key.batchIndex))

    def of(publishTime: Long, topicFqn: String, position: EntryPosition): MessageOrderKey =
        MessageOrderKey(publishTime, topicFqn, position.ledgerId, position.entryId, position.batchIndex)

/** Whether `delivered` is at or past the last message the topic held when the session started -
  * i.e. whether the PRE-EXISTING BACKLOG of that topic is now drained.
  *
  * ONLY [[GlobalSkipMerge]] needs this, and it needs exactly one bit: a k-way merge stalls forever
  * on a partition that has nothing left to offer unless that partition can be declared "+infinity".
  * "This is the recorded end" and "this proves the recorded end will never be delivered" both mean
  * stop waiting, so one Boolean is the whole answer.
  *
  * It used to be a "latest n" input too, where the same Boolean was NOT enough: a live message past
  * an undeliverable recorded end entered the historical top-n heap and could evict a backlog message
  * the user had asked for. There is no heap any more - "latest n" resolves its cut from entry
  * metadata before anything is delivered (see `resolveLatestN`) - so no delivered message can change
  * the answer, and the distinction has nothing left to affect.
  *
  * THE BATCH WRINKLE: `Consumer.getLastMessageIds` may answer with a plain entry id (batch index -1)
  * even when that entry is a producer batch, so "same entry, batch index >= -1" would declare the
  * backlog drained on the FIRST message of the final batch and lose the rest of it. When the
  * recorded end carries no batch index, the end of that entry is taken from the DELIVERED message's
  * own batch size instead, which every batched message carries.
  */
def isPastBacklogEnd(delivered: EntryPosition, lastAtStart: EntryPosition): Boolean =
    val deliveredEntry = (delivered.ledgerId, delivered.entryId)
    val lastEntry = (lastAtStart.ledgerId, lastAtStart.entryId)
    if deliveredEntry != lastEntry then Ordering[(Long, Long)].gt(deliveredEntry, lastEntry)
    else if lastAtStart.batchIndex >= 0 then delivered.batchIndex >= lastAtStart.batchIndex
    // The recorded end named the entry but not a position inside it. An unbatched message IS the
    // whole entry, so reaching it is the end; a batched one has to be the last of its own batch.
    else if delivered.batchIndex < 0 then true
    else delivered.batchIndex >= delivered.batchSize - 1

/** What a global start-from layer decided about one message it was holding. */
enum StartFromOutcome:
    /** Not part of the position the user asked for - acknowledge it and show it to nobody. */
    case Drop

    /** Part of it - hand it to the session. */
    case Deliver


/** A session-wide reordering layer sitting between the per-topic delivery streams and the session.
  *
  * Every physical topic delivers in its own order and on its own thread; a GLOBAL position can only
  * be decided by looking at all of them at once, so a message has to be HELD until enough is known
  * about the others to place it. `offer` answers with the messages that offer RESOLVED - which is
  * usually not the one just offered, and may be none at all.
  */
trait StartFromMerge[P]:
    /** Take one delivered message. `atBacklogEnd` says this message is the last one its topic held
      * when the session started, so the merge must stop waiting for that topic. */
    def offer(streamId: String, key: MessageOrderKey, atBacklogEnd: Boolean, payload: P): Vector[(P, StartFromOutcome)]

    /** Messages held right now. Exposed so a test can pin the MEMORY PROFILE - the whole point of
      * these two algorithms is what they refuse to buffer. */
    def heldCount: Int

    /** The counter start-from progress is read off, when this layer owns one. */
    def progressDiscard: Option[StartFromDiscard]

    /** The TIME-DRIVEN half of the stall bound. The offer-driven check runs only when some stream
      * speaks - and after the last held backlog message there may be nobody left to speak, so a
      * waited-for stream that was retention-trimmed used to hold the merge FOREVER with the window
      * long expired. A watchdog calls this on a timer; anything it resolves is handled exactly as
      * an offer's resolutions are. The default holds nothing, so it has nothing to sweep. */
    def sweepStalled(): Vector[(P, StartFromOutcome)] = Vector.empty

    /** Restart the silent-stream clock. Called on session RESUME: a pause holds every source, so
      * time spent paused proves nothing about a stream's health - counting it toward the give-up
      * window abandoned a healthy stream the moment a long-paused session came back. The default
      * tracks no clock. */
    def resetStallClock(): Unit = ()

    /** True once this layer can never hold or reorder anything again - its work is done and every
      * message from here on passes straight through. From that point the session-wide ordering
      * lock is pure overhead (it would serialize every partition's deserialization and JS
      * evaluation for the rest of the session), so [[StartFromOrdering.inOrder]] stops taking it.
      * ONE-WAY: nothing may ever un-settle a merge. */
    def isSettled: Boolean = false

    /** Flip [[isSettled]] once the budget is spent and nothing is held. Called by the LISTENER
      * after a resolved batch is fully handled - never from inside the merge's own advance - so
      * the settling batch itself is processed under the ordering lock before any later message is
      * allowed to bypass it. The default has nothing to settle. */
    def settleIfDone(): Unit = ()

    /** The streams flow control wants PAUSED right now; absent means running. Memory is bounded by
      * holding a hot source STILL (consumer.pause) instead of bouncing its messages back through
      * redelivery - see [[startFromMergeMaxHeld]] for why the bounce was the bug. The default
      * holds nothing and pauses nobody. */
    def desiredPausedStreams: Set[String] = Set.empty

    /** The streams a give-up abandoned - the DEGRADATION record, in the order they were dropped.
      * Non-empty means the position was resolved best-effort: the count stayed exact, the exact
      * SET may differ. Sticky for the layer's life, so the client can keep showing it. */
    def abandonedStreamIds: Vector[String] = Vector.empty

/** The TOTAL-held high watermark: past this many held messages, every stream with a queue is
  * marked for PAUSE until the total drains back under four fifths of it.
  *
  * The merge normally holds ONE message per physical topic: it advances as soon as every stream it
  * is still waiting for has a head. A stream that goes quiet without reaching the end of its
  * backlog - a stalled broker connection, a trimmed partition - would otherwise let the other
  * streams queue up without bound while the merge waited.
  *
  * THE BOUND IS FLOW CONTROL, NOT REFUSAL. The merge used to DECLINE offers past the cap and hand
  * them back for ~100ms redelivery, and that opened the one door a k-way merge cannot leave open:
  * the broker redelivers a declined message while still delivering its successors, so a stream
  * could re-enter the merge OUT OF ITS OWN APPEND ORDER. A one-key floor guard held the door for
  * the FIRST declined message, but successors declined by the guard itself were not remembered -
  * two of them returning out of order could still spend the budget's last unit on the wrong
  * message, on a perfectly monotonic stream. Pausing the source closes the whole class: nothing
  * is handed back, so nothing can return out of order, and the permanent nack storm at the cap is
  * gone with it. What arrives between the watermark and the pause taking effect is ACCEPTED -
  * in-order arrivals are always safe to hold - so this is a watermark with a bounded overshoot
  * (the in-flight callback per stream), not a hard wall.
  *
  * THIS IS THE ONLY START-FROM LAYER THAT HOLDS MESSAGES AT ALL, and it holds them only because
  * "skip first n" cannot be resolved without reading n messages: Pulsar keeps no message-ordinal
  * index, so there is no entry metadata to compute the position from. "Latest n" CAN be resolved
  * from metadata, and is - see `resolveLatestN` - so it buffers nothing.
  *
  * A stream the merge is BLIND on has an empty queue by definition, so no watermark ever marks it:
  * the one stream whose next message can unblock the merge is always left running.
  */
val startFromMergeMaxHeld: Int = 10_000

/** PER-STREAM queue high watermark: a stream whose own queue reaches this is paused even while
  * the total is fine - one hot stream must not own the whole budget while a slow one catches up. */
val startFromMergePauseStreamAt: Int = 1_000

/** Per-stream LOW watermark: a stream paused for its own queue resumes once it drains to this.
  * The gap to [[startFromMergePauseStreamAt]] is the hysteresis that keeps pause/resume from
  * flapping around one boundary. */
val startFromMergeResumeStreamAt: Int = 100

/** Held-BYTES high watermark. The count caps above know nothing about payload size, and ten
  * thousand held 5 MB messages would be 50 GB: past this many held payload bytes every stream
  * with a queue is paused, whatever the counts say. */
val startFromMergePauseBytesAt: Long = 256L * 1024 * 1024

/** Held-bytes LOW watermark for resuming what the byte cap paused. */
val startFromMergeResumeBytesAt: Long = 64L * 1024 * 1024

/** How long the merge stays blind on a waited-for stream that has produced no head before it SAYS SO
  * in the log - naming the topic-partition an operator can then act on.
  *
  * The merge cannot decide anything while a stream it is waiting for has said nothing: it holds
  * the others (and pauses the hot ones at the watermarks). That is correct for a stream that is
  * merely slow, but a partition whose backlog was trimmed by retention AFTER the session recorded
  * its end will never deliver that end - the wait and the holding are then permanent and, until
  * this, entirely silent. Warning before acting keeps a slow-but-alive stream from being cut
  * early.
  */
val startFromMergeStallWarnMs: Long = 5_000L

/** How long the merge stays blind on a silent waited-for stream before it STOPS waiting for it -
  * treating it as drained, logging which stream it abandoned, and advancing.
  *
  * This is the bound on the otherwise-permanent wait. It is deliberately far longer than the
  * warning and than any healthy broker read, so a stream that is slow rather than gone is not cut:
  * only a stream that has delivered nothing for this long - the trimmed-partition case - is given up
  * on. A given-up stream that later speaks after all has its messages passed straight through, so the
  * cost of abandoning it early is the same "which messages" fuzziness the append-order contract
  * already carries, never a lost count.
  */
val startFromMergeStallWindowMs: Long = 30_000L

/** How often the runner's watchdog sweeps a merge that might be stalled with no offers arriving.
  * Small against the give-up window, so the bound the window promises is met within one period of
  * the promised time even in total silence. */
val startFromStallSweepPeriodMs: Long = 2_000L

/** "Skip the globally-first n messages, by publish time, across every physical topic."
  *
  * A STREAMING K-WAY MERGE over per-stream heads. It holds at most one message per physical topic:
  * take the smallest head under [[MessageOrderKey]], drop it, wait for that stream to produce its
  * next one, repeat. Memory is O(number of topics) and NEVER O(n) - "skip first n" has deliberately
  * no cap, so buffering n messages to sort them would let a user type a number that exhausts the
  * heap.
  *
  * A k-way merge is exact only if each input is already sorted, and a Pulsar log is sorted by APPEND
  * order rather than by producer clock - see [[MessageOrderKey]] for what that narrows the contract
  * to, and why buffering to fix it is the one thing this class must not do.
  *
  * ONCE THE BUDGET IS SPENT THE MERGE STOPS. Everything held is released in order and every later
  * message is passed straight through, so the delivery SEQUENCE after the cut is the brokers' and
  * not this order: a stream can deliver a newer message before another stream delivers an older
  * one. Continuing to merge would mean holding one message from every stream for the whole life of
  * a session that is now only streaming.
  *
  * A stream that has reached the end of its pre-existing backlog counts as +infinity: the merge
  * stops waiting for it, so a small partition cannot stall a session whose other partitions still
  * have millions of messages to go.
  *
  * ONE STREAM NEEDS NO MERGE, and does not get one - a single log is already in order, so the
  * caller uses the plain head-drop counter and holds nothing at all.
  *
  * `discard` is both the budget and the progress source: `claim` answers "yes, still dropping" and
  * counts the drop, and answering "no" is what ends the skip. It must be a SHARED counter (one for
  * the whole session), since the merge counts the merged stream and not any one topic.
  */
final class GlobalSkipMerge[P](
    streamIds: Vector[String],
    drainedAtStart: Set[String],
    discard: StartFromDiscard,
    maxHeld: Int = startFromMergeMaxHeld,
    stallWindowMs: Long = startFromMergeStallWindowMs,
    // MONOTONIC, not wall-clock: the stall window is an elapsed-time promise, and an NTP step
    // under currentTimeMillis either abandoned a healthy stream early or held a dead one longer
    // than promised.
    nowMs: () => Long = () => System.nanoTime() / 1_000_000L,
    pauseStreamAt: Int = startFromMergePauseStreamAt,
    resumeStreamAt: Int = startFromMergeResumeStreamAt,
    pauseBytesAt: Long = startFromMergePauseBytesAt,
    resumeBytesAt: Long = startFromMergeResumeBytesAt,
    // How many payload bytes a held message costs, for the byte watermarks. The default counts
    // nothing, which disables byte-based pausing - production wires the real payload size in.
    payloadBytesOf: P => Long = (_: P) => 0L
) extends StartFromMerge[P]:
    // A global skip counts the WHOLE merged stream, so its budget must be the SHARED counter - the
    // one `claim` keys by nothing (it ignores its topic-FQN argument, see StartFromDiscard.claim).
    // That is what lets `advance` hand `claim` a STREAM id rather than a topic FQN below. Asserted so
    // the type confusion cannot silently become real if a per-topic counter is ever passed here.
    require(discard.reportsProgress, "GlobalSkipMerge requires a shared (session-wide) discard counter")

    private val logger: Logger = Logger(getClass.getName)

    private val pending: mutable.Map[String, mutable.Queue[(MessageOrderKey, P)]] =
        mutable.Map.from(streamIds.map(_ -> mutable.Queue.empty[(MessageOrderKey, P)]))
    private var waiting: Set[String] = streamIds.toSet -- drainedAtStart
    private var dropping: Boolean = discard.remaining > 0

    // INCREMENTAL bookkeeping, so a decision costs O(log streams) instead of a scan per message:
    // the held count (was a sum over every queue per offer), the waited-for streams with no head
    // (was a filter over `waiting` per offer), and a min-heap of stream heads (was a minBy over
    // every ready stream per drop). Heads only change on enqueue-to-empty and dequeue, so the
    // heap is maintained at exactly those points; entries are validated against the live queue
    // head on pop, and a mismatch is simply a stale entry to discard.
    private var heldNow: Int = 0
    private val headless: mutable.Set[String] = mutable.Set.from(waiting)
    private val headsHeap: mutable.PriorityQueue[(MessageOrderKey, String)] =
        mutable.PriorityQueue.empty[(MessageOrderKey, String)](Ordering[(MessageOrderKey, String)].reverse)

    // Payload bytes currently held, for the byte watermarks. Maintained on every enqueue/dequeue.
    private var heldBytes: Long = 0L

    // The highest APPEND position (ledger, entry, batchIndex) each stream has offered. The
    // duplicate guard: a broker unload redelivers everything un-acked while the originals may
    // still sit in `pending` or already be decided, and re-deciding a copy would spend a second
    // budget unit on one message. Append position is strictly increasing within a stream - publish
    // TIME is not (see [[MessageOrderKey]]) - so "at or below the watermark" is exactly "offered
    // before", never a legitimate successor.
    private val acceptedThrough: mutable.Map[String, (Long, Long, Int)] = mutable.Map.empty

    // What flow control wants paused right now; recomputed after every accept and advance under
    // the lock. The hysteresis lives in the recompute - see recomputePauseTargets.
    private var pausedDesired: Set[String] = Set.empty

    // Every stream a give-up abandoned, in give-up order: the degradation record the client shows.
    private val abandoned = mutable.ArrayBuffer.empty[String]

    override def abandonedStreamIds: Vector[String] = synchronized(abandoned.toVector)

    // When the merge first became unable to advance because a WAITED-FOR stream had no head, and
    // whether that has already been surfaced. Both reset the moment the merge can advance again -
    // they exist only to bound and name a stream that never speaks (see the stall constants).
    private var blindSince: Option[Long] = None
    private var stallWarned: Boolean = false

    // One-way: set by settleIfDone once the budget is spent and nothing is held. Volatile because
    // inOrder reads it WITHOUT the ordering lock - that read being lock-free is its whole point.
    @volatile private var settled: Boolean = false

    override def isSettled: Boolean = settled

    override def settleIfDone(): Unit = synchronized {
        if !dropping && held == 0 then settled = true
    }

    override def resetStallClock(): Unit = synchronized {
        blindSince = None
        stallWarned = false
    }

    override def progressDiscard: Option[StartFromDiscard] = Some(discard)

    override def heldCount: Int = synchronized(held)

    private def held: Int = heldNow

    /** The streams the merge is still WAITING ON that have delivered no head yet - what it is blocked
      * by. Surfaced (alongside [[heldCount]]) so a stall is diagnosable rather than invisible. */
    def waitingOn: Set[String] = synchronized(blindStreams(exclude = ""))

    override def sweepStalled(): Vector[(P, StartFromOutcome)] = synchronized {
        if !dropping then Vector.empty
        else
            // No stream is delivering, so nothing is excluded from "silent" - the exclusion in the
            // offer path exists only because the offering stream is about to speak.
            surfaceOrGiveUpOnSilentStreams(currentStreamId = "")
            val resolved = advance()
            recomputePauseTargets()
            resolved
    }

    override def offer(streamId: String, key: MessageOrderKey, atBacklogEnd: Boolean, payload: P): Vector[(P, StartFromOutcome)] =
        synchronized {
            if !dropping then Vector(payload -> StartFromOutcome.Deliver)
            else
                // Name, and eventually give up on, any OTHER stream that has gone silent - otherwise
                // a waited-for partition whose backlog was trimmed holds the merge and, at the cap,
                // triggers a permanent ~100ms nack storm that nothing surfaces. The current stream is
                // excluded: it is about to deliver, so it must never be the one given up on.
                surfaceOrGiveUpOnSilentStreams(currentStreamId = streamId)
                // The declined message itself returning lifts its stream's floor.
                val position = (key.ledgerId, key.entryId, key.batchIndex)
                // A DUPLICATE: at or below the append position this stream has already offered.
                // Only a broker redelivery produces one - an unload hands back everything un-acked
                // while the originals may still be held here or already decided - and re-entering
                // it would spend a SECOND budget unit on one message. Dropping the copy is right
                // whichever way the original went: a dropped original was to be shown to nobody,
                // and a delivered original was already shown. Acknowledged, not counted.
                if acceptedThrough.get(streamId).exists(seen => Ordering[(Long, Long, Int)].lteq(position, seen)) then
                    Vector(payload -> StartFromOutcome.Drop)
                else
                    // ALWAYS ACCEPTED: an in-order arrival is safe to hold, and refusing it was
                    // the bug (see [[startFromMergeMaxHeld]] - a declined message's redelivery
                    // races its own successors). Memory pressure pauses the SOURCE instead, via
                    // the recompute below.
                    acceptedThrough(streamId) = position
                    val queue = pending.getOrElseUpdate(streamId, mutable.Queue.empty)
                    if queue.isEmpty then headsHeap.enqueue(key -> streamId)
                    queue.enqueue(key -> payload)
                    heldNow += 1
                    heldBytes += payloadBytesOf(payload)
                    headless -= streamId
                    if atBacklogEnd then waiting -= streamId
                    val resolved = advance()
                    recomputePauseTargets()
                    resolved
        }

    /** The waited-for streams with no head, optionally excluding one (the stream currently
      * delivering, which must not be counted as silent). Backed by the incrementally-maintained
      * `headless` set - membership means "in `waiting` AND queue empty", by construction. */
    private def blindStreams(exclude: String): Set[String] =
        if exclude.isEmpty then headless.toSet else headless.toSet - exclude

    /** Surface, and past the give-up window abandon, any waited-for stream that has delivered no head
      * for too long. The merge holds messages (and pauses hot sources) for as long as it waits, so a
      * stream that never speaks - a partition trimmed after its end was recorded - would block it
      * forever in silence. Warn first (a slow-but-alive stream must not be cut early), then stop
      * waiting for it, which lets the next `advance` drain what was held. Runs under the same lock as
      * everything else; `nowMs` is injected so the window is testable without real time. */
    private def surfaceOrGiveUpOnSilentStreams(currentStreamId: String): Unit =
        val silent = blindStreams(exclude = currentStreamId)
        if silent.isEmpty then
            blindSince = None
            stallWarned = false
        else
            val now = nowMs()
            if blindSince.isEmpty then blindSince = Some(now)
            val elapsed = now - blindSince.getOrElse(now)
            if !stallWarned && elapsed >= startFromMergeStallWarnMs then
                logger.warn(
                    s"Start-from skip is waiting on ${silent.mkString(", ")}, which has delivered nothing for ${elapsed}ms while $held " +
                        "message(s) are held. If that partition's backlog was trimmed it may never arrive."
                )
                stallWarned = true
            if elapsed >= stallWindowMs then
                logger.warn(
                    s"Start-from skip is giving up on ${silent.mkString(", ")} after ${elapsed}ms with no delivery; treating it as " +
                        "drained and continuing. The skip count stays exact; which messages were dropped may differ if that stream was only slow."
                )
                waiting --= silent
                headless --= silent
                abandoned ++= silent.toVector.sorted
                blindSince = None
                stallWarned = false

    /** Take heads while the smallest one is KNOWN to be the smallest - that is, while every stream
      * still being waited for has a head to compare. Answers with what that resolved.
      */
    private def advance(): Vector[(P, StartFromOutcome)] =
        val out = Vector.newBuilder[(P, StartFromOutcome)]
        var going = true
        while going do
            // A stream that is still waited for but has no head could yet turn out to hold the
            // smallest message, so the merge cannot decide ANYTHING until it speaks. Memory is
            // bounded by pausing hot sources (see `offer`), never by deciding blind.
            if headless.nonEmpty then going = false
            else
                // Pop heads until one matches its stream's LIVE queue head; anything else is a
                // stale leftover from an earlier dequeue, discarded on sight. The (key, stream id)
                // tuple breaks a PERFECT tie (the same message reached by two targets), so the
                // choice never depends on heap internals or iteration order.
                var chosen: Option[(MessageOrderKey, String)] = None
                while chosen.isEmpty && headsHeap.nonEmpty do
                    val candidate = headsHeap.dequeue()
                    val live = pending.get(candidate._2).exists(queue => queue.nonEmpty && queue.head._1 == candidate._1)
                    if live then chosen = Some(candidate)
                chosen match
                    case None => going = false
                    case Some((_, streamId)) =>
                        val queue = pending(streamId)
                        // `claim` is keyed by topic FQN, but the constructor `require`d a SHARED
                        // counter, which ignores that key - so handing it a stream id (not a topic
                        // FQN) is sound.
                        if discard.claim(streamId) then
                            val dropped = queue.dequeue()._2
                            heldNow -= 1
                            heldBytes = (heldBytes - payloadBytesOf(dropped)) max 0L
                            if queue.nonEmpty then headsHeap.enqueue(queue.head._1 -> streamId)
                            else if waiting.contains(streamId) then headless += streamId
                            out += (dropped -> StartFromOutcome.Drop)
                            // The budget can hit zero on THIS claim. Waiting for one more head just
                            // to have the NEXT claim answer "no" held the boundary batch hostage:
                            // when this drop emptied a still-waited stream, everything already held
                            // stayed invisible until that stream spoke again or the stall window
                            // gave up on it - for an answer that was already fully decided.
                            if discard.remaining <= 0 then
                                dropping = false
                                out ++= drainInOrder().map(_ -> StartFromOutcome.Deliver)
                                going = false
                        else
                            // The budget is spent: nothing is dropped from here on, and everything
                            // held is released in the order the merge would have produced it.
                            dropping = false
                            out ++= drainInOrder().map(_ -> StartFromOutcome.Deliver)
                            going = false
        out.result()

    private def drainInOrder(): Vector[P] =
        val all = pending.toVector.flatMap((streamId, queue) => queue.map((key, payload) => (key, streamId, payload)))
        pending.values.foreach(_.clear())
        heldNow = 0
        heldBytes = 0L
        headsHeap.clear()
        headless.clear()
        headless ++= waiting
        all.sortBy((key, streamId, _) => (key, streamId)).map((_, _, payload) => payload)

    /** Which streams flow control wants held still. Recomputed after every accept and advance.
      *
      * A stream pauses when its OWN queue reaches `pauseStreamAt`, or - when the TOTAL held
      * (messages or bytes) passes its high watermark - whenever it has a queue at all, since any
      * queued stream may be the next to grow. It resumes only once its queue is back under
      * `resumeStreamAt` AND the totals are under their low watermarks: the gap is the hysteresis.
      * A BLIND stream has an empty queue, so no watermark ever marks it - the one stream whose
      * next message can unblock the merge always runs. Once the budget is spent the set empties,
      * and the caller's reconcile resumes everything it paused.
      */
    private def recomputePauseTargets(): Unit =
        if !dropping then pausedDesired = Set.empty
        else
            val overTotal = held >= maxHeld || heldBytes >= pauseBytesAt
            val underTotal = held <= (maxHeld * 4 / 5) && heldBytes <= resumeBytesAt
            val newlyPaused =
                if overTotal then pending.collect { case (id, queue) if queue.nonEmpty => id }.toSet
                else pending.collect { case (id, queue) if queue.size >= pauseStreamAt => id }.toSet
            val retained = pausedDesired.filter { id =>
                val size = pending.get(id).map(_.size).getOrElse(0)
                size > resumeStreamAt || (!underTotal && size > 0)
            }
            pausedDesired = newlyPaused ++ retained

    override def desiredPausedStreams: Set[String] = synchronized(pausedDesired)

    /** Held payload bytes right now - the byte half of the memory profile, exposed for tests. */
    def heldBytesCount: Long = synchronized(heldBytes)

/** One physical topic's delivery stream, as a global start-from layer knows it.
  *
  * `lastAtStart` is where that topic ENDED when the session was created; it is what tells the layer
  * that the stream has run out of pre-existing messages and must stop being waited for.
  */
final case class StartFromStream(id: String, lastAtStart: EntryPosition)

/** The identity of one delivery stream.
  *
  * NOT the topic alone: two enabled targets may select the SAME topic, and each has its own consumer
  * delivering it independently. Merging both under one key would let one target's head hide the
  * other's.
  */
def startFromStreamId(consumerName: String, topicFqn: String): String = s"$consumerName@$topicFqn"

/** Where every consumer's topic ended when the session started.
  *
  * ONLY "SKIP FIRST N" ASKS FOR THIS, and only on a multi-stream session: it is what lets the merge
  * stop waiting for a partition that has run out of pre-existing messages. "Latest n" used to need
  * it too, to know when its heap could be released; it resolves its position from entry metadata
  * now, so it costs one broker call per topic less than it did.
  *
  * `getLastMessageIds` rather than the deprecated singular form: it answers with one id per topic
  * behind the consumer, which is the shape that stays right if a consumer is ever built over more
  * than one. The LAST of them is taken, so a consumer covering several topics is not declared
  * drained before all of them are.
  *
  * A NON-PERSISTENT topic is recorded as [[EntryPosition.empty]] - "already drained" - without
  * being asked: it retains nothing, so it has no end to reach and must never be one the merge waits
  * for. That is decided from the FQN, exactly as [[startFromNeedsRetainedHistory]] decides its own
  * case, and NOT from whatever the call happens to throw.
  *
  * A PERSISTENT topic whose end cannot be read FAILS the session. It used to be recorded as empty
  * too, which reads as "already drained": the merge then stopped waiting for that whole partition,
  * so a global skip silently left it out of the count and out of the order while it went on
  * delivering messages. An empty partition needs no special case here - it ANSWERS, with
  * `MessageId.earliest`, which maps to [[EntryPosition.empty]] on its own.
  */
def startFromStreamsAt(consumers: Vector[Consumer[Array[Byte]]]): Vector[StartFromStream] =
    consumers.map { consumer =>
        val topicFqn = consumer.getTopic
        val lastAtStart =
            if isNonPersistentTopic(topicFqn) then EntryPosition.empty
            else
                Try(consumer.getLastMessageIds.asScala.toVector) match
                    case Success(messageIds) =>
                        messageIds
                            .map(EntryPosition.of)
                            .maxOption(Ordering.by[EntryPosition, (Long, Long, Int)](p => (p.ledgerId, p.entryId, p.batchIndex)))
                            .getOrElse(EntryPosition.empty)
                    case Failure(err) =>
                        throw StartFromUnresolvableException(
                            s"Could not resolve the requested start-from position: reading where the topic ends failed for $topicFqn. ${err.getMessage}",
                            err
                        )
        StartFromStream(startFromStreamId(consumer.getConsumerName, topicFqn), lastAtStart)
    }

/** Which global reordering a start-from needs on top of its seek, if any. */
enum StartFromOrderingPlan:
    /** The seek (and whatever the head-drop counters correct) already lands exactly - every mode
      * except the two counting ones, and both of those on a session with a single stream, where the
      * one log is already in publish order. */
    case PassThrough

    /** Drop the globally-first `n` across `streams`: a [[GlobalSkipMerge]]. */
    case GlobalSkip(n: Long, streams: Vector[StartFromStream])

/** Whether this session needs a GLOBAL reordering layer on top of its seek.
  *
  * ONLY "SKIP FIRST N", and only on a session with more than one delivery stream. One log is
  * already in append order, so the head-drop counter is exact on its own and nothing is ever held -
  * the ordinary case, a single non-partitioned topic, must stay free.
  *
  * "LATEST N" DELIBERATELY NEEDS NONE, at any number of streams. It used to get a bounded top-n
  * heap that buffered n full message payloads and narrowed the over-fetch after delivery; its cut
  * is now resolved from entry METADATA before anything is delivered (`resolveLatestN`), so every
  * consumer simply starts in the right place and streams. That removed the only start-from path
  * whose memory grew with a number the user typed.
  *
  * Every other mode reaches its position with the seek itself. Both approximate modes stay per topic
  * deliberately - [[consumer.start_from.ApproximateDataPosition]] per partition and
  * [[consumer.start_from.ApproximateTimePosition]] per logical topic: a count of n can be reached by
  * streaming n messages and stopping, whereas a fraction of the merged stream is only known once the
  * whole of it has been measured.
  *
  * PURE, so both the fast path and the modes that must not acquire one are pinned by test.
  */
def needsGlobalOrdering(startFrom: ConsumerSessionStartFrom, streamCount: Int): Boolean = startFrom match
    case v: NthMessageAfterEarliest => v.n > 0 && streamCount > 1
    case _                          => false

/** WHICH layer this session gets - a streaming merge for "skip first n", and nothing for everything
  * else, "latest n" included.
  *
  * The single place the mapping is made, so `handleStartFrom` cannot disagree with it, and PURE, so
  * it is pinned without a broker. Resolving `streams` costs a broker call per topic, which is why
  * [[needsGlobalOrdering]] stays separate: it gates that cost before the streams are asked for.
  */
def globalOrderingPlanFor(startFrom: ConsumerSessionStartFrom, streams: Vector[StartFromStream]): StartFromOrderingPlan =
    if !needsGlobalOrdering(startFrom, streams.size) then StartFromOrderingPlan.PassThrough
    else
        startFrom match
            case v: NthMessageAfterEarliest => StartFromOrderingPlan.GlobalSkip(v.n, streams)
            case _                          => StartFromOrderingPlan.PassThrough

/** Everything a start-from needs after its seek: what to drop off the head of each stream, and how
  * to reorder what is left into the global order the counting modes are defined over.
  */
final case class StartFromPlan(discard: StartFromDiscardPlan, ordering: StartFromOrderingPlan)

/** A delivered message the ordering layer is holding, with everything needed to resolve it later -
  * possibly from a DIFFERENT topic's listener thread, since the merge releases whatever the newest
  * head unblocked, not the message just offered.
  */
final case class HeldMessage(
    consumer: Consumer[Array[Byte]],
    message: PulsarMessage[Array[Byte]],
    listener: ConsumerListener
)

/** The session-wide ordering layer the listeners hand every delivered message to.
  *
  * Armed ONCE, by `ConsumerSessionRunner.make`, and shared by every target of the session: the two
  * counting modes are defined over the session's whole merged stream, so a per-target layer would
  * count each target separately.
  *
  * Generic in what it holds so the WHOLE routing - stream identity, sort key, end of backlog - can
  * be driven with plain values and real Pulsar message ids, and no broker. Production instantiates
  * it with [[HeldMessage]].
  */
final class StartFromOrdering[P] private (
    private val merge: Option[StartFromMerge[P]],
    private val streams: Map[String, StartFromStream]
):
    /** The lock that keeps the merge's DECISION and the session's ACTIONS in the same order.
      *
      * `offer` is itself synchronized, but that is not enough: what it answers with is a batch of
      * messages that were resolved by THIS offer and now have to be handled - possibly several of
      * them, possibly belonging to other topics. Releasing after `offer` let another listener thread
      * resolve a later batch and process it first, so the session's stateful filters, coloring rules
      * and value projections saw messages in a different order than the merge had just decided on.
      */
    private val orderingLock = new Object

    /** Run `use` with this session's ordering decisions serialized.
      *
      * A NO-OP when nothing is being reordered. The ordinary session - one non-partitioned topic,
      * or any mode that reaches its position with the seek alone - decided no order, so a
      * session-wide lock per message would only serialize its partitions' deserialization for
      * nothing. That fast path must stay free.
      */
    def inOrder[A](use: => A): A = merge match
        case None => use
        // Settled is ONE-WAY: the budget is spent and nothing is held, so the merge can never
        // reorder anything again - from here the lock would only serialize every partition's
        // deserialization and JS evaluation for the rest of the session's life, for nothing.
        case Some(layer) => if layer.isSettled then use else orderingLock.synchronized(use)

    /** See [[StartFromMerge.settleIfDone]]. The listener calls this after a resolved batch is
      * fully handled, still under [[inOrder]]. */
    def settleIfDone(): Unit = merge.foreach(_.settleIfDone())

    /** See [[StartFromMerge.resetStallClock]]. The runner calls this on session RESUME. */
    def resetStallClock(): Unit = merge.foreach(_.resetStallClock())

    /** See [[StartFromMerge.abandonedStreamIds]] - the degradation record for the progress API. */
    def abandonedStreams: Vector[String] = merge.map(_.abandonedStreamIds).getOrElse(Vector.empty)

    // FLOW CONTROL: how the merge's desired-paused set becomes consumer.pause()/resume() calls.
    // Hooks are registered lazily by each listener on a stream's first delivery (a stream that
    // never delivers has nothing to pause).
    //
    // GUARDED BY ITS OWN LOCK, deliberately not by [[inOrder]]: once the merge settles, inOrder
    // stops taking the ordering lock (that is the whole point of settling) - but a topic that was
    // quiet through the skip still registers its hooks on its first POST-cut delivery, and two
    // listener threads doing that concurrently would race an unsynchronized map. The lock is
    // uncontended and the critical sections are tiny, so this costs nothing measurable.
    private val flowControlLock = new Object
    private val streamPauseHooks = mutable.Map.empty[String, (() => Unit, () => Unit)]
    private var pausedApplied: Set[String] = Set.empty

    /** Register how to pause and resume one stream's consumer. Idempotent; first registration
      * wins. A no-op for a pass-through layer, which never pauses anybody. */
    def registerStreamPauseHooks(streamId: String, pause: () => Unit, resume: () => Unit): Unit =
        if merge.isDefined then
            flowControlLock.synchronized {
                if !streamPauseHooks.contains(streamId) then streamPauseHooks(streamId) = (pause, resume)
            }

    /** Apply the merge's flow-control wishes: pause what it wants held still, resume what it no
      * longer does. Once the merge settles the desired set is empty forever, so the settling
      * batch's reconcile resumes everything still paused and every later call is a no-op.
      *
      * EVERY desired stream is (re-)paused on EVERY reconcile, not only the newly-desired diff:
      * `consumer.pause()` is a client-local flag and idempotent, and other machinery legitimately
      * resumes consumers wholesale behind this layer's back - the user's own resume, and the
      * delivery rate limiter releasing its permit hold. Re-asserting the pause each time makes
      * that drift self-healing; pausing only the diff left a hot stream running forever while the
      * bookkeeping claimed it was held.
      */
    def reconcileFlowControl(): Unit = merge.foreach { layer =>
        val desired = layer.desiredPausedStreams
        flowControlLock.synchronized {
            val pausable = desired.filter(streamPauseHooks.contains)
            val toResume = pausedApplied -- desired
            pausable.foreach(streamId => streamPauseHooks(streamId)._1())
            toResume.foreach(streamId => streamPauseHooks.get(streamId).foreach(_._2()))
            pausedApplied = pausable
        }
    }

    /** Forget which consumers this layer paused. Called on session RESUME, which has just resumed
      * every consumer wholesale: the bookkeeping must match that reality. (Reconcile would also
      * self-heal on its next pass - see above - but resume should not have to wait for one.) */
    def resetAppliedFlowControl(): Unit = flowControlLock.synchronized { pausedApplied = Set.empty }

    /** The counter start-from progress is read off while this layer is doing the counting. */
    def progressDiscard: Option[StartFromDiscard] = merge.flatMap(_.progressDiscard)

    /** Messages held right now - the memory profile, exposed for tests and diagnostics. */
    def heldCount: Int = merge.map(_.heldCount).getOrElse(0)

    /** See [[StartFromMerge.sweepStalled]]. Callers hold [[inOrder]], like every offer. */
    def sweepStalled(): Vector[(P, StartFromOutcome)] = merge.map(_.sweepStalled()).getOrElse(Vector.empty)

    /** Take one delivered message, and answer with everything that offer RESOLVED - which is often
      * not the message just offered, and may be none at all.
      */
    def offer(
        consumerName: String,
        topicFqn: String,
        publishTime: Long,
        messageId: PulsarMessageId,
        payload: P
    ): Vector[(P, StartFromOutcome)] = merge match
        case None => Vector(payload -> StartFromOutcome.Deliver)
        case Some(layer) =>
            val streamId = startFromStreamId(consumerName, topicFqn)
            val position = EntryPosition.of(messageId)
            // An unknown stream is treated as already drained, for the same reason an unanswerable
            // one is: the merge must never wait on something it knows nothing about.
            val atBacklogEnd = streams.get(streamId).forall(stream => isPastBacklogEnd(position, stream.lastAtStart))
            layer.offer(streamId, MessageOrderKey.of(publishTime, topicFqn, position), atBacklogEnd, payload)

object StartFromOrdering:
    /** Reorders nothing, and holds nothing. */
    def passThrough[P]: StartFromOrdering[P] = new StartFromOrdering[P](None, Map.empty)

    def make[P](plan: StartFromOrderingPlan, payloadBytesOf: P => Long = (_: P) => 0L): StartFromOrdering[P] = plan match
        case StartFromOrderingPlan.PassThrough => passThrough[P]
        case StartFromOrderingPlan.GlobalSkip(n, streams) =>
            new StartFromOrdering[P](
                Some(GlobalSkipMerge[P](streams.map(_.id), drainedAtStart(streams), StartFromDiscard.shared(n), payloadBytesOf = payloadBytesOf)),
                byId(streams)
            )

    private def byId(streams: Vector[StartFromStream]): Map[String, StartFromStream] =
        streams.map(stream => stream.id -> stream).toMap

    /** Streams that held nothing when the session started - an empty topic, or one that would not
      * say. They can never be waited for. */
    private def drainedAtStart(streams: Vector[StartFromStream]): Set[String] =
        streams.filter(_.lastAtStart == EntryPosition.empty).map(_.id).toSet
