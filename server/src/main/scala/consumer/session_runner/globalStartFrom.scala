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

/** The total order used by the streaming cross-source merge: selected timestamp, topic name, then
  * position in the log (ledger, entry, batch index).
  *
  * A total order is not a nicety here, it is what makes the result deterministic. Timestamp ties
  * are common, so an order
  * that stopped at the timestamp would leave the result of "the last 5" up to whichever partition
  * the broker happened to deliver first, and a test asserting an exact set would flake.
  *
  * The merge compares only the current head of each source, preserving Pulsar append order within
  * a topic or partition. It is therefore globally timestamp-sorted only while each source's
  * timestamps are nondecreasing; a timestamp inversion already stored in one source passes through
  * and is counted.
  *
  * For a multi-stream Skip-first-n, Fastest uses publish time for the cut; Guaranteed and Best
  * effort use their selected timestamp and keep the same merge after the cut. Latest-n is separate:
  * it resolves per-view anchors from publish-time entry metadata before delivery begins.
  */
final case class MessageOrderKey(orderTime: Long, topicFqn: String, ledgerId: Long, entryId: Long, batchIndex: Int)

object MessageOrderKey:
    given ordering: Ordering[MessageOrderKey] =
        Ordering.by(key => (key.orderTime, key.topicFqn, key.ledgerId, key.entryId, key.batchIndex))

    def of(orderTime: Long, topicFqn: String, position: EntryPosition): MessageOrderKey =
        MessageOrderKey(orderTime, topicFqn, position.ledgerId, position.entryId, position.batchIndex)

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

/** Whether `delivered` sits STRICTLY past the recorded end - in a LATER entry than the last one
  * the topic held when the boundary was captured.
  *
  * The GUARANTEED replay's next-chunk test. Entry-level on purpose: a producer batch is written
  * as one entry atomically, so the whole final entry either existed at the capture (every member
  * of it is in the replay) or did not - no batch can straddle the boundary, and no batch-index
  * arithmetic is needed. Against an EMPTY recorded end every real position is strictly past:
  * a stream that held nothing at the boundary has nothing to replay, so everything it delivers
  * belongs to the next chunk. Per-stream append order makes such an arrival PROOF that the
  * recorded range is drained - nothing at or before the end can follow it.
  */
def isStrictlyPastBacklogEnd(delivered: EntryPosition, lastAtStart: EntryPosition): Boolean =
    Ordering[(Long, Long)].gt((delivered.ledgerId, delivered.entryId), (lastAtStart.ledgerId, lastAtStart.entryId))

/** What a global start-from layer decided about one message it was holding. */
enum StartFromOutcome:
    /** Not part of the position the user asked for - acknowledge it and show it to nobody. */
    case Drop

    /** Part of it - hand it to the session. */
    case Deliver

    /** A broker COPY whose original's fate is still open: hand it back, decide nothing - no
      * acknowledgment, no budget, no cursor. The broker redelivers it with backoff until the
      * original settles: its ack ends the copies, its recorded failure makes the next copy the
      * retry. Both eager answers were message-loss paths - see the merge's duplicate arm. */
    case Requeue

    /** GUARANTEED replay: recorded PAST the boundary, so it belongs to the NEXT chunk. Hand it
      * back and PAUSE its consumer (reason Boundary) - no acknowledgment, no start-from budget,
      * no delivery memo, no cursor, no duplicate watermark: after a Resume extends the boundary
      * the broker's redelivery must arrive as an ordinary first-time offer of the new chunk.
      * The arrival itself is proof its stream's recorded range is drained (append order), which
      * the ordering layer feeds to the barrier separately. */
    case NextChunk


/** A session-wide reordering layer sitting between the per-topic delivery streams and the session.
  *
  * Every physical topic delivers in its own order and on its own thread; a GLOBAL position can only
  * be decided by looking at all of them at once, so a message has to be HELD until enough is known
  * about the others to place it. `offer` answers with the messages that offer RESOLVED - which is
  * usually not the one just offered, and may be none at all.
  */
trait StartFromMerge[P]:
    /** Take one delivered message. `atBacklogEnd` says this message is at (or past) the last one
      * its topic held when the replay boundary was captured, so the merge must stop waiting for
      * that topic. `knownFailedRetry` is the LISTENER's explicit lifecycle fact - "this exact
      * message's delivery already failed downstream" - which is the only license to deliver a
      * watermarked copy. `entryPosition` is the message's full entry position (batch size
      * included); the GUARANTEED replay records it per stream so a boundary EXTENSION can tell a
      * finished stream from one with a delta - the key alone cannot, it carries no batch size. */
    def offer(
        streamId: String,
        key: MessageOrderKey,
        atBacklogEnd: Boolean,
        payload: P,
        knownFailedRetry: Boolean = false,
        entryPosition: EntryPosition = EntryPosition.empty
    ): Vector[(P, StartFromOutcome)]

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

    /** How many times the merge has newly crossed its stall-WARN window (a waited-for stream
      * silent past [[startFromMergeStallWarnMs]]). Monotonic; the sweep pushes a progress frame
      * when it grows, so a stalled positioning is VISIBLE to the client while the merge is still
      * only waiting - not first at the give-up half a minute later. */
    def stallWarningCount: Long = 0L

    /** Streams still missing a head after the stall-warning interval. Unlike
      * [[stallWarningCount]], this returns to zero when delivery can progress. */
    def stalledStreamCount: Int = 0

    /** The stalled streams BY ID - non-empty exactly while [[stalledStreamCount]] is non-zero.
      * Feeds the server-side stall diagnostic only: the wire's ConsumerStats carries the count
      * alone, and a per-stream payload would need a proto field that does not exist. */
    def stalledStreamIds: Vector[String] = Vector.empty

    /** Whether this layer keeps ordering deliveries for the session's whole life rather than only
      * until a counted cut resolves. A continuous layer never
      * settles, so the runner must keep its sweep armed forever - and at the grace cadence, not
      * the stall one. */
    def isContinuousOrdering: Boolean = false

    /** How many emissions were LATE - ordered before something already emitted. The honest
      * quality gauge of a best-effort order: zero on a healthy merge, growing when producer
      * clocks skew past the grace, a stream outwaits its residence bound, or a failed delivery
      * is retried. Under GUARANTEED ordering it counts exactly the source-log inversions that
      * passed through in append order. Monotonic; the default merges nothing and is never late. */
    def lateDeliveryCount: Long = 0L

    /** Whether this layer runs the no-escape GUARANTEED ordering - delivery then goes through
      * the peek/commit barrier below instead of [[offer]]'s resolutions. */
    def isGuaranteedOrdering: Boolean = false

    /** RELAX a LIVE guaranteed layer to best effort, and answer with whatever that released - in
      * the new order, handled exactly as an offer's resolutions are. See
      * [[GlobalSkipMerge.relaxGuaranteedToBestEffort]] for the whole contract. The default layer
      * orders nothing and has nothing to relax. */
    def relaxGuaranteedToBestEffort(): Vector[(P, StartFromOutcome)] = Vector.empty

    /** GUARANTEED mode: the single safe head, WITHOUT advancing - or None while any waited
      * stream is silent (the no-escape wait) or a prior peek is still uncommitted elsewhere. */
    def peekGuaranteed(): Option[P] = None

    /** The peeked head's send SUCCEEDED: pop it and advance the bookkeeping. */
    def commitGuaranteed(): Unit = ()

    /** The peeked head's send FAILED: keep it, clear the in-flight slot; the next peek retries
      * the same head - in place, in order. */
    def abortGuaranteed(): Unit = ()

    /** GUARANTEED replay: every stream has delivered its recorded range and nothing is held -
      * the chunk is COMPLETE and the session should auto-pause with the caught-up signal. The
      * default layer replays nothing and is never caught up. */
    def isReplayCaughtUp: Boolean = false

    /** GUARANTEED replay: this stream's recorded range is PROVEN drained - a strictly-past-
      * boundary arrival, which per-stream append order guarantees nothing recorded can follow.
      * The stream leaves the barrier; the arrival itself was handed back as [[StartFromOutcome.NextChunk]]. */
    def noteStreamReplayFinished(streamId: String): Unit = ()

    /** GUARANTEED replay: EXTEND the boundary to the freshly captured `ends` - what a Resume
      * does. A stream whose new end lies past everything it has offered re-enters the barrier
      * (it has a delta to replay); the rest stay finished. One rule for a manual pause's resume
      * and the auto-pause's: the un-emitted remainder and the delta merge in the same heap. */
    def extendReplayBoundary(ends: Map[String, EntryPosition]): Unit = ()

    /** Whether the head [[peekGuaranteed]] just answered would be emitted with an order key
      * LOWER than one already emitted - the per-message seam-violation flag, computed at peek so
      * the outgoing row can carry it. Agrees with [[replaySeamViolationCount]] by construction:
      * nothing else can emit between a peek and its commit. */
    def peekIsSeamViolation: Boolean = false

    /** How many guaranteed emissions went out with an order key lower than one already emitted -
      * the session-level seam counter the client's banner hangs on. By the SELECTED key, against
      * previously emitted keys of the same kind, never against wall clock: ordinary old event
      * times under the event-time key are not violations. Monotonic. */
    def replaySeamViolationCount: Long = 0L

