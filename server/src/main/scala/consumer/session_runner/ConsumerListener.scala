package consumer.session_runner

import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.{MessageListener, MessageId as PulsarMessageId}

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

/** What this session has already decided about ONE broker entry's batch members, and whether the
  * broker can still redeliver that entry.
  *
  * `decided` is the standing decision - delivered or dropped - that makes a redelivered copy pure
  * paperwork. `unfinished` is the lifecycle half: members whose broker answer is not final yet,
  * either because their acknowledgment is still in flight or because they were handed BACK. The
  * broker retires an entry only once every one of its members has been acknowledged on one consumer
  * incarnation, so an entry is redeliverable - and its record therefore load-bearing - until every
  * member has been decided AND every one of those decisions has been acknowledged.
  */
private final class BatchEntryState:
    val decided: java.util.BitSet = java.util.BitSet()
    val unfinished: java.util.BitSet = java.util.BitSet()

    /** How many members this entry holds, as the broker's own id reports it, or -1 when the id does
      * not carry it. Only ids built by hand lack it; every id a Pulsar consumer delivers has it. */
    var batchSize: Int = -1

    /** This entry can no longer be redelivered - every member has been decided and answered for -
      * so its record is dead weight. Without a batch size, completeness is unknowable and the
      * answer falls back to "nothing outstanding", which is no weaker than having no record at all.
      */
    def isSettled: Boolean =
        unfinished.isEmpty && (batchSize <= 0 || decided.cardinality >= batchSize)

object ConsumerListener:
    /** How many SETTLED entry records to keep - entries nothing is owed for, kept only against a
      * broker unload redelivering what it has not yet retired. Entries still owed a redelivery are
      * exempt (see [[BatchEntryState]]), which is what makes this a cache size rather than the
      * correctness bound it was mistaken for. */
    private[session_runner] val settledBatchEntryCap: Int = 512

    /** How far one insertion may walk looking for settled records to reclaim. Keeps the per-message
      * cost constant when the oldest records are all still owed; the next insertion continues. */
    private[session_runner] val settledBatchEntryEvictionWalk: Int = 64

    /** What to do with a message the broker just delivered. */
    enum Action:
        /** The session is paused - hand it back so it is redelivered on resume. */
        case Reject

        /** Consumed by the start-from discard - acknowledge it, but show it to nobody. */
        case Drop

        case Deliver

class ConsumerListener(val targetMessageHandler: ConsumerSessionTargetMessageHandler) extends MessageListener[Array[Byte]] {
    val logger: Logger = Logger(getClass.getName)

    // https://levelup.gitconnected.com/graceful-shutdown-of-pulsar-queue-consumers-in-java-and-spring-boot-f93645a92b2b
    //
    // STARTS CLOSED, and that is load-bearing. `handleStartFrom` RESUMES every consumer before it
    // seeks them, so the broker starts delivering while the session is still being built - before
    // the start-from counters and the global ordering layer are armed, and while the target's
    // message handler is still the no-op it was constructed with. Accepting there consumed those
    // messages and ACKNOWLEDGED them into nothing, so a session whose set-up did any broker round
    // trip (the backward entry walk, or reading each topic's last message id) could swallow its
    // whole backlog and then deliver nothing at all. Rejecting instead hands them straight back.
    //
    // ATOMIC, and that is load-bearing too. This gate is READ from one Pulsar listener thread per
    // physical topic and WRITTEN from the gRPC threads that pause and resume the session. As a
    // plain `var Boolean` there was no happens-before between the two at all, so a listener thread
    // was entitled to go on seeing "accepting" indefinitely after the user had paused - delivering
    // into a paused session, and spending its start-from budget while doing so. Nothing here needs
    // compare-and-set; what it needs is the visibility.
    private val acceptingNewMessages = AtomicBoolean(false)

    /** Armed ONCE by `ConsumerSessionRunner.make`, after the start-from seek and before anything is
      * resumed. Nothing on the pause/resume path may reassign it: re-arming would skip a fresh
      * batch of messages every time the user hits play.
      */
    var startFromDiscard: StartFromDiscard = StartFromDiscard.none

    /** The session-wide layer that puts the delivered streams into their GLOBAL order, for the two
      * start-from modes that are defined over the merged stream rather than over one log.
      *
      * Armed ONCE alongside [[startFromDiscard]], and the SAME instance on every target of the
      * session - the counting is over the whole session, so a per-target layer would count each
      * target separately. Nothing on the pause/resume path may reassign it, for the same reason.
      */
    var startFromOrdering: StartFromOrdering[HeldMessage] = StartFromOrdering.passThrough

    /** The counter start-from progress is read off - the USER'S skip, and nothing else.
      *
      * A global skip merge owns its own budget - it has to, since it decides the drops itself - and
      * that budget is what the client should be shown. Otherwise it is this listener's own counter,
      * but ONLY when that counter is a user skip: a "latest n" arms a per-topic counter to drop the
      * over-fetch its seek could not avoid, and showing that as progress told a client that asked
      * for the last 5 messages it was "skipping 95". See [[StartFromDiscard.reportsProgress]].
      */
    def progressDiscard: StartFromDiscard =
        if effectiveDiscard.reportsProgress then effectiveDiscard else StartFromDiscard.none

