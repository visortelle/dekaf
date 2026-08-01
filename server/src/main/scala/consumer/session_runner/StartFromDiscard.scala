package consumer.session_runner

import java.util.concurrent.atomic.AtomicLong

/** What a start-from seek could NOT achieve on its own, expressed as messages to drop from the head
  * of the delivered stream.
  *
  * A seek can only ever land on an ENTRY boundary: `PulsarAdmin.examineMessage` - the only primitive
  * that addresses a position without reading the whole log - counts ENTRIES, a batching producer
  * (the Java client default) puts many messages into one entry, and batch-index positions such as
  * `1696:1:25` are rejected by the broker ("must be in format: ledgerId:entryId"). Landing on an
  * exact MESSAGE therefore means seeking to the entry that contains it and dropping the messages
  * that precede it inside that entry. There is no other exact mechanism.
  */
/** How many messages a discard swallows between progress reports.
  *
  * "Skip first n" is deliberately uncapped, so n can be in the millions; one gRPC frame per skipped
  * message would be millions of frames for a progress bar. Coarse enough to be a trickle, fine
  * enough that a skip big enough for the UI to bother showing (it surfaces above 1,000,000) still
  * moves visibly.
  */
val startFromProgressReportInterval: Long = 10_000

/** Whether the discard should tell the client about the message it has just swallowed, `skipped`
  * being the running count INCLUDING that one.
  *
  * The first is always reported, so the client learns the total as soon as the skip starts rather
  * than one interval later. The last is always reported, so the run is seen to complete. In between
  * only every `reportEvery`-th.
  *
  * `skipped >= total` rather than `==`: the counters are claimed from one listener thread per
  * physical topic, and a thread that reads the running count a moment late must still report the
  * end rather than sail past it.
  *
  * APPROXIMATE BY DESIGN. Under contention two threads can read the same count, or step over an
  * interval boundary between them, so an intermediate tick may be reported twice or missed. Both are
  * harmless for a progress indicator, and the end is not: every thread that reads a spent counter
  * reports it.
  */
def shouldReportStartFromProgress(skipped: Long, total: Long, reportEvery: Long): Boolean =
    if total <= 0 || skipped <= 0 then false
    else skipped == 1 || skipped >= total || (reportEvery > 0 && skipped % reportEvery == 0)

enum StartFromDiscardPlan:
    /** The seek landed exactly - deliver everything from it. */
    case Nothing

    /** One counter for the WHOLE session: drop the first `n` messages of the merged delivered
      * stream, whichever topic or partition each came from. */
    case SharedTotal(n: Long)

    /** An independent counter per physical topic: drop the first `counts(topic)` messages that
      * topic delivers. */
    case PerTopic(counts: Map[NonPartitionedTopicFqn, Long])

/** The live counters behind a [[StartFromDiscardPlan]].
  *
  * Armed ONCE, after the seek and before any consumer is resumed, and never re-armed: pausing and
  * resuming a session must not skip a second batch of messages.
  */
final class StartFromDiscard private (
    private val shared: Option[AtomicLong],
    private val perTopic: Map[NonPartitionedTopicFqn, AtomicLong]
):
    /** Claims a delivered message for the discard. `true` means DROP it (and count it as dropped),
      * `false` means deliver it. Called from the Pulsar client's listener threads - one per consumer
      * - so the counters have to be atomic. */
    def claim(topicFqn: NonPartitionedTopicFqn): Boolean =
        shared.orElse(perTopic.get(topicFqn)) match
            case Some(counter) => counter.getAndUpdate(left => if left > 0 then left - 1 else 0) > 0
            case None          => false

    /** Give a claimed drop back, because the message it was claimed for could not be acknowledged.
      *
      * A claim COSTS A MESSAGE - the message is acknowledged into nothing and nobody sees it - so a
      * claim that no acknowledgment ever matched is a message Pulsar will redeliver against an
      * already-spent budget, and the redelivery is then shown. Refunding keeps the invariant
      * "units spent == messages actually dropped": the redelivery claims the unit again.
      *
      * Never above what was armed, because a refund only ever follows a claim.
      */
    def refund(topicFqn: NonPartitionedTopicFqn): Unit =
        shared.orElse(perTopic.get(topicFqn)).foreach(_.incrementAndGet())
        ()

    /** Messages still to be dropped. Exposed so tests can assert "exactly n were skipped" rather
      * than inferring it from what came out. */
    def remaining: Long = shared.map(_.get).getOrElse(perTopic.values.map(_.get).sum)

    /** Whether this counter is the USER'S skip, and so something to report progress for.
      *
      * Only the session-wide counter is: it exists because the user asked to skip the first n
      * messages, which is O(n) and can take a long time with nothing to show for it. A PER-TOPIC
      * counter is the opposite - it is the internal correction that makes "the latest n" exact,
      * because a seek can only land on an entry boundary and each topic therefore over-fetches.
      * Reporting that told a client asking for the last 5 messages that it was "skipping 95".
      *
      * The proto says the same thing: "Only NthMessageAfterEarliest needs this".
      */
    def reportsProgress: Boolean = shared.isDefined

    /** How many messages this discard was ARMED with - what the user asked to skip.
      *
      * Captured once, at construction: read off the live counters it would shrink to zero as the
      * skip progressed, and the client would be told the total was however much was left.
      */
    val total: Long = shared.map(_.get).getOrElse(perTopic.values.map(_.get).sum)

object StartFromDiscard:
    /** Drops nothing, ever. A single immutable instance - it holds no counters to share. */
    val none: StartFromDiscard = new StartFromDiscard(None, Map.empty)

    def shared(n: Long): StartFromDiscard = new StartFromDiscard(Some(new AtomicLong(n max 0)), Map.empty)

    def perTopic(counts: Map[NonPartitionedTopicFqn, Long]): StartFromDiscard =
        new StartFromDiscard(None, counts.map((topicFqn, n) => topicFqn -> new AtomicLong(n max 0)))

    /** Arms the counters for one consumer session target. `shared` must be the SAME instance for
      * every target of a session, so that a [[StartFromDiscardPlan.SharedTotal]] really is one
      * counter over the merged stream. */
    def forTarget(
        plan: StartFromDiscardPlan,
        shared: StartFromDiscard,
        topicFqns: Vector[NonPartitionedTopicFqn]
    ): StartFromDiscard =
        plan match
            case StartFromDiscardPlan.Nothing        => none
            case StartFromDiscardPlan.SharedTotal(_) => shared
            // A fresh counter per target: two targets may select the SAME topic, and each has its
            // own consumer on it that has to drop its own overshoot.
            case StartFromDiscardPlan.PerTopic(counts) => perTopic(counts.view.filterKeys(topicFqns.toSet).toMap)