/** The TOTAL-held high watermark: past this many held messages, every stream with a queue is
  * marked for PAUSE until the total drains back under four fifths of it.
  *
  * A HEALTHY merge holds one message per stream - it advances as soon as every stream it is
  * still waiting for has a head - but that is the happy case, not a bound: whenever one stream
  * is silent or slow, the others QUEUE here up to these watermarks (the wide-session test holds
  * ~21,000 for 1,000 streams before its sweep). A stream that goes quiet without reaching the
  * end of its backlog - a stalled broker connection, a trimmed partition - would otherwise let
  * the other streams queue up without bound while the merge waited.
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
  * in-order arrivals are always safe to hold - so this is a watermark with a bounded overshoot,
  * not a hard wall. THE OVERSHOOT IS THE RECEIVER QUEUE, not one callback: `consumer.pause()`
  * only stops asking for more while Pulsar keeps delivering what the consumer already prefetched
  * (see DeliveryRateLimiter's note on the same behavior) - which is why merge-ordered sessions
  * get a deliberately small per-consumer receiver queue (`receiverQueueSizeFor`'s merge budget).
  * These watermarks bound what the MERGE holds; they are not a whole-session byte ceiling.
  *
  * THIS IS THE ONLY START-FROM LAYER THAT HOLDS MESSAGES AT ALL - transiently for a counted cut,
  * for the session's life in continuous mode - and it holds them only because a global order
  * cannot be decided without candidates in hand: Pulsar keeps no message-ordinal index and no
  * cross-topic sequence. "Latest n" CAN be resolved from metadata, and is - see `resolveLatestN`
  * - so it buffers nothing.
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

/** The Best-effort reorder window: how long a held message may RESIDE in
  * the merge, waiting for quieter streams to get their say, before it is emitted anyway.
  *
  * This is what "best effort" means, made concrete: BOUNDED LATENESS, never blocked delivery.
  * Publish time is stamped by the PRODUCER's clock (see [[MessageOrderKey]]), so comparing it
  * against this process's clock proves nothing - a producer running minutes ahead or behind is
  * ordinary. The merge therefore never compares publish times to wall time at all: it orders
  * whatever co-resides in the window, and RESIDENCE EXPIRY on the merge's own monotonic clock is
  * the unconditional liveness escape - a head that has waited this long is emitted whatever any
  * silent stream might still say, future-dated timestamps included. The price is worn openly:
  * delivery lags by up to this window PLUS one sweep period (the timer that notices expiry -
  * ~0.5-0.75s in total) whenever some stream is quiet, and a message arriving after its peers
  * were released is emitted LATE, out of order, and counted. */
val mergeTopicsGraceMs: Long = 500L

/** Which job(s) one merge instance performs. An explicit phase model, replacing a pair of
  * boolean constructor flags (`continuous`, `waitStreamsAtStart`) whose four combinations
  * included two nonsense states - a merge that neither cuts nor orders, and an order-only layer
  * that still gates on recorded backlog ends it never fetched. Illegal states are now simply
  * unrepresentable, and each name carries its contract:
  *
  *   - [[OrderingPolicy.ExactCutOnly]]: resolve the exact counted cut, then go inert - the
  *     default skip-n merge.
  *   - [[OrderingPolicy.ExactCutThenBestEffort]]: the same exact cut, then keep ordering
  *     deliveries best-effort for the session's life.
  *   - [[OrderingPolicy.BestEffortOnly]]: no cut to make - best-effort ordering from the first
  *     message (every non-counted mode with Best effort). Needs no recorded
  *     ends and must carry no budget.
  */
enum OrderingPolicy:
    case ExactCutOnly
    case ExactCutThenBestEffort
    case BestEffortOnly

    /** Resolve the exact counted cut, then GUARANTEED ordering for the session's life. */
    case ExactCutThenGuaranteed

    /** No cut - the GUARANTEED EXACT REPLAY (owner decision 2026-08-09): the exact k-way merge
      * rule over the RECORDED RANGE of every stream, bounded by the per-stream ends captured
      * when Play was pressed. A stream that has delivered its recorded range is FINISHED and
      * leaves the barrier ([[isPastBacklogEnd]] at the offer, or a strictly-past-boundary
      * arrival as proof - see [[StartFromMerge.noteStreamReplayFinished]]); when every stream is
      * finished the remaining heap drains in key order - the last message is deliverable because
      * every end is known - and [[StartFromMerge.isReplayCaughtUp]] turns true, which is the
      * caller's cue to AUTO-PAUSE and signal. A Resume EXTENDS the boundary
      * ([[StartFromMerge.extendReplayBoundary]]) and the same session replays the delta. Within
      * the un-finished range there is still no liveness escape of any kind: a silent stream
      * holds delivery until it speaks or proves itself drained, a failed send retries the same
      * head in place (see the peek/commit barrier), and nothing is ever abandoned - exactness
      * over history is the entire promise, and history is immutable so it costs no stall on a
      * healthy topic. (Before the replay redesign this mode waited on every stream FOREVER -
      * the recorded ends were ignored - so a completed backlog was an eternal hold.)
      *
      * THE WAIT IS NOT A MEMORY HOLE. An ahead stream's backlog accumulates only up to the same
      * flow-control watermarks as every other mode ([[startFromMergePauseStreamAt]] per stream,
      * [[startFromMergeMaxHeld]] / [[startFromMergePauseBytesAt]] in total): past them the ahead
      * stream's CONSUMER is paused until the barrier drains its queue back down. Delaying receipt
      * can never violate the order - only early emission could - so the backpressure is free
      * semantically. A blind stream holds nothing and is never paused, so the one stream whose
      * next message can unblock the barrier always runs; the overshoot past a watermark is
      * bounded by the consumer receiver queue (`mergeReceiverQueueSizeFor`: a 5,000-message
      * session budget divided across the streams). */
    case GuaranteedOnly

/** Sweep cadence while a BEST-EFFORT continuous merge is armed: the timer half of the grace above.
  * An all-idle tail emits nothing until either a new offer arrives or this sweep notices the grace
  * has passed, so the effective added latency is grace + one period. The skip watchdog's 2s
  * cadence is fine against a 30s give-up window and far too coarse against a 500ms grace. */
val mergeTopicsSweepPeriodMs: Long = 250L

/** Sweep cadence for a GUARANTEED continuous merge, which has no residence to expire and never
  * gives a stream up: its ticks exist only to surface a stall and to re-attempt a head whose send
  * failed. Neither is worth the best-effort cadence on an idle session. */
val guaranteedSweepPeriodMs: Long = 1_000L

/** How often a continuous ordering layer's sweep runs, by the policy actually in force.
  *
  * POLICY-SPECIFIC, because the two modes want the tick for different things. Best effort needs it
  * at the grace cadence: it is the timer half of the residence bound, and an all-idle tail emits
  * nothing until a tick notices the grace has passed. Guaranteed has no residence to expire and
  * never gives a stream up, so its ticks only surface a stall and re-attempt a head whose send
  * failed - neither worth four ticks a second on a session that is simply waiting. Any offer pumps
  * the barrier anyway, so the slower cadence costs latency only in the rare case of a failed send
  * with no further traffic behind it.
  *
  * Pure, so the choice is pinned by test rather than inferred from a scheduled task. */
def continuousSweepPeriodMs(guaranteed: Boolean): Long =
    if guaranteed then guaranteedSweepPeriodMs else mergeTopicsSweepPeriodMs

/** How many stream names one stall log line may carry. A session may hold 2,000 streams and a
  * stall names every silent one of them; the whole set in a single line is not a diagnostic. */
val stallLogStreamNameCap: Int = 10