    /** The counter actually doing the dropping, whoever owns it: the merge when it decides the drops
      * itself, this listener otherwise.
      *
      * Deliberately WIDER than [[progressDiscard]]. This is the mechanism - what diagnostics and
      * tests ask "how many messages are still to be dropped" - and it must answer for a latest-n
      * seek correction too. What the CLIENT is shown is the narrower one.
      *
      * `filter(_.total > 0)`: an ordering-ONLY layer carries a shared ZERO budget (it orders, it
      * drops nothing), and letting that zero shadow the listener's own counter made a latest-n's
      * per-topic overshoot report 0 remaining - so `startFromResolutionActive` went false, and the
      * rate limiter's permit hold was un-suppressed in exactly the window the suppression exists
      * to protect. A merge that was ARMED with a budget keeps answering even once it is spent -
      * its zero then genuinely means "nothing left to drop".
      */
    def effectiveDiscard: StartFromDiscard = startFromOrdering.progressDiscard.filter(_.total > 0).getOrElse(startFromDiscard)

    /** The consumed range for each physical topic this listener consumes, for the "Topic Positions"
      * debug view. Read out of band by [[consumedBounds]] on a gRPC thread while listener threads
      * write it, hence concurrent.
      *
      * RECORDED WHERE MESSAGES ARE ACKNOWLEDGED - on a Drop as well as a Deliver - because both mean
      * the session consumed the message. The alternative, letting the client derive it from the rows
      * on screen, is wrong by however much the session filters out: a filter passing 1% of a topic
      * would show a session that had read to the end as barely started.
      *
      * OUTWARD-ONLY BOUNDS. `negativeAcknowledge` and the merge's cap both put messages back for
      * redelivery, so an OLDER message can legitimately arrive after a newer one has been counted.
      * That older message may widen `first`, but can never walk `last` backwards. One immutable
      * value per topic also means an RPC cannot observe a new first paired with an old last.
      */
    private val consumedBoundsByTopic = ConcurrentHashMap[String, TopicConsumedBounds]()

    /** Record one message that `topicFqn` has consumed. The range only widens - see
      * [[consumedBoundsByTopic]].
      */
    def recordCursor(topicFqn: String, messageId: PulsarMessageId, publishTime: Long): Unit =
        val incoming = TopicCursor(messageId, publishTime)
        // `compute` avoids constructing and immediately discarding a one-element bounds object
        // for every message after the first; the only steady-state allocations are the incoming
        // cursor and the immutable replacement the atomic map publishes.
        consumedBoundsByTopic.compute(
            topicFqn,
            (_, existing) =>
                if existing == null then TopicConsumedBounds(incoming, incoming)
                else widenConsumedBounds(existing, incoming)
        )
        ()

    /** An atomic-per-topic snapshot of the consumed ranges. */
    def consumedBounds: Map[String, TopicConsumedBounds] = consumedBoundsByTopic.asScala.toMap

    /** Whether the pause gate is open. The permit-hold arbitration reads this so the delivery
      * pacer's backpressure can never resume a consumer the USER paused. */
    def isAcceptingNewMessages: Boolean = acceptingNewMessages.get

    /** The session's delivery rate limiter, or None until a resume installs one. SHARED - every
      * listener of the session holds the same instance, because the limit is per session, not per
      * topic. Rewired on resume BEFORE the gate opens, like the message handler: the gate's
      * volatile write is what publishes it to the listener threads.
      */
    @volatile var deliveryRateLimiter: Option[DeliveryRateLimiter[HeldMessage]] = None

    /** Deliver one resolved message NOW, on the calling thread: hand it to the target's message
      * handler, acknowledge it, and advance the read position.
      *
      * SELF-CONTAINED FAILURE HANDLING, because it has two callers with different surroundings: the
      * resolved-batch loop (whose own catch would also cover it) and the rate limiter's drain
      * thread (which has nothing above it). A failed delivery is handed back for redelivery - the
      * same contract the loop pinned in round 3 - and costs only itself.
      */
    def deliverNow(held: HeldMessage): Unit =
        try
            // The merge decided at emission whether this delivery undercuts an already-emitted
            // key (Best effort's late emission); the stamp pairs with THIS call stack only.
            held.listener.outOfOrderFlagPending.set(held.deliveredOutOfOrder)
            try held.listener.targetMessageHandler.onNext(held.message)
            finally held.listener.outOfOrderFlagPending.set(false)
            acknowledge(held.consumer, held.message)
            held.listener.recordCursor(
                held.consumer.getTopic,
                held.message.getMessageId,
                held.message.getPublishTime
            )
        catch
            case err: Throwable =>
                logger.warn(s"Handing a message back for redelivery: delivering it failed. ${err.getMessage}")
                // THE EXPLICIT LIFECYCLE TRANSITION the merge's duplicate arm consults: only a
                // failure recorded here licenses delivering a watermarked copy as the retry.
                failedDeliveries.add((held.consumer.getTopic, held.message.getMessageId))
                held.listener.noteBatchMemberHandedBack(held.consumer.getTopic, held.message.getMessageId)
                Try(held.consumer.negativeAcknowledge(held.message))
                ()

    /** Route one Deliver outcome: through the session's rate limiter when one is installed,
      * straight through otherwise.
      *
      * WHILE THE ORDERING LOCK IS LIVE the offer is FORCED to be an enqueue. The unlimited
      * (rate 0) path used to answer processNow and run the whole delivery - deserialization, the
      * JS lease, the blocking gRPC write - inline on the offering thread with the session's
      * ordering lock held, so one backpressured client parked every listener thread and the
      * sweep with them. Forcing the queue moves the write to the limiter's single drainer,
      * OUTSIDE the lock, and order is preserved by construction: the enqueue happens under the
      * same lock that decided the order, the queue is FIFO, and the limiter refuses inline
      * processing whenever a backlog or an in-flight drain exists - so a later message can never
      * overtake a queued one. Once the merge settles (`serializesDeliveries` false), the
      * unlimited inline fast path is back, exactly as before.
      */
    def deliver(held: HeldMessage): Unit = deliveryRateLimiter match
        case Some(limiter) => limiter.offer(held, forceQueueOnce = startFromOrdering.serializesDeliveries)
        case None          => deliverNow(held)