/** The stream names for a stall log, capped - the rest are counted, not spelled out. */
def stalledStreamsForLog(names: Iterable[String], cap: Int = stallLogStreamNameCap): String =
    val named = names.take(cap).mkString(", ")
    val rest = names.size - math.min(cap, names.size)
    if rest <= 0 then named else s"$named and $rest more"

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
  * ONCE THE BUDGET IS SPENT THE MERGE STOPS - unless `continuous` is set. In the default mode
  * everything held is released in order and every later message is passed straight through, so
  * the delivery SEQUENCE after the cut is the brokers' and not this order: a stream can deliver a
  * newer message before another stream delivers an older one. Continuing to merge would mean
  * holding one message from every stream for the whole life of a session that is now only
  * streaming - which is exactly what a continuous delivery-order mode pays for.
  *
  * CONTINUOUS BEST-EFFORT MODE. The same queues, heap, flow
  * control and dedup keep running for the session's life; what changes is the emission rule.
  * While a counted cut is unresolved the exact rule holds (every waited stream must have a head).
  * After it - and for the non-counted modes, from the start - two rules govern:
  *
  *   - ORDER-SAFE FAST PATH: a head is emitted at once when every silent stream has already
  *     offered something at or past its publish time - nothing older can follow it from a
  *     stream that preserves append order and roughly monotonic producer time.
  *   - BOUNDED RESIDENCE: otherwise the head waits, but never past the grace measured on the
  *     merge's own monotonic clock from the moment it arrived. Residence expiry is the
  *     unconditional liveness escape: producer clocks are nobody's to trust (publish time is
  *     stamped by the PRODUCER - a future-dated head must not wedge its stream), and a slow
  *     peer must cost bounded latency, not a wedge.
  *
  * A message that arrives after its peers were already released is emitted immediately, LATE and
  * out of order, and counted ([[lateDeliveryCount]]) - never blocked, never dropped. A
  * session-wide startup hold of one grace lets every stream deliver its first message before
  * anything is emitted, so replaying history does not open with a scramble while slow streams
  * are still subscribing. Best EFFORT, not a guarantee - and the guarantee it does keep is
  * bounded lateness plus per-stream append order.
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
    payloadBytesOf: P => Long = (_: P) => 0L,
    policy: OrderingPolicy = OrderingPolicy.ExactCutOnly,
    graceMs: Long = mergeTopicsGraceMs
) extends StartFromMerge[P]:
    require(
        policy != OrderingPolicy.BestEffortOnly || discard.remaining == 0,
        "A BestEffortOnly layer has no cut to make and must carry no skip budget"
    )

    /** The policy in force RIGHT NOW. A var, not the constructor parameter, because
      * [[relaxGuaranteedToBestEffort]] can lower it on a live session - the one mutation this
      * class accepts, and only ever in the relaxing direction (see that method for why the other
      * direction is refused rather than faked). Read under this object's monitor like every other
      * piece of merge state.
      */
    private var activePolicy: OrderingPolicy = policy

    /** Whether ordering continues past any cut. The exact-cut phase itself is tracked by
      * `dropping` below. */
    private def continuous: Boolean = activePolicy != OrderingPolicy.ExactCutOnly

    /** GUARANTEED ordering: the exact rule with no liveness escape - no residence bound, no
      * startup release, no give-up, and delivery through the peek/commit barrier below. */
    private def guaranteed: Boolean =
        activePolicy == OrderingPolicy.ExactCutThenGuaranteed || activePolicy == OrderingPolicy.GuaranteedOnly

    override def isGuaranteedOrdering: Boolean = guaranteed
    // A global skip counts the WHOLE merged stream, so its budget must be the SHARED counter - the
    // one `claim` keys by nothing (it ignores its topic-FQN argument, see StartFromDiscard.claim).
    // That is what lets `advance` hand `claim` a STREAM id rather than a topic FQN below. Asserted so
    // the type confusion cannot silently become real if a per-topic counter is ever passed here.
    require(discard.reportsProgress, "GlobalSkipMerge requires a shared (session-wide) discard counter")

    private val logger: Logger = Logger(getClass.getName)

    private val pending: mutable.Map[String, mutable.Queue[(MessageOrderKey, P, Long)]] =
        mutable.Map.from(streamIds.map(_ -> mutable.Queue.empty[(MessageOrderKey, P, Long)]))
    // Who gates emission at the start. BestEffortOnly waits on nobody (the residence bound and
    // the fast path carry it); every other policy - the exact-cut pair AND the guaranteed
    // replay - waits on each stream exactly until its recorded range is drained: a stream that
    // held nothing at the boundary has nothing to replay and is never waited for. (The
    // pre-replay Guaranteed waited on EVERYBODY forever, recorded ends ignored - the eternal
    // hold the exact-replay redesign removed, owner decision 2026-08-09.)
    private var waiting: Set[String] = policy match
        case OrderingPolicy.BestEffortOnly => Set.empty
        case _                             => streamIds.toSet -- drainedAtStart
    private var dropping: Boolean = discard.remaining > 0

    // Whether this layer still decides anything at all: the counted cut, the continuous order, or
    // both. The default layer goes inert once its budget is spent; a continuous one never does.
    private def merging: Boolean = dropping || continuous

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

    // CONTINUOUS-MODE bookkeeping (untouched by the default layer).
    //
    // `tailHeadless` is the SILENT streams: not waited for (their backlog, if any ever existed,
    // does not gate the cut) and currently queue-empty. `lastOffered` is the newest selected time
    // each has offered. The order-safe fast path emits a head once every silent stream's
    // lastOffered is at or past it - nothing older can then follow from a stream that preserves
    // append order and roughly monotonic producer time. The min over the set is cached
    // (dirty-flagged on membership changes), sound because members' values are frozen: a stream
    // only updates lastOffered by offering, and offering removes it from the set. Everything
    // else - a stream that is merely slow, quiet forever, or stamped by a skewed producer clock -
    // is covered by the RESIDENCE bound on the held head itself, not by any per-stream state.
    private val lastOffered: mutable.Map[String, Long] = mutable.Map.empty
    private val tailHeadless: mutable.Set[String] = mutable.Set.from(streamIds.toSet -- waiting)
    private var tailFloorCacheDirty: Boolean = true
    private var tailMinOfferedCache: Long = Long.MinValue

    // The session-wide startup hold: nothing is emitted until one grace has passed since the
    // FIRST offer, unless every stream has spoken by then. This is what keeps a multi-topic
    // history replay from opening with a scramble while slow streams are still subscribing -
    // before a stream's first offer there is no lastOffered to pin the fast path. Irrelevant
    // while a counted cut is unresolved - the exact rule holds there. Bounded by construction:
    // it can never outlast the first held message's own residence bound.
    private val neverOffered: mutable.Set[String] = mutable.Set.from(streamIds)
    private var firstOfferMonoMs: Option[Long] = None

    // The lateness ledger: the newest key emitted so far, and how many emissions were LATE
    // (ordered before it). Volatile so diagnostics and tests read it without the merge lock.
    private var lastEmittedKey: Option[MessageOrderKey] = None
    @volatile private var lateEmissions: Long = 0L

    override def lateDeliveryCount: Long = lateEmissions

    /** Every emission - ordered, residence-expired, or a late redelivery - passes through here so
      * the lateness ledger cannot miss a path. LATENESS IS BY THE SELECTED TIME, exactly as the
      * statistic is advertised: two messages sharing a millisecond are a tie-break, not a "late
      * delivery", however the deterministic full key orders them. The newest-emitted key itself
      * advances by the full order, so ties keep a stable frontier. */
    private def noteEmitted(key: MessageOrderKey): Unit =
        if lastEmittedKey.exists(last => key.orderTime < last.orderTime) then lateEmissions += 1
        if lastEmittedKey.forall(last => Ordering[MessageOrderKey].gt(key, last)) then lastEmittedKey = Some(key)

    private def tailMinOffered: Long =
        if tailFloorCacheDirty then
            tailMinOfferedCache =
                if tailHeadless.isEmpty then Long.MaxValue
                else tailHeadless.iterator.map(id => lastOffered.getOrElse(id, Long.MinValue)).min
            tailFloorCacheDirty = false
        tailMinOfferedCache

    /** The ORDER-SAFE fast path: no silent stream at all, or every silent stream has already
      * offered something STRICTLY past this head (the cached min - O(1) per message). Strictly:
      * producer timestamps are non-decreasing, so a stream that offered through time t may offer
      * another AT t - and if that stream's topic sorts first in the documented tie-break, emitting
      * a tied head now would be avoidable disorder. An equal-timestamp head waits its residence
      * out instead. */
    private def orderSafeToEmit(orderTimeMs: Long): Boolean =
        tailHeadless.isEmpty || orderTimeMs < tailMinOffered

    private def startupHoldActive: Boolean =
        neverOffered.nonEmpty && firstOfferMonoMs.exists(first => nowMs() - first < graceMs)

    /** The counted cut just resolved and this layer is continuous: from here the two continuous
      * rules govern. Whatever was still waited for joins the silent set - its unread backlog, if
      * the give-up window would have found any, is the same best-effort fuzziness the residence
      * bound carries. */
    private def convertToOrderingOnly(): Unit =
        dropping = false
        if guaranteed then
            // The REPLAY BARRIER carries straight over: streams that reached their recorded ends
            // during the cut stay finished, the rest keep gating until they drain - `waiting` and
            // `headless` are already exactly that. (The pre-replay design re-armed waiting on
            // EVERY stream here, recorded ends ignored - the hold-forever the exact-replay
            // redesign removed.)
            ()
        else if waiting.nonEmpty || headless.nonEmpty then
            tailHeadless ++= headless
            tailFloorCacheDirty = true
            waiting = Set.empty
            headless.clear()

    // The highest APPEND position (ledger, entry, batchIndex) each stream has offered. The
    // duplicate guard: a broker unload redelivers everything un-acked while the originals may
    // still sit in `pending` or already be decided, and re-deciding a copy would spend a second
    // budget unit on one message. Append position is strictly increasing within a stream - publish
    // TIME is not (see [[MessageOrderKey]]) - so "at or below the watermark" is exactly "offered
    // before", never a legitimate successor.
    private val acceptedThrough: mutable.Map[String, (Long, Long, Int)] = mutable.Map.empty

    // The FULL entry position (batch size included) each stream last offered - what a guaranteed
    // boundary EXTENSION compares the freshly captured ends against ([[isPastBacklogEnd]] needs
    // the delivered side's batch size when the recorded end names an entry without an index).
    // Kept beside `acceptedThrough` rather than widening it: the duplicate guard's ordering
    // comparisons stay exactly as they were.
    private val lastOfferedPositions: mutable.Map[String, EntryPosition] = mutable.Map.empty

    // What flow control wants paused right now. Maintained on TRANSITIONS (a queue crossing a
    // watermark, the totals crossing theirs), never by rescanning every queue per message - at a
    // thousand streams the old full recompute dominated the merge's actual work. `totalsOver`
    // latches the totals crossing so the expensive all-streams sweep runs once per crossing, not
    // once per offer.
    private val pausedDesired = mutable.Set.empty[String]
    private var totalsOver: Boolean = false

    // Every stream a give-up abandoned, in give-up order: the degradation record the client shows.
    private val abandoned = mutable.ArrayBuffer.empty[String]

    override def abandonedStreamIds: Vector[String] = synchronized(abandoned.toVector)

    // When the merge first became unable to advance because a WAITED-FOR stream had no head, and
    // whether that has already been surfaced. Both reset the moment the merge can advance again -
    // they exist only to bound and name a stream that never speaks (see the stall constants).
    private var blindSince: Option[Long] = None
    private var stallWarned: Boolean = false

    // Grows by one each time stallWarned newly flips - the sweep's cue to push a progress frame.
    // Volatile: written under the merge lock, but the runner's report closure reads it from
    // whichever listener thread is sending.
    @volatile private var stallWarningsIssued: Long = 0L

    override def stallWarningCount: Long = stallWarningsIssued

    // HOW MANY, not which: read straight off the incrementally-maintained set. This is on the
    // report path - once per delivered frame - and materializing the whole set to take its size
    // made a 2,000-stream session pay a full pass per frame for a number it already had.
    override def stalledStreamCount: Int = synchronized {
        if stallWarned then headless.size else 0
    }

    override def stalledStreamIds: Vector[String] = synchronized {
        if stallWarned then blindStreams(exclude = "").toVector.sorted else Vector.empty
    }

    // One-way: set by settleIfDone once the budget is spent and nothing is held. Volatile because
    // inOrder reads it WITHOUT the ordering lock - that read being lock-free is its whole point.
    @volatile private var settled: Boolean = false

    override def isSettled: Boolean = settled

    override def settleIfDone(): Unit = synchronized {
        // A continuous layer NEVER settles: settling is how the ordering lock is released for
        // good, and a continuous mode is precisely the promise to keep ordering.
        if !continuous && !dropping && held == 0 then settled = true
    }

    override def isContinuousOrdering: Boolean = continuous

    override def resetStallClock(): Unit = synchronized {
        blindSince = None
        stallWarned = false
        // The residence clocks too: a pause holds every source, so time spent paused proves
        // nothing about how long a held message has genuinely waited for its peers. Without the
        // re-stamp, the first sweep after a long-paused resume found every residence expired and
        // dumped the held set past backlogs whose consumers had simply not restarted yet.
        if continuous then
            val now = nowMs()
            pending.values.foreach(queue => queue.mapInPlace { case (key, payload, _) => (key, payload, now) })
    }

    override def progressDiscard: Option[StartFromDiscard] = Some(discard)

    override def heldCount: Int = synchronized(held)

    private def held: Int = heldNow

    /** The streams the merge is still WAITING ON that have delivered no head yet - what it is blocked
      * by. Surfaced (alongside [[heldCount]]) so a stall is diagnosable rather than invisible. */
    def waitingOn: Set[String] = synchronized(blindStreams(exclude = ""))

    override def sweepStalled(): Vector[(P, StartFromOutcome)] = synchronized {
        if !merging then Vector.empty
        else
            // No stream is delivering, so nothing is excluded from "silent" - the exclusion in the
            // offer path exists only because the offering stream is about to speak. For a
            // continuous layer past its cut this is also the TIMER half of the residence bound: an
            // all-idle tail emits nothing until a tick notices the grace has passed.
            surfaceOrGiveUpOnSilentStreams(currentStreamId = "")
            advance()
    }

    override def offer(
        streamId: String,
        key: MessageOrderKey,
        atBacklogEnd: Boolean,
        payload: P,
        knownFailedRetry: Boolean = false,
        entryPosition: EntryPosition = EntryPosition.empty
    ): Vector[(P, StartFromOutcome)] =
        synchronized {
            if !merging then Vector(payload -> StartFromOutcome.Deliver)
            else
                // Name, and eventually give up on, any OTHER stream that has gone silent - otherwise
                // a waited-for partition whose backlog was trimmed holds the merge and, at the cap,
                // triggers a permanent ~100ms nack storm that nothing surfaces. The current stream is
                // excluded: it is about to deliver, so it must never be the one given up on.
                surfaceOrGiveUpOnSilentStreams(currentStreamId = streamId)
                // The declined message itself returning lifts its stream's floor.
                val position = (key.ledgerId, key.entryId, key.batchIndex)
                // A message with NO KNOWABLE position can never be a redelivered duplicate
                // either - nothing unstored is ever redelivered - so it must skip the watermark
                // entirely. NON-PERSISTENT topics are the case that matters, and their ids LIE
                // plausibly: every message arrives as ledger 0, entry 0 (measured against a real
                // broker - not -1), so the first one recorded a watermark that damned every
                // later message as a "copy": swallowed during a cut, shunted down the late-retry
                // path (instant, out of order) in continuous mode. The topic's persistency is
                // the discriminator; the id-shape check stays as a belt for exotic ids.
                val positionKnown = !isNonPersistentTopic(key.topicFqn) && key.ledgerId >= 0 && key.entryId >= 0
                // A COPY at or below the append position this stream has already offered. Only a
                // broker redelivery produces one - an unload hands back everything un-acked while
                // the originals may still be held here or already decided. What happens next is
                // an EXPLICIT lifecycle decision, never an inference from queue membership:
                //
                //   - the listener SAW this exact message's delivery fail downstream
                //     (`knownFailedRetry`): the copy IS the retry - deliver it, late by
                //     definition, counted as such;
                //   - anything else: hand it back (Requeue). The original may be held here,
                //     queued in the delivery limiter, mid-send, or delivered with its ack still
                //     in flight - and both eager answers were message-loss paths. Acknowledging
                //     the copy as a semantic Drop burned the id, so an original whose delivery
                //     later failed could never be redelivered; delivering it whenever the
                //     original was merely not-held-any-more could show one message twice. The
                //     broker redelivers a handed-back copy with backoff until the original's
                //     fate settles.
                if positionKnown && acceptedThrough.get(streamId).exists(seen => Ordering[(Long, Long, Int)].lteq(position, seen)) then
                    if knownFailedRetry then
                        // A retry may re-emit the newest key (nothing newer went out meanwhile),
                        // which the publish-time lateness compare would not see - but a second
                        // emission of a decided message is a quality event by definition.
                        lateEmissions += 1
                        Vector(payload -> StartFromOutcome.Deliver)
                    else Vector(payload -> StartFromOutcome.Requeue)
                else
                    // ALWAYS ACCEPTED: an in-order arrival is safe to hold, and refusing it was
                    // the bug (see [[startFromMergeMaxHeld]] - a declined message's redelivery
                    // races its own successors). Memory pressure pauses the SOURCE instead, via
                    // the recompute below.
                    if positionKnown then acceptedThrough(streamId) = position
                    // The FULL position (batch size included) is what a guaranteed boundary
                    // EXTENSION compares the freshly captured ends against: a stream whose last
                    // offer already reached the new end has no delta and stays finished.
                    if positionKnown then
                        lastOfferedPositions(streamId) =
                            if entryPosition != EntryPosition.empty then entryPosition
                            else EntryPosition(key.ledgerId, key.entryId, key.batchIndex, 1)
                    val queue = pending.getOrElseUpdate(streamId, mutable.Queue.empty)
                    if queue.isEmpty then headsHeap.enqueue(key -> streamId)
                    // The arrival stamp is the message's own residence clock: it may wait for
                    // quieter streams, but never past the grace from THIS moment.
                    queue.enqueue((key, payload, nowMs()))
                    heldNow += 1
                    heldBytes += payloadBytesOf(payload)
                    headless -= streamId
                    // Reaching the recorded end FINISHES the stream for the counted cut and for
                    // the guaranteed REPLAY alike: its recorded range is fully in hand, so the
                    // barrier must stop waiting for it. (The pre-replay Guaranteed ignored this
                    // past the cut and waited forever.)
                    if atBacklogEnd then waiting -= streamId
                    if continuous then
                        // Fast-path bookkeeping: this stream has spoken (through this publish
                        // time), and while it holds a head the heap speaks for it instead.
                        if firstOfferMonoMs.isEmpty then firstOfferMonoMs = Some(nowMs())
                        neverOffered -= streamId
                        lastOffered(streamId) = key.orderTime max lastOffered.getOrElse(streamId, Long.MinValue)
                        if tailHeadless.remove(streamId) then tailFloorCacheDirty = true
                    onStreamGrew(streamId)
                    advance()
        }

    /** Per-stream inspections the silent-stream bookkeeping has made - one per waited-for stream
      * every time the set is MATERIALIZED. A test's window onto the sweep's cost: an idle tick with
      * nothing new to say must not add to it. */
    private var streamInspections: Long = 0L

    private[session_runner] def silentStreamInspections: Long = synchronized(streamInspections)

    /** The waited-for streams with no head, optionally excluding one (the stream currently
      * delivering, which must not be counted as silent). Backed by the incrementally-maintained
      * `headless` set - membership means "in `waiting` AND queue empty", by construction.
      *
      * MATERIALIZING COSTS ONE PASS PER WAITED-FOR STREAM, so callers ask only when they are going
      * to use the names. Everything that merely needs HOW MANY reads `headless.size` instead. */
    private def blindStreams(exclude: String): Set[String] =
        streamInspections += headless.size
        if exclude.isEmpty then headless.toSet else headless.toSet - exclude

    /** Surface, and past the give-up window abandon, any waited-for stream that has delivered no head
      * for too long. The merge holds messages (and pauses hot sources) for as long as it waits, so a
      * stream that never speaks - a partition trimmed after its end was recorded - would block it
      * forever in silence. Warn first (a slow-but-alive stream must not be cut early), then stop
      * waiting for it, which lets the next `advance` drain what was held. Runs under the same lock as
      * everything else; `nowMs` is injected so the window is testable without real time. */
    private def surfaceOrGiveUpOnSilentStreams(currentStreamId: String): Unit =
        // FAST PATH, taken on every single offer of a healthy merge: nothing waited-for is
        // headless (or only the stream that is speaking right now is). No set is materialized.
        if headless.isEmpty || (headless.size == 1 && headless.contains(currentStreamId)) then
            blindSince = None
            stallWarned = false
        else
            val now = nowMs()
            if blindSince.isEmpty then blindSince = Some(now)
            val elapsed = now - blindSince.getOrElse(now)
            val disclosing = !stallWarned && elapsed >= startFromMergeStallWarnMs
            val givingUp = elapsed >= stallWindowMs && !guaranteed
            // THE SET IS MATERIALIZED ONLY WHEN ITS NAMES ARE ABOUT TO BE USED. Guaranteed never
            // gives up and discloses once, so every later tick of its sweep has nothing to say -
            // and used to pay a full pass over every waited-for stream to say it. At 2,000 idle
            // streams that was four whole-set scans a second, per session, forever.
            if disclosing || givingUp then
                val silent = blindStreams(exclude = currentStreamId)
                if disclosing then
                    logger.warn(
                        s"Delivery ordering is waiting on ${stalledStreamsForLog(silent)}, which has delivered nothing for ${elapsed}ms while " +
                            s"$held message(s) are held."
                    )
                    stallWarned = true
                    stallWarningsIssued += 1
                if givingUp then
                    logger.warn(
                        s"Start-from skip is giving up on ${stalledStreamsForLog(silent)} after ${elapsed}ms with no delivery; treating it as " +
                            "drained and continuing. The skip count stays exact; which messages were dropped may differ if that stream was only slow."
                    )
                    waiting --= silent
                    headless --= silent
                    abandoned ++= silent.toVector.sorted
                    // In continuous mode the given-up stream is not gone, only demoted: from here
                    // the floors speak for it, and whatever it delivers late is the same
                    // best-effort fuzziness the give-up already conceded.
                    if continuous then
                        tailHeadless ++= silent
                        tailFloorCacheDirty = true
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
            //
            // GUARANTEED ordering emits through the peek/commit barrier instead of here: the
            // head must not leave the merge until its send SUCCEEDED, or a failed send would
            // have to choose between losing the message and delivering it late - the two
            // compromises this mode exists to refuse.
            if guaranteed && !dropping then going = false
            else if headless.nonEmpty then going = false
            else if continuous && !dropping && startupHoldActive then going = false
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
                    case Some((key, streamId)) =>
                        // The continuous emission gate, cheapest-and-most-decisive checks first:
                        //   1. residence expiry - the unconditional liveness escape no silent
                        //      stream, slow peer, or future-dated producer clock can hold shut;
                        //   2. IRREVERSIBLY LATE - older by the selected time than something already
                        //      emitted: waiting cannot un-late it, so it goes out now and is
                        //      counted, exactly as the contract says;
                        //   3. only then the order-safe floor, whose cached min may need an
                        //      O(silent) rebuild - never paid for a head the first two rules
                        //      already release.
                        val headArrivalMs = pending(streamId).head._3
                        if continuous && !dropping
                            && nowMs() - headArrivalMs < graceMs
                            && !lastEmittedKey.exists(last => key.orderTime < last.orderTime)
                            && !orderSafeToEmit(key.orderTime)
                        then
                            // The head waits. Its heap entry was popped by the selection above
                            // and goes straight back - nothing else may emit past it meanwhile.
                            headsHeap.enqueue(key -> streamId)
                            going = false
                        else
                            val queue = pending(streamId)
                            // `claim` is keyed by topic FQN, but the constructor `require`d a
                            // SHARED counter, which ignores that key - so handing it a stream id
                            // (not a topic FQN) is sound.
                            val drop = dropping && discard.claim(streamId)
                            if dropping && !drop then
                                // The budget is spent: nothing is dropped from here on. The
                                // default layer releases everything in the order the merge would
                                // have produced it and goes inert; a continuous layer switches to
                                // the continuous rules instead - the popped head goes back to be
                                // judged on the next pass.
                                if continuous then
                                    convertToOrderingOnly()
                                    headsHeap.enqueue(key -> streamId)
                                else
                                    dropping = false
                                    out ++= drainInOrder().map(_ -> StartFromOutcome.Deliver)
                                    going = false
                            else
                                val taken = queue.dequeue()._2
                                heldNow -= 1
                                heldBytes = (heldBytes - payloadBytesOf(taken)) max 0L
                                if queue.nonEmpty then headsHeap.enqueue(queue.head._1 -> streamId)
                                else if waiting.contains(streamId) then headless += streamId
                                else if continuous then
                                    tailHeadless += streamId
                                    tailFloorCacheDirty = true
                                onStreamShrank(streamId, queue.size)
                                if continuous && !drop then noteEmitted(key)
                                out += (taken -> (if drop then StartFromOutcome.Drop else StartFromOutcome.Deliver))
                                // The budget can hit zero on THIS claim. Waiting for one more head
                                // just to have the NEXT claim answer "no" held the boundary batch
                                // hostage: when this drop emptied a still-waited stream, everything
                                // already held stayed invisible until that stream spoke again or
                                // the stall window gave up on it - for an answer that was already
                                // fully decided.
                                if drop && discard.remaining <= 0 then
                                    if continuous then convertToOrderingOnly()
                                    else
                                        dropping = false
                                        out ++= drainInOrder().map(_ -> StartFromOutcome.Deliver)
                                        going = false
        out.result()

    private def drainInOrder(): Vector[P] =
        val all = pending.toVector.flatMap((streamId, queue) => queue.map { case (key, payload, _) => (key, streamId, payload) })
        pending.values.foreach(_.clear())
        heldNow = 0
        heldBytes = 0L
        headsHeap.clear()
        headless.clear()
        headless ++= waiting
        pausedDesired.clear()
        totalsOver = false
        all.sortBy((key, streamId, _) => (key, streamId)).map((_, _, payload) => payload)

    /** Flow-control transitions, the event-driven replacement for a per-message full rescan.
      *
      * A stream is marked for pause when its OWN queue crosses `pauseStreamAt`, or - while the
      * TOTALS (messages or bytes) are over their high watermark - whenever it holds anything at
      * all, since any queued stream may be the next to grow. It is unmarked only once its queue
      * is back under `resumeStreamAt` with the totals under their low watermarks (the gap is the
      * hysteresis), and always the moment its queue empties - a BLIND stream is never held, that
      * would deadlock the merge. The totals crossing DOWN prunes the whole set once; crossing UP
      * marks every queued stream once. Once the budget is spent the drain clears the set, and
      * the caller's reconcile releases everything it paused.
      */
    private def totalsOverHigh: Boolean = heldNow >= maxHeld || heldBytes >= pauseBytesAt

    private def totalsUnderLow: Boolean = heldNow <= (maxHeld * 4 / 5) && heldBytes <= resumeBytesAt

    private def onStreamGrew(streamId: String): Unit =
        if totalsOver then pausedDesired += streamId
        else
            if pending.get(streamId).exists(_.size >= pauseStreamAt) then pausedDesired += streamId
            if totalsOverHigh then
                totalsOver = true
                pending.foreach((id, queue) => if queue.nonEmpty then pausedDesired += id)

    private def onStreamShrank(streamId: String, sizeAfter: Int): Unit =
        if totalsOver && totalsUnderLow then
            totalsOver = false
            pausedDesired.filterInPlace(id => pending.get(id).exists(_.size > resumeStreamAt))
        if sizeAfter == 0 then pausedDesired -= streamId
        else if !totalsOver && sizeAfter <= resumeStreamAt then pausedDesired -= streamId

    override def desiredPausedStreams: Set[String] = synchronized(pausedDesired.toSet)

    /** Held payload bytes right now - the byte half of the memory profile, exposed for tests. */
    def heldBytesCount: Long = synchronized(heldBytes)

    // GUARANTEED-MODE delivery barrier: the head handed out by [[peekGuaranteed]] and not yet
    // committed. The merge does not advance past it; a failed send retries the SAME head in
    // place on the next tick - which is what keeps even retries in order.
    private var guaranteedInFlight: Option[(MessageOrderKey, String)] = None

    override def peekGuaranteed(): Option[P] = synchronized {
        if !guaranteed || dropping then None
        else if headless.nonEmpty then None
        else
            guaranteedInFlight match
                case Some((key, streamId)) =>
                    // The retry path: hand the same head out again, validated against the queue.
                    // A mismatch means the in-flight record is STALE. Nothing reachable mutates a
                    // queue head between peek and commit/abort today (offers append at the tail,
                    // resetStallClock preserves keys, drainInOrder is unreachable for continuous
                    // policies), so this is defence in depth - but left in place a stale record
                    // made every later peek retry a head that no longer exists, and the merge
                    // never delivered again. Clear it; the next peek reselects.
                    val head = pending.get(streamId).flatMap(_.headOption).collect { case (k, payload, _) if k == key => payload }
                    if head.isEmpty then guaranteedInFlight = None
                    head
                case None =>
                    var chosen: Option[(MessageOrderKey, String)] = None
                    while chosen.isEmpty && headsHeap.nonEmpty do
                        val candidate = headsHeap.dequeue()
                        val live = pending.get(candidate._2).exists(q => q.nonEmpty && q.head._1 == candidate._1)
                        if live then chosen = Some(candidate)
                    // The live entry goes back: a peek must not consume heap state - only a
                    // commit advances anything.
                    chosen.foreach(c => headsHeap.enqueue(c))
                    guaranteedInFlight = chosen
                    chosen.flatMap((_, streamId) => pending(streamId).headOption.map(_._2))
    }

    override def commitGuaranteed(): Unit = synchronized {
        guaranteedInFlight.foreach { (key, streamId) =>
            pending.get(streamId).foreach { queue =>
                if queue.nonEmpty && queue.head._1 == key then
                    val taken = queue.dequeue()._2
                    heldNow -= 1
                    heldBytes = (heldBytes - payloadBytesOf(taken)) max 0L
                    if queue.nonEmpty then headsHeap.enqueue(queue.head._1 -> streamId)
                    // A stream still replaying re-enters the barrier's waited set; a FINISHED one
                    // joins the silent-floor bookkeeping instead, so a later relax to best effort
                    // starts with sound floors. (Pre-replay, every stream was waited here.)
                    else if waiting.contains(streamId) then headless += streamId
                    else
                        tailHeadless += streamId
                        tailFloorCacheDirty = true
                    onStreamShrank(streamId, queue.size)
                    // The SEAM LEDGER, counted where the emission is decided: a key lower than
                    // one already emitted is on screen out of order - loudly. Same tie rule as
                    // the lateness ledger: an equal selected time is a tie-break, not disorder.
                    if lastEmittedKey.exists(last => key.orderTime < last.orderTime) then seamViolations += 1
                    noteEmitted(key)
            }
        }
        guaranteedInFlight = None
    }

    override def abortGuaranteed(): Unit = synchronized { guaranteedInFlight = None }

    // The seam-violation ledger for the guaranteed replay: emissions whose selected key undercut
    // one already emitted. Volatile for the same reason lateEmissions is - the report path reads
    // it from whichever thread is sending.
    @volatile private var seamViolations: Long = 0L

    override def replaySeamViolationCount: Long = seamViolations

    override def peekIsSeamViolation: Boolean = synchronized {
        guaranteedInFlight.exists((key, _) => lastEmittedKey.exists(last => key.orderTime < last.orderTime))
    }

    override def isReplayCaughtUp: Boolean = synchronized {
        // The chunk is complete exactly when nobody is expected to speak again AND nothing is
        // still in hand: every recorded end was reached (or proven unreachable-because-drained),
        // and the barrier emptied the heap. `dropping` deliberately does not gate this - a skip
        // budget larger than the recorded history spends what history there is and the replay is
        // then complete with nothing shown; the leftover budget continues into the next chunk.
        guaranteed && waiting.isEmpty && heldNow == 0
    }

    override def noteStreamReplayFinished(streamId: String): Unit = synchronized {
        if guaranteed && waiting.contains(streamId) then
            waiting -= streamId
            if headless.remove(streamId) then
                tailHeadless += streamId
                tailFloorCacheDirty = true
    }

    override def extendReplayBoundary(ends: Map[String, EntryPosition]): Unit = synchronized {
        if guaranteed then
            ends.foreach { (streamId, end) =>
                // Finished under the NEW boundary: nothing was recorded for it, or its last
                // offer already reached the new end (everything up to it is in hand or emitted).
                // Anything else has a delta to replay and re-enters the barrier.
                val finished =
                    end == EntryPosition.empty
                        || lastOfferedPositions.get(streamId).exists(offered => isPastBacklogEnd(offered, end))
                if finished then
                    if waiting.contains(streamId) then
                        waiting -= streamId
                        if headless.remove(streamId) then
                            tailHeadless += streamId
                            tailFloorCacheDirty = true
                else
                    waiting += streamId
                    if tailHeadless.remove(streamId) then tailFloorCacheDirty = true
                    if pending.get(streamId).forall(_.isEmpty) then headless += streamId
            }
            // A fresh chunk gets a fresh silence clock: the wait so far proves nothing about the
            // streams this extension just re-armed.
            blindSince = None
            stallWarned = false
    }

    /** SWITCH A LIVE GUARANTEED LAYER TO BEST EFFORT, and answer with everything that released -
      * in the new order, handled exactly as an offer's resolutions are.
      *
      * WHY THIS EXISTS. The replay waits only on streams still inside their recorded range - but
      * a range that can no longer be delivered (trimmed by retention, or a start position seeked
      * past the end) holds delivery indefinitely: the barrier cannot tell "nothing left" from
      * "nothing yet" there. That wait is disclosed; this is what makes it ACTIONABLE
      * without throwing the session away. Everything already received stays received: the held
      * messages have not been acknowledged and exist nowhere else, so re-creating the session
      * would lose them, re-resolve the start-from against a log that has moved, and redeliver
      * what is already on screen.
      *
      * WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT:
      *
      *   - the POLICY drops one step (GuaranteedOnly -> BestEffortOnly, ExactCutThenGuaranteed ->
      *     ExactCutThenBestEffort), so from here the two continuous rules govern: the order-safe
      *     fast path, and the residence bound that is the liveness escape guaranteed refused to
      *     have. Messages already held AND messages still arriving are both covered - there is one
      *     rule set and it is now the best-effort one;
      *   - every stream the guaranteed rule was blind on becomes a SILENT stream: its floor speaks
      *     for it, and nothing waits on it forever any more. Held heads whose residence has
      *     already run out - which is every head of a session that stalled long enough for anyone
      *     to notice - are released by the `advance` below, in merge order, exactly once. A head
      *     that arrived a moment ago waits out its own residence like any other and is released by
      *     the continuous sweep, which is already armed;
      *   - an UNRESOLVED COUNTED CUT is untouched. While `dropping` the exact rule still holds and
      *     the waited set must stay exactly as it was, or the cut would select different messages;
      *     the budget is neither spent, refunded nor skipped by the switch. Only the guaranteed
      *     ADDITIONS - waiting on everyone forever, and never giving up - are what relax;
      *   - acknowledgment identity, the duplicate watermarks, the flow-control marks and the byte
      *     and count accounting are all the same objects, carried straight over. What the drain
      *     empties, the caller's reconcile then un-pauses.
      *
      * ONE WAY ONLY. There is no promotion back: Guaranteed is a claim about what the user has
      * ALREADY been shown, and a session that has emitted past a silent stream cannot un-emit it -
      * see [[deliveryOrderSwitchFor]], which refuses the other directions rather than pretending.
      *
      * CONCURRENCY. Under this object's monitor like every other merge decision, and the caller
      * holds the session's ordering lock - the same nesting an offer, a sweep and the guaranteed
      * pump all use, so no new lock ordering is introduced. A guaranteed peek cannot be
      * outstanding across it (peek and its commit/abort live inside one ordering-lock block), and
      * the in-flight slot is cleared anyway so a stale commit can never pop a head this switch has
      * already released.
      */
    override def relaxGuaranteedToBestEffort(): Vector[(P, StartFromOutcome)] = synchronized {
        if !guaranteed then Vector.empty
        else
            // Exactly one step down, keeping the cut phase where there is one. GuaranteedOnly is
            // only ever built for the Ordered plan, whose budget is a shared ZERO - which is
            // precisely what BestEffortOnly requires of itself at construction.
            activePolicy = activePolicy match
                case OrderingPolicy.ExactCutThenGuaranteed => OrderingPolicy.ExactCutThenBestEffort
                case _                                     => OrderingPolicy.BestEffortOnly
            // Nothing left the merge under the barrier, so there is nothing to hand over - and a
            // commit arriving late must not pop a head the release below is about to emit.
            guaranteedInFlight = None
            // The waited set relaxes only once the counted cut is done with it. While `dropping`,
            // "every waited stream must have a head" is what keeps the cut exact.
            if !dropping then
                tailHeadless ++= headless
                tailFloorCacheDirty = true
                waiting = Set.empty
                headless.clear()
            // The stall clock measured a wait that no longer exists.
            blindSince = None
            stallWarned = false
            advance()
    }

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

    /** Drop the globally-first `n` across `streams`: a [[GlobalSkipMerge]]. `afterCut` says
      * what the same layer does once the cut resolves: go inert (AsReceived), keep ordering
      * best-effort, or keep ordering GUARANTEED. */
    case GlobalSkip(
        n: Long,
        streams: Vector[StartFromStream],
        afterCut: consumer.session_config.MessageDeliveryOrder = consumer.session_config.MessageDeliveryOrder.AsReceived
    )

    /** No cut to make - a delivery-ordering layer alone, for the non-counted modes. For BEST
      * EFFORT the streams carry EMPTY recorded ends, deliberately: the continuous rules need no
      * ends, so that plan still costs no broker call per topic. For GUARANTEED the ends ARE the
      * replay boundary - captured at session build (and re-captured by every Resume), one broker
      * call per topic, which is the price of an exact replay. */
    case Ordered(streams: Vector[StartFromStream], ordering: consumer.session_config.MessageDeliveryOrder)

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
  * deliberately - [[consumer.start_from.ApproximateEntryPosition]] per partition and
  * [[consumer.start_from.ApproximatePublishTimePosition]] per logical topic: a count of n can be reached by
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
def globalOrderingPlanFor(
    startFrom: ConsumerSessionStartFrom,
    streams: Vector[StartFromStream],
    afterCut: consumer.session_config.MessageDeliveryOrder = consumer.session_config.MessageDeliveryOrder.AsReceived
): StartFromOrderingPlan =
    if !needsGlobalOrdering(startFrom, streams.size) then StartFromOrderingPlan.PassThrough
    else
        startFrom match
            case v: NthMessageAfterEarliest => StartFromOrderingPlan.GlobalSkip(v.n, streams, afterCut)
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
final class StartFromOrdering[P] private[session_runner] (
    // Package-visible rather than class-private so a test can wire a merge with an INJECTED
    // clock through the real listener/runner plumbing; production construction still goes
    // through [[StartFromOrdering.make]] only.
    private val merge: Option[StartFromMerge[P]],
    initialStreams: Map[String, StartFromStream]
):
    /** The recorded ends every offer is judged against - THE REPLAY BOUNDARY under Guaranteed.
      * A var because a Resume EXTENDS it ([[extendReplayBoundary]]); written under [[inOrder]]
      * like every boundary decision, volatile so the indicator-refinement task (maintenance
      * thread) reads a published snapshot. */
    @volatile private var streams: Map[String, StartFromStream] = initialStreams
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

    /** Whether [[inOrder]] currently takes the session-wide ordering lock: a merge exists and has
      * not settled. The delivery router reads this to keep BLOCKING work out of that lock - a
      * Deliver resolved under it is enqueued to the delivery limiter's FIFO queue (drained on the
      * session's timer thread) instead of running the JS lease and the gRPC write inline on the
      * offering listener thread. Order is preserved by construction: the enqueue happens under
      * the same lock that decided the order, the queue is FIFO with a single drainer, and the
      * limiter refuses inline processing whenever a backlog or an in-flight drain exists. */
    def serializesDeliveries: Boolean = merge.exists(layer => !layer.isSettled)

    /** See [[StartFromMerge.settleIfDone]]. The listener calls this after a resolved batch is
      * fully handled, still under [[inOrder]]. */
    def settleIfDone(): Unit = merge.foreach(_.settleIfDone())

    /** See [[StartFromMerge.resetStallClock]]. The runner calls this on session RESUME. */
    def resetStallClock(): Unit = merge.foreach(_.resetStallClock())

    /** See [[StartFromMerge.abandonedStreamIds]] - the degradation record for the progress API. */
    def abandonedStreams: Vector[String] = merge.map(_.abandonedStreamIds).getOrElse(Vector.empty)

    /** See [[StartFromMerge.stallWarningCount]] - the sweep's cue to disclose a stall. */
    def stallWarningCount: Long = merge.map(_.stallWarningCount).getOrElse(0L)

    /** See [[StartFromMerge.stalledStreamCount]] - a transient user-visible wait. */
    def stalledStreamCount: Int = merge.map(_.stalledStreamCount).getOrElse(0)

    /** See [[StartFromMerge.stalledStreamIds]] - the same wait, by name, for the debug log. */
    def stalledStreamIds: Vector[String] = merge.map(_.stalledStreamIds).getOrElse(Vector.empty)

    /** See [[StartFromMerge.isContinuousOrdering]] - the runner keeps the sweep armed for the
      * session's life (and at the grace cadence) when this is set. */
    def isContinuousOrdering: Boolean = merge.exists(_.isContinuousOrdering)

    /** See [[StartFromMerge.lateDeliveryCount]] - the best-effort order's quality gauge. */
    def lateDeliveryCount: Long = merge.map(_.lateDeliveryCount).getOrElse(0L)

    /** See [[StartFromMerge.isGuaranteedOrdering]]. */
    def isGuaranteedOrdering: Boolean = merge.exists(_.isGuaranteedOrdering)

    /** See [[StartFromMerge.peekGuaranteed]]. Callers hold [[inOrder]]. */
    def peekGuaranteed(): Option[P] = merge.flatMap(_.peekGuaranteed())

    /** See [[StartFromMerge.commitGuaranteed]]. Callers hold [[inOrder]]. */
    def commitGuaranteed(): Unit = merge.foreach(_.commitGuaranteed())

    /** See [[StartFromMerge.abortGuaranteed]]. Callers hold [[inOrder]]. */
    def abortGuaranteed(): Unit = merge.foreach(_.abortGuaranteed())

    /** See [[GlobalSkipMerge.relaxGuaranteedToBestEffort]]. Callers hold [[inOrder]], like every
      * other decision this layer makes. A pass-through layer orders nothing and answers with
      * nothing to release. */
    def relaxGuaranteedToBestEffort(): Vector[(P, StartFromOutcome)] =
        merge.map(_.relaxGuaranteedToBestEffort()).getOrElse(Vector.empty)

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
    // Each hook answers whether the CLIENT CALL actually took: the reconcile below only records
    // transitions that succeeded, so a failed pause or resume is retried on the next reconcile
    // (every handled batch, and every sweep tick) instead of being remembered as done.
    private val streamPauseHooks = mutable.Map.empty[String, (() => Boolean, () => Boolean)]
    private var pausedApplied: Set[String] = Set.empty

    /** Register how to pause and resume one stream's consumer; each hook answers whether the
      * client call succeeded. Idempotent; first registration wins. A no-op for a pass-through
      * layer, which never pauses anybody. */
    def registerStreamPauseHooks(streamId: String, pause: () => Boolean, resume: () => Boolean): Unit =
        if merge.isDefined then
            flowControlLock.synchronized {
                if !streamPauseHooks.contains(streamId) then streamPauseHooks(streamId) = (pause, resume)
            }

    /** Apply the merge's flow-control wishes: pause what it newly wants held still, resume what
      * it no longer does - TRANSITIONS ONLY. The hooks land on per-consumer pause ARBITERS
      * (reason Merge), so nothing outside this layer can stomp a hold or be stomped by a
      * release: a user resume or the delivery pacer letting go releases only its own reason.
      * That is what makes the diff safe again - the old re-assert-everything loop existed to
      * heal external stomps that the arbiter now makes impossible, and it cost a pause call per
      * desired stream per handled batch. Once the merge settles the desired set is empty
      * forever, so the settling batch's reconcile releases everything and later calls no-op.
      */
    def reconcileFlowControl(): Unit = merge.foreach { layer =>
        val desired = layer.desiredPausedStreams
        flowControlLock.synchronized {
            val toPause = (desired -- pausedApplied).filter(streamPauseHooks.contains)
            val toResume = pausedApplied -- desired
            // SUCCESS-ONLY bookkeeping: a transition is recorded as applied exactly when the
            // client call took. A pause that threw stays un-applied and is retried on the next
            // reconcile; a resume that threw stays applied so the release is retried too -
            // recording either unconditionally turned one transient client error into a stream
            // paused (or filling memory) forever, with the books saying everything was fine.
            val paused = toPause.filter(streamId => streamPauseHooks(streamId)._1())
            val resumed = toResume.filter(streamId => streamPauseHooks.get(streamId).forall(_._2()))
            pausedApplied = pausedApplied ++ paused -- resumed
        }
    }

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
        orderTime: Long,
        messageId: PulsarMessageId,
        payload: P,
        knownFailedRetry: Boolean = false
    ): Vector[(P, StartFromOutcome)] = merge match
        case None => Vector(payload -> StartFromOutcome.Deliver)
        case Some(layer) =>
            val streamId = startFromStreamId(consumerName, topicFqn)
            val position = EntryPosition.of(messageId)
            val stream = streams.get(streamId)
            // THE REPLAY BOUNDARY, guaranteed ordering only: a message recorded STRICTLY past
            // this stream's captured end belongs to the NEXT chunk. It bypasses the merge
            // entirely - no order key, no duplicate watermark, no budget - so its post-Resume
            // redelivery arrives as an ordinary first-time offer; its arrival is counted for
            // the approximate newer-messages indicator and finishes the stream's replay
            // (append order: nothing recorded can follow it). Unaddressable ids
            // ([[EntryPosition.empty]]) never trip this - gt against (-1,-1) is false.
            if layer.isGuaranteedOrdering && stream.exists(s => isStrictlyPastBacklogEnd(position, s.lastAtStart)) then
                notePastBoundaryEntry(streamId, position)
                layer.noteStreamReplayFinished(streamId)
                Vector(payload -> StartFromOutcome.NextChunk)
            else
                // An unknown stream is treated as already drained, for the same reason an
                // unanswerable one is: the merge must never wait on something it knows nothing
                // about.
                val atBacklogEnd = stream.forall(s => isPastBacklogEnd(position, s.lastAtStart))
                layer.offer(streamId, MessageOrderKey.of(orderTime, topicFqn, position), atBacklogEnd, payload, knownFailedRetry, position)

    // Distinct past-boundary ENTRIES seen so far, per stream the newest one - the locally-known
    // lower bound behind the "~N newer" indicator on the caught-up signal (a broker refinement
    // may raise it later). Approximate by design: broker redeliveries of a handed-back message
    // arrive again and must not double-count, so only an entry NEWER than the stream's newest
    // seen is counted - an out-of-order redelivery burst undercounts, which the "~" absorbs.
    // Written under [[inOrder]] (the offer path); the counter is volatile for the report path.
    private val pastBoundarySeen = mutable.Map.empty[String, (Long, Long)]
    @volatile private var pastBoundaryEntries: Long = 0L

    private def notePastBoundaryEntry(streamId: String, position: EntryPosition): Unit =
        val entry = (position.ledgerId, position.entryId)
        if pastBoundarySeen.get(streamId).forall(seen => Ordering[(Long, Long)].gt(entry, seen)) then
            pastBoundarySeen(streamId) = entry
            pastBoundaryEntries += 1

    /** Past-boundary entries observed since the current boundary was captured - see above. */
    def replayNewerEntriesSeen: Long = pastBoundaryEntries

    /** The recorded end each stream's replay is bounded by RIGHT NOW - the refinement task
      * compares the broker's current ends against these. A snapshot; safe off-thread. */
    def replayBoundaryEnds: Map[String, EntryPosition] = streams.view.mapValues(_.lastAtStart).toMap

    /** EXTEND the replay boundary to freshly captured ends - what a Resume does for a Guaranteed
      * session. Callers hold [[inOrder]], like every other boundary decision: serializing this
      * against the offer path is exactly what makes "a past-end nack racing the re-capture"
      * converge (either the offer still sees the old boundary and its nack is released by the
      * resume right after, or it already sees the new one and delivers normally). */
    def extendReplayBoundary(extended: Vector[StartFromStream]): Unit =
        streams = streams ++ extended.map(stream => stream.id -> stream)
        pastBoundarySeen.clear()
        pastBoundaryEntries = 0L
        merge.foreach(_.extendReplayBoundary(extended.map(stream => stream.id -> stream.lastAtStart).toMap))

    /** See [[StartFromMerge.isReplayCaughtUp]]. Callers hold [[inOrder]]. */
    def isReplayCaughtUp: Boolean = merge.exists(_.isReplayCaughtUp)

    /** See [[StartFromMerge.peekIsSeamViolation]]. Callers hold [[inOrder]], between a peek and
      * its commit - the window in which the answer cannot move. */
    def peekIsSeamViolation: Boolean = merge.exists(_.peekIsSeamViolation)

    /** See [[StartFromMerge.replaySeamViolationCount]] - the session counter on ConsumerStats. */
    def replaySeamViolationCount: Long = merge.map(_.replaySeamViolationCount).getOrElse(0L)