    /** Called once per message the discard swallows, so a skip in flight can be reported to the
      * client - a dropped message reaches nothing else, so this is the only signal there is.
      *
      * A no-op until a client resumes the session, and rewired by
      * `ConsumerSessionTargetRunner.resume` on every play. Unlike [[startFromDiscard]] there is
      * nothing to preserve across a pause: it carries no state.
      */
    var onStartFromDiscardProgress: () => Unit = () => ()

    /** GUARANTEED replay: the chunk completed - every stream delivered its recorded range and
      * the heap is drained. The runner wires this per play (it carries the play generation and
      * a once-per-chunk claim) to the AUTO-PAUSE and the caught-up signal; a no-op until then.
      * Invoked from [[pumpGuaranteedDelivery]] under the session's ordering lock. */
    var onReplayCaughtUp: () => Unit = () => ()

    /** Whether the delivery currently running through this listener's target pipeline was emitted
      * OUT OF ORDER - its order key undercuts one already emitted. Under GUARANTEED that is a
      * seam violation (resume-seam clock skew, or a source-log inversion), set and cleared around
      * each barrier send by [[pumpGuaranteedDelivery]]. Under BEST EFFORT (since 2026-08-11) it
      * is a late emission - the message outlived its reorder window - and rides the HeldMessage
      * from the merge through [[deliverNow]].
      *
      * A THREAD LOCAL, not a plain flag: guaranteed sends are serialized by the ordering lock,
      * but best-effort sends can run concurrently on different listener threads for the SAME
      * target, and the stamp must pair with the delivery on ITS OWN call stack - the target
      * pipeline reads it synchronously inside onNext. The target pipeline stamps it onto the
      * outgoing row (Message.delivered_out_of_order). */
    val outOfOrderFlagPending: ThreadLocal[java.lang.Boolean] = ThreadLocal.withInitial(() => java.lang.Boolean.FALSE)

    /** Report a drop to the client, and NEVER let that reporting cost the message.
      *
      * The push ends in `StreamObserver.onNext`, which throws whenever the client's call has been
      * cancelled. It used to be called between claiming the discard budget and acknowledging the
      * message: the throw propagated out of `received`, so the budget had been spent on a message
      * that was never acknowledged - the broker redelivered it, the spent budget let it through,
      * and the session showed a message the user had asked to skip. Fewer than n unique messages
      * were dropped, and nothing said so.
      *
      * Progress is a UI nicety. Losing it costs a progress bar; losing a message costs correctness.
      */
    private def reportDiscardProgress(): Unit =
        try onStartFromDiscardProgress()
        catch
            case err: Throwable =>
                logger.warn(s"Failed to report start-from progress; the skip itself is unaffected. ${err.getMessage}")

    def stopAcceptingNewMessages(): Unit =
        acceptingNewMessages.set(false)

    def startAcceptingNewMessages(): Unit =
        acceptingNewMessages.set(true)

    /** The whole decision, split out of `received` so it is testable without a broker - a paused
      * session must NOT consume the discard (the message is coming back), and the discard must
      * survive any number of pause/resume cycles.
      *
      * `canAcknowledge` is whether the consumer can still answer the broker for this message. A
      * message that CANNOT be acknowledged must not be decided at all: claiming the discard for it
      * spends a unit of the user's "skip the first n" on a message the broker will simply redeliver,
      * and the redelivery then meets an empty budget and is SHOWN - so the session skips fewer than
      * n unique messages while reporting that the skip completed. Handing it straight back costs
      * one redelivery and nothing else.
      *
      * Reporting the drop happens HERE rather than in `received`, next to the claim that caused it:
      * the claim is already the mutation this method performs, and keeping the two together is what
      * makes "a rejected message does not count as skipped" testable without a broker. It goes
      * through [[reportDiscardProgress]], so a failing report cannot abort the acknowledgment that
      * has to follow the claim.
      */
    def decide(topicFqn: NonPartitionedTopicFqn, canAcknowledge: Boolean): ConsumerListener.Action =
        if !acceptingNewMessages.get then ConsumerListener.Action.Reject
        else if !canAcknowledge then ConsumerListener.Action.Reject
        else if startFromDiscard.claim(topicFqn) then
            reportDiscardProgress()
            ConsumerListener.Action.Drop
        else ConsumerListener.Action.Deliver

    /** Messages this session DECIDED - dropped or delivered - whose acknowledgment the broker did
      * not take. The decision stands; only the paperwork failed. The redelivery is met at the very
      * top of [[received]]: acknowledged again and otherwise ignored, never re-decided.
      *
      * THIS SET IS WHAT MAKES THE COUNTED MODES EXACT UNDER A FAILED ACK. The alternatives were
      * both wrong in a way three review rounds circled: REFUNDING the budget kept the count right
      * but let the budget be spent on a DIFFERENT message, so the redelivered original was shown -
      * "skip the first n" skipped some other n. NOT refunding kept the set right until the
      * redelivery arrived after the budget closed and was shown anyway - n was simply wrong. The
      * decision-stands-retry-the-ack rule keeps both: the unit stays spent on exactly the message
      * it was claimed for, and that message can never reappear, however late the broker redelivers
      * it. A DELIVERED message whose ack failed gets the same treatment, which also stops its
      * redelivery from being shown twice.
      *
      * Bounded by the number of failed acknowledgments (rare - a disconnect race), and each entry
      * leaves the moment its redelivery is finalized.
      */
    /** streamId -> the consumer's pause arbiter, set by the target runner at build time. The
      * merge's flow-control hooks go through these - see [[ConsumerPauseArbiter]]. */
    var pauseArbiters: Map[String, ConsumerPauseArbiter] = Map.empty

    // Keyed by (topic FQN, message id), NEVER by the id alone: this listener serves every topic
    // consumer of its target, and a bare id is not an identity - measured against a real broker,
    // EVERY non-persistent message arrives as ledger 0, entry 0, so an id-keyed marker from one
    // failed ack would swallow the next unrelated message of that topic as "paperwork".
    private val awaitingAckRetry = ConcurrentHashMap.newKeySet[(String, PulsarMessageId)]()

    /** Which per-message timestamp the delivery order compares - rewired at session build from the
      * configured [[consumer.session_config.DeliveryOrderKey]]. The default is publish time,
      * which every message carries. */
    var orderingTimeOf: org.apache.pulsar.client.api.Message[Array[Byte]] => Long = _.getPublishTime

    /** How many messages used publish time because the selected timestamp was absent on
      * the message (no broker stamp, no event time). Feeds the client's remediation notice. */
    val orderKeyFallbacks = new java.util.concurrent.atomic.AtomicLong(0)

    /** Deliveries this listener SAW fail downstream - the explicit lifecycle fact that licenses
      * the merge to treat a watermarked broker copy as the retry (and nothing else does; see the
      * merge's duplicate arm). Entries leave when the retry is claimed. Bounded by the number of
      * failed deliveries between redeliveries - rare, and discarded with the listener. */
    private val failedDeliveries = ConcurrentHashMap.newKeySet[(String, PulsarMessageId)]()

    /** Batch members this session already DECIDED (delivered or dropped), by their entry.
      *
      * A batched producer packs many messages into one broker ENTRY, and without broker-side
      * batch-index acknowledgment (a broker setting Dekaf must not require) the per-member acks
      * are client-local bits: the broker only retires the entry once EVERY member is acknowledged
      * on one consumer incarnation of it. So when the pause gate slices an entry - first half
      * delivered, second half refused and handed back - the broker redelivers the WHOLE entry,
      * already-shown members included, wearing a fresh ack set. Those copies used to be re-decided
      * from scratch: re-shown (the loaded count inflated by half a batch per hot pause), or in the
      * counted modes re-dropped against budget already spent on them.
      *
      * The bits are set inside [[acknowledge]] - the one point every decision funnels through, for
      * delivered and dropped alike - and consulted at the top of [[received]], in the same
      * "the decision stands, only the paperwork remains" position as [[awaitingAckRetry]]:
      * acknowledge the copy (that is what completes the redelivered entry's ack set and retires
      * the entry) and show it to nobody.
      *
      * Non-persistent topics are excluded for the usual identity reason (every id is ledger 0,
      * entry 0 - and nothing is ever redelivered).
      *
      * RETENTION IS A LIFECYCLE, NOT AN AGE, and that is the whole design of the eviction below.
      * These records used to be evicted by insertion order at 512 entries while ONE target may hold
      * a thousand physical streams: a hot pause slices one outstanding entry PER STREAM, so the
      * earliest ~488 of them were discarded before their redelivery ever arrived, and the
      * whole-entry redelivery then re-showed members this session had already delivered - or, in
      * the counted modes, spent a second unit of the user's budget on them. A record is now exempt
      * from the cap for exactly as long as the broker still owes this session the redelivery it
      * describes ([[BatchEntryState.isSettled]]), so the structure covers every admitted stream by
      * construction and not by a bigger magic number. It still cannot grow without bound: an entry
      * leaves the owed set the moment its handed-back members are decided again, so the size is
      * bounded by the settled cap plus the sliced entries the session's own streams are holding -
      * one per stream, and the streams are admission-capped.
      */
    private val decidedBatchMembers = java.util.LinkedHashMap[(String, Long, Long), BatchEntryState]()

    private def batchMemberKey(topicFqn: String, id: PulsarMessageId): Option[((String, Long, Long), Int, Int)] =
        id match
            case b: org.apache.pulsar.client.impl.BatchMessageIdImpl if b.getBatchIndex >= 0 && !isNonPersistentTopic(topicFqn) =>
                Some(((topicFqn, b.getLedgerId, b.getEntryId), b.getBatchIndex, b.getBatchSize))
            case _ => None

    private def noteBatchMemberDecided(topicFqn: String, id: PulsarMessageId): Unit =
        batchMemberKey(topicFqn, id).foreach { (key, idx, batchSize) =>
            decidedBatchMembers.synchronized {
                val state = decidedBatchMembers.computeIfAbsent(key, _ => BatchEntryState())
                if batchSize > state.batchSize then state.batchSize = batchSize
                state.decided.set(idx)
                // Decided, but the broker has not answered for it yet: the acknowledgment this
                // decision is about to issue is in flight, and until it lands the entry can still
                // be redelivered whole.
                state.unfinished.set(idx)
                evictSettledBatchEntries()
            }
        }

    /** The broker took this member's acknowledgment. One member closer to the entry being retired,
      * and the only transition that can ever make a record reclaimable. */
    private def noteBatchMemberAcknowledged(topicFqn: String, id: PulsarMessageId): Unit =
        batchMemberKey(topicFqn, id).foreach { (key, idx, _) =>
            decidedBatchMembers.synchronized {
                Option(decidedBatchMembers.get(key)).foreach(_.unfinished.clear(idx))
            }
        }