object StartFromOrdering:
    /** Reorders nothing, and holds nothing. */
    def passThrough[P]: StartFromOrdering[P] = new StartFromOrdering[P](None, Map.empty)

    def make[P](plan: StartFromOrderingPlan, payloadBytesOf: P => Long = (_: P) => 0L): StartFromOrdering[P] = plan match
        case StartFromOrderingPlan.PassThrough => passThrough[P]
        case StartFromOrderingPlan.GlobalSkip(n, streams, afterCut) =>
            new StartFromOrdering[P](
                Some(
                    GlobalSkipMerge[P](
                        streams.map(_.id),
                        drainedAtStart(streams),
                        StartFromDiscard.shared(n),
                        payloadBytesOf = payloadBytesOf,
                        policy = afterCut match
                            case consumer.session_config.MessageDeliveryOrder.AsReceived => OrderingPolicy.ExactCutOnly
                            case consumer.session_config.MessageDeliveryOrder.BestEffort => OrderingPolicy.ExactCutThenBestEffort
                            case consumer.session_config.MessageDeliveryOrder.Guaranteed => OrderingPolicy.ExactCutThenGuaranteed
                    )
                ),
                byId(streams)
            )
        case StartFromOrderingPlan.Ordered(streams, ordering) =>
            new StartFromOrdering[P](
                Some(
                    GlobalSkipMerge[P](
                        streams.map(_.id),
                        // Nothing recorded at the boundary means nothing to replay: such streams
                        // are never waited for. Vacuous for best effort (its streams all carry
                        // empty ends AND its waited set is empty by policy); load-bearing for the
                        // guaranteed replay - Latest and the single non-persistent stream land
                        // here with every end empty, which is the instant caught-up.
                        drainedAtStart = drainedAtStart(streams),
                        // A shared zero budget: nothing to drop (and no skip progress - toSkip
                        // is 0), which is what both ordering-only policies require.
                        StartFromDiscard.shared(0),
                        payloadBytesOf = payloadBytesOf,
                        policy = ordering match
                            case consumer.session_config.MessageDeliveryOrder.Guaranteed => OrderingPolicy.GuaranteedOnly
                            case _                                                       => OrderingPolicy.BestEffortOnly
                    )
                ),
                // The recorded ends gate ONLY the guaranteed replay. A best-effort plan carries
                // empty ends (never resolved - no broker call), and its offers keep computing
                // atBacklogEnd = true against them, exactly as the endless map used to.
                byId(streams)
            )

    private def byId(streams: Vector[StartFromStream]): Map[String, StartFromStream] =
        streams.map(stream => stream.id -> stream).toMap

    /** Streams that held nothing when the session started - an empty topic, or one that would not
      * say. They can never be waited for. */
    private def drainedAtStart(streams: Vector[StartFromStream]): Set[String] =
        streams.filter(_.lastAtStart == EntryPosition.empty).map(_.id).toSet