    /** A member of an entry this session is tracking was handed BACK to the broker, so the whole
      * entry is coming again. Recorded only for entries already being tracked: an entry with no
      * decided member has nothing to protect - every member of it will simply be decided on the
      * redelivery, which is correct. */
    private def noteBatchMemberHandedBack(topicFqn: String, id: PulsarMessageId): Unit =
        batchMemberKey(topicFqn, id).foreach { (key, idx, _) =>
            decidedBatchMembers.synchronized {
                Option(decidedBatchMembers.get(key)).foreach(_.unfinished.set(idx))
            }
        }

    /** Drop the records the broker can no longer redeliver, oldest first, until the settled ones are
      * back inside their cap. An entry still owed a redelivery is skipped WHATEVER its age - that is
      * the fix. The walk is budgeted so the per-message cost stays constant even in the pathological
      * case where the oldest records are all still owed; anything the budget does not reach is
      * reclaimed by the next insertion. */
    private def evictSettledBatchEntries(): Unit =
        if decidedBatchMembers.size > ConsumerListener.settledBatchEntryCap then
            val entries = decidedBatchMembers.entrySet.iterator
            var steps = 0
            while entries.hasNext
                && steps < ConsumerListener.settledBatchEntryEvictionWalk
                && decidedBatchMembers.size > ConsumerListener.settledBatchEntryCap
            do
                if entries.next().getValue.isSettled then entries.remove()
                steps += 1

    private def isDecidedBatchCopy(topicFqn: String, id: PulsarMessageId): Boolean =
        batchMemberKey(topicFqn, id).exists { (key, idx, _) =>
            decidedBatchMembers.synchronized {
                Option(decidedBatchMembers.get(key)).exists(_.decided.get(idx))
            }
        }

    /** Test-only window: how many batch entries currently carry decided-member bits. */
    private[session_runner] def decidedBatchEntryCount: Int =
        decidedBatchMembers.synchronized(decidedBatchMembers.size)

    /** Test-only window into the failed-delivery registry. */
    private[session_runner] def failedDeliveryCount: Int = failedDeliveries.size

    /** Test-only window: how many decided messages still owe the broker an acknowledgment. */
    private[session_runner] def awaitingAckRetryCount: Int = awaitingAckRetry.size

    /** Acknowledge a DECIDED message - dropped or delivered, merge-path or local. On failure the
      * decision stands: the id is remembered, the message handed back, and the redelivery is
      * acknowledged-and-ignored at the top of [[received]]. See [[awaitingAckRetry]] for why this
      * replaced both the refund and the log-and-hope paths.
      */
    private def acknowledge(consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]], msg: org.apache.pulsar.client.api.Message[Array[Byte]]): Unit =
        // The decision this acknowledgment finalizes is recorded FIRST, unconditionally: even if
        // the ack itself fails, the decision stands (that is [[awaitingAckRetry]]'s doctrine), and
        // a whole-entry redelivery caused by a sliced sibling must not re-decide this member.
        noteBatchMemberDecided(consumer.getTopic, msg.getMessageId)
        def retryOnRedelivery(reason: String): Unit =
            // A NON-PERSISTENT message's failed ack is FINAL, and inconsequential: the broker
            // stores nothing, so nothing will ever be redelivered to finalize - and every
            // non-persistent id looks identical (ledger 0, entry 0), so a marker here would
            // swallow the next unrelated message of the topic as paperwork.
            if isNonPersistentTopic(consumer.getTopic) then
                logger.warn(
                    s"A non-persistent message's acknowledgment failed; nothing is stored, so there is nothing to retry. Consumer: ${consumer.getConsumerName}. $reason"
                )
            else
                logger.warn(
                    s"A decided message's acknowledgment failed; its decision stands and the redelivery will only be acknowledged. Consumer: ${consumer.getConsumerName}. $reason"
                )
                awaitingAckRetry.add((consumer.getTopic, msg.getMessageId))
                noteBatchMemberHandedBack(consumer.getTopic, msg.getMessageId)
                Try(consumer.negativeAcknowledge(msg))
                ()

        if !consumer.isConnected then retryOnRedelivery(s"Consumer ${consumer.getConsumerName} is not connected.")
        else
            Try(consumer.acknowledgeAsync(msg)) match
                case Success(acknowledged) =>
                    acknowledged.whenComplete((_, err) =>
                        if err != null then retryOnRedelivery(err.getMessage)
                        // THE BROKER HAS THE ANSWER. Only now is this member's part of its entry
                        // final; the entry is retired - and its record reclaimable - once every
                        // member has got this far.
                        else noteBatchMemberAcknowledged(consumer.getTopic, msg.getMessageId)
                    )
                    ()
                case Failure(err) => retryOnRedelivery(err.getMessage)

    /** Acknowledge a message the start-from swallowed. The budget unit STAYS SPENT whatever the
      * acknowledgment does: it was claimed for exactly this message, and [[awaitingAckRetry]]
      * guarantees the message cannot come back as anything but paperwork. Refunding here used to
      * let the redelivered original be shown while the refunded unit was spent on a different
      * message - an exact COUNT of the wrong SET.
      */
    private[session_runner] def acknowledgeDrop(
        consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]],
        msg: org.apache.pulsar.client.api.Message[Array[Byte]]
    ): Unit = acknowledge(consumer, msg)

    override def received(consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]], msg: org.apache.pulsar.client.api.Message[Array[Byte]]): Unit =
        // A redelivery of a message this session already DECIDED - its ack failed, nothing else.
        // Finalize the paperwork and show it to nobody: not the gate (a pause cannot un-decide
        // it), not the discard (its unit was spent on this very message), not the merge (it was
        // already cut). This check is what keeps skip-n and latest-n exact across ack failures.
        if awaitingAckRetry.remove((consumer.getTopic, msg.getMessageId)) then
            acknowledge(consumer, msg)
        // A COPY OF A DECIDED BATCH MEMBER: a sibling's refusal (the pause gate slicing an entry)
        // made the broker redeliver the whole entry, this member included. Its decision stands -
        // it was shown or dropped already - so acknowledge the copy (completing the redelivered
        // entry's fresh ack set is what finally retires the entry) and show it to nobody: not the
        // gate, not the discard, not the merge. Without this, every hot pause re-showed the
        // already-shown half of the entry it sliced.
        else if isDecidedBatchCopy(consumer.getTopic, msg.getMessageId) then
            acknowledge(consumer, msg)
        else decide(consumer.getTopic, canAcknowledge = consumer.isConnected) match
            case ConsumerListener.Action.Reject =>
                // THE PAUSE SLICE. This member is going back, so the broker will redeliver its
                // whole entry - already-decided siblings included - and their records have to
                // outlive the cap until it does. See [[decidedBatchMembers]].
                noteBatchMemberHandedBack(consumer.getTopic, msg.getMessageId)
                consumer.negativeAcknowledge(msg)

            case ConsumerListener.Action.Drop =>
                logger.debug(s"Listener discarded a message for the start-from position. Consumer: ${consumer.getConsumerName}")
                acknowledgeDrop(consumer, msg)
                // The read-position contract counts DROPS as read - the merge path records them,
                // and this local path used to skip it, so a single-stream skip-n that consumed a
                // whole backlog showed Topic Positions with no cursor at all.
                recordCursor(consumer.getTopic, msg.getMessageId, msg.getPublishTime)

            case ConsumerListener.Action.Deliver =>
                // The offer AND everything it resolved run under the session's ordering lock. The
                // lock used to be released with `offer`, and what `offer` answers with is a BATCH
                // that still has to be handled - so another listener thread could resolve a later
                // batch and process it first, and the session's stateful filters, coloring rules
                // and value projections then saw the messages in a different order than the merge
                // had just decided on. A pass-through session takes no lock at all.
                startFromOrdering.inOrder {
                    // How the merge's flow control reaches THIS stream's consumer: through its
                    // pause ARBITER, holding and releasing only the Merge reason - so releasing a
                    // hot stream at the cut can never wake a consumer the user or the delivery
                    // pacer still holds. Registered on first delivery; a no-op for pass-through.
                    val streamId = startFromStreamId(consumer.getConsumerName, consumer.getTopic)
                    pauseArbiters.get(streamId).foreach { arbiter =>
                        startFromOrdering.registerStreamPauseHooks(
                            streamId,
                            // The arbiter answers whether the client call took; the reconcile
                            // records only successful transitions and retries the rest.
                            pause = () => arbiter.hold(PauseReason.Merge),
                            resume = () => arbiter.release(PauseReason.Merge)
                        )
                    }
                    // What comes back is what the OFFER resolved, which is often not the message
                    // just offered and may belong to another topic - and therefore to another
                    // target's listener, which is why each held message carries its own.
                    val resolved = startFromOrdering.offer(
                        consumerName = consumer.getConsumerName,
                        topicFqn = consumer.getTopic,
                        orderTime = orderingTimeOf(msg),
                        messageId = msg.getMessageId,
                        payload = HeldMessage(consumer, msg, this),
                        // Claimed exactly once: this arrival IS the retry of a delivery this
                        // listener saw fail, and the merge may deliver it past its watermark.
                        knownFailedRetry = failedDeliveries.remove((consumer.getTopic, msg.getMessageId))
                    )
                    handleResolved(resolved)
                    // The batch that spends the budget's last unit is handled just above, still
                    // under the lock; only AFTER it may later messages take the lock-free path.
                    startFromOrdering.settleIfDone()
                    startFromOrdering.reconcileFlowControl()
                    // Guaranteed ordering delivers through its barrier, not through the offer's
                    // resolutions - this offer may have completed the head set it was waiting on.
                    pumpGuaranteedDelivery()
                }

    /** The stall watchdog's entry: give up on a stream silent past the window even when NO further
      * offer will ever arrive to trigger the offer-driven check - the last held backlog message has
      * nobody behind it to speak. Same lock, same handling as an offer's resolutions.
      */
    def sweepStartFromStall(): Unit =
        startFromOrdering.inOrder {
            val abandonedBefore = startFromOrdering.abandonedStreams.size
            val warningsBefore = startFromOrdering.stallWarningCount
            val resolved = startFromOrdering.sweepStalled()
            if resolved.nonEmpty then handleResolved(resolved)
            // A sweep's give-up can spend the budget's last unit too (drain on abandonment), and
            // its drains change what flow control wants paused.
            startFromOrdering.settleIfDone()
            startFromOrdering.reconcileFlowControl()
            // A give-up changed the ANSWER (degraded, abandoned stream names) even when it
            // resolved no messages - and it may never be followed by another drop. A stall WARNING
            // changed what the user needs to see too: without a frame now, a stalled positioning
            // sits behind "awaiting new messages" until the give-up half a minute later. Push the
            // disclosure itself; the runner's gate lets the first degraded frame and each stall
            // warning through whatever the reporting interval says.
            if startFromOrdering.abandonedStreams.size > abandonedBefore
                || startFromOrdering.stallWarningCount > warningsBefore
            then reportDiscardProgress()
            // The tick is also the guaranteed barrier's RETRY timer: a failed send left its head
            // in place, and nothing else may ever come along to re-attempt it.
            pumpGuaranteedDelivery()
        }

    /** The streams the start-from resolution gave up waiting for - the session's degradation
      * record, surfaced through the progress API. */
    def startFromAbandonedStreams: Vector[String] = startFromOrdering.abandonedStreams

    /** How often the resolution has newly stalled - see [[StartFromMerge.stallWarningCount]]. The
      * runner's report gate reads this to let the disclosing frame through its interval. */
    def startFromStallWarnings: Long = startFromOrdering.stallWarningCount

    /** GUARANTEED-MODE delivery pump: deliver the single safe head, commit only when the send
      * SUCCEEDED, retry the same head in place otherwise. This is the no-compromise barrier: a
      * message never leaves the merge until a client actually received it, so a failed or
      * superseded send costs latency, never order and never the message. Paced by the delivery
      * limiter's token bucket (its queue would break the barrier); stopped by a paused drain
      * (user pause, spent budget). Runs under the ordering lock like every delivery decision. */
    def pumpGuaranteedDelivery(): Unit =
        if startFromOrdering.isGuaranteedOrdering then
            startFromOrdering.inOrder {
                var going = true
                while going do
                    // Find a deliverable head BEFORE spending a rate token. A hot topic can call
                    // this pump repeatedly while another topic is still headless; charging those
                    // waits depleted the bucket without delivering anything, so the head that
                    // finally became safe was needlessly delayed.
                    startFromOrdering.peekGuaranteed() match
                        case None => going = false
                        case Some(held) =>
                            val paced = deliveryRateLimiter.forall(l => !l.isDrainingPausedNow && l.tryAcquireDeliveryToken())
                            if !paced then
                                startFromOrdering.abortGuaranteed()
                                going = false
                            else
                                // The seam flag is decided at the peek - between it and the
                                // commit nothing else can emit, so the row the client sees and
                                // the counter the commit advances cannot disagree.
                                if deliverStrict(held, startFromOrdering.peekIsSeamViolation) then
                                    startFromOrdering.commitGuaranteed()
                                    startFromOrdering.reconcileFlowControl()
                                else
                                    // The send never took: the head stays in the merge AND the
                                    // token goes back - the retry must not pay a second token
                                    // for the same delivery (mirrors requeueFront's refund on
                                    // the queued path).
                                    deliveryRateLimiter.foreach(_.returnDeliveryToken())
                                    startFromOrdering.abortGuaranteed()
                                    going = false
                // THE REPLAY BOUNDARY CHECK, on every pump's way out: the chunk can complete on
                // the commit above, on a past-boundary arrival finishing the last waited stream,
                // or - for an empty replay - on the resume's very first pump with no message
                // ever delivered. The hook auto-pauses and signals; its generation gate and
                // once-flag make a repeat call here free.
                if startFromOrdering.isReplayCaughtUp then onReplayCaughtUp()
            }

    /** Deliver for the guaranteed barrier: true only when the send took. NO negative-ack and NO
      * failed-delivery record on failure - the original never left the merge, the broker owes
      * nothing, and the pump retries it in place on the next tick. `seamViolation` rides to the
      * target pipeline through the listener's flag (set around the send, serialized by the
      * ordering lock) and onto the outgoing row; a retry re-sends the memoized response, flag
      * and all, without re-reading it. */
    private def deliverStrict(held: HeldMessage, seamViolation: Boolean): Boolean =
        try
            held.listener.outOfOrderFlagPending.set(seamViolation)
            try held.listener.targetMessageHandler.onNext(held.message)
            finally held.listener.outOfOrderFlagPending.set(false)
            held.listener.finalizeDelivered(held)
            true
        catch
            case err: Throwable =>
                logger.info(s"Guaranteed delivery attempt failed; the head stays in place and will be retried. ${err.getMessage}")
                false

    /** The paperwork of a SUCCESSFUL delivery - acknowledgment and the debug cursor - on the
      * listener the message belongs to. */
    private[session_runner] def finalizeDelivered(held: HeldMessage): Unit =
        acknowledge(held.consumer, held.message)
        recordCursor(held.consumer.getTopic, held.message.getMessageId, held.message.getPublishTime)

    /** Called by the runner on RESUME, before it re-arms the sweep: paused time must not count
      * against a silent stream. (The flow-control bookkeeping needs no reset any more - a user
      * resume releases only the User reason on each consumer's arbiter, so merge holds survive
      * it untouched.) */
    def resetStartFromStallClock(): Unit = startFromOrdering.inOrder {
        startFromOrdering.resetStallClock()
    }

    /** THE LIVE DELIVERY-ORDER SWITCH: relax this session's guaranteed ordering to best effort and
      * hand out whatever that releases, in the new order.
      *
      * Under [[StartFromOrdering.inOrder]] exactly like an offer and a sweep, which is what makes
      * it safe against concurrent delivery: the relaxation, the messages it releases and their
      * handling are one serialized step, so no listener thread can interleave a later batch in
      * front of it and no guaranteed peek can be outstanding across it (a peek and its
      * commit/abort live inside one `inOrder` block in [[pumpGuaranteedDelivery]]).
      *
      * NOT a re-initialization: the same consumers, the same subscription, the same acknowledgment
      * identity and the same start-from budget carry on. The held messages are RELEASED, never
      * re-read - they were received and not acknowledged, and a recreate would have lost them.
      */
    def relaxDeliveryOrderToBestEffort(): Unit = startFromOrdering.inOrder {
        // The replay's per-delivery flag dies with the barrier on THIS thread; best-effort
        // deliveries stamp their own (the flag is thread-local precisely so they cannot cross).
        outOfOrderFlagPending.set(false)
        val released = startFromOrdering.relaxGuaranteedToBestEffort()
        if released.nonEmpty then handleResolved(released)
        // Same tail as every other decision point: a released batch can spend a counted cut's last
        // unit, and what it drained changes what flow control wants held still. There is
        // deliberately no `pumpGuaranteedDelivery` here - the barrier is exactly what was given up.
        startFromOrdering.settleIfDone()
        startFromOrdering.reconcileFlowControl()
    }

    /** GUARANTEED replay, on RESUME: extend the boundary to the freshly captured ends, under the
      * ordering lock like every boundary decision. The runner calls this AFTER bumping the play
      * generation and BEFORE releasing any consumer - the serialization against the offer path
      * is what makes a past-end nack racing the re-capture converge (see
      * [[StartFromOrdering.extendReplayBoundary]]). */
    def extendReplayBoundary(streams: Vector[StartFromStream]): Unit = startFromOrdering.inOrder {
        startFromOrdering.extendReplayBoundary(streams)
    }

    /** Act on what the ordering layer resolved - deliver, drop, or hand back each message. Shared
      * by the offer path and the stall watchdog, and containment is per message: see the comment
      * inside. Callers hold the ordering lock.
      */
    private[session_runner] def handleResolved(resolved: Vector[(HeldMessage, StartFromOutcome)]): Unit =
                    val ordersProgress = startFromOrdering.progressDiscard.isDefined
                    resolved.foreach { (held, outcome) =>
                        // Each pair was already DEQUEUED from the merge, so it exists nowhere else. A
                        // throw here - a cancelled client makes the delivery push throw - used to
                        // escape the whole loop, abandoning every pair after it: neither delivered,
                        // acknowledged, nor handed back, and with no ackTimeout on a NonDurable
                        // subscription the broker never redelivered them while the runner lived.
                        // Contain per message and hand a failed one back so the broker redelivers it;
                        // the progress push below is separately shielded (see reportDiscardProgress).
                        try
                            outcome match
                                case StartFromOutcome.Drop =>
                                    // Acknowledge FIRST: a progress push is best-effort, and a
                                    // message must never be counted as dropped without being
                                    // acknowledged. Through the ORIGIN listener, like every other
                                    // per-message action here: a failed ack is remembered in
                                    // awaitingAckRetry, and the broker redelivers to the listener
                                    // the consumer belongs to - remembering it HERE (the listener
                                    // that happened to process the batch) let the redelivery
                                    // arrive at a listener that had never heard of it, which
                                    // re-decided it and, after the cut, DELIVERED the very message
                                    // the user asked to skip.
                                    held.listener.acknowledgeDrop(held.consumer, held.message)
                                    // A dropped message was still READ - the start-from discard
                                    // consumed it - so the debug view's read position must count it.
                                    // Omitting it would park the cursor at the start of the topic for
                                    // the whole of a skip-n, which is the one time it is interesting.
                                    held.listener.recordCursor(
                                        held.consumer.getTopic,
                                        held.message.getMessageId,
                                        held.message.getPublishTime
                                    )
                                    // Only when the ordering layer is doing the counting. A latest-n
                                    // retain drops most of what it sees and counts none of it, and
                                    // reporting those would put a frame on the wire per dropped message.
                                    if ordersProgress then held.listener.reportDiscardProgress()
                                case StartFromOutcome.Requeue =>
                                    // A broker copy whose original's fate is still open: decide
                                    // NOTHING - no acknowledgment, no budget, no cursor - and
                                    // hand it back for the broker's backoff to retry.
                                    held.listener.noteBatchMemberHandedBack(held.consumer.getTopic, held.message.getMessageId)
                                    Try(held.consumer.negativeAcknowledge(held.message))
                                    ()
                                case StartFromOutcome.NextChunk =>
                                    // GUARANTEED replay: recorded past the boundary. Hand it back
                                    // and PAUSE its consumer - the arbiter's Boundary reason, so a
                                    // user pause and the merge's flow control are untouched - and
                                    // decide nothing at all: no acknowledgment, no budget, no
                                    // cursor, no memo entry, no batch-member record (its whole
                                    // entry is past the boundary - a batch cannot straddle it, so
                                    // no sibling is tracked). The Resume that extends the boundary
                                    // releases the hold and the redelivery arrives in-chunk.
                                    held.listener.pauseArbiters
                                        .get(startFromStreamId(held.consumer.getConsumerName, held.consumer.getTopic))
                                        .foreach(_.hold(PauseReason.Boundary))
                                    Try(held.consumer.negativeAcknowledge(held.message))
                                    ()
                                case StartFromOutcome.Deliver =>
                                    // Through the rate limiter when one is installed. Under a
                                    // live merge the offer is FORCED to be an instant enqueue
                                    // (see [[deliver]]), so holding the ordering lock across it
                                    // costs nanoseconds - the write itself runs on the limiter's
                                    // drainer, outside this lock - and the DROPS around it stay
                                    // unlimited, which is what keeps a counted skip positioning
                                    // at full speed under any limit.
                                    held.listener.deliver(held)
                                case StartFromOutcome.DeliverOutOfOrder =>
                                    // Deliver, with the merge's own verdict stamped where the
                                    // generic merge could not put it: the row will carry the
                                    // out-of-order marker.
                                    held.listener.deliver(held.copy(deliveredOutOfOrder = true))
                        catch
                            case err: Throwable =>
                                logger.warn(
                                    s"Handing a start-from-ordered message back for redelivery: delivering it failed. ${err.getMessage}"
                                )
                                held.listener.noteBatchMemberHandedBack(held.consumer.getTopic, held.message.getMessageId)
                                Try(held.consumer.negativeAcknowledge(held.message))
                                ()
                    }
}
