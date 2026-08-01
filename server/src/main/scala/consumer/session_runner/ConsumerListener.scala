package consumer.session_runner

import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.{MessageListener, MessageId as PulsarMessageId}

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

object ConsumerListener:
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
      */
    def effectiveDiscard: StartFromDiscard = startFromOrdering.progressDiscard.getOrElse(startFromDiscard)

    /** How far this listener has read into each physical topic it consumes, for the "Topic Positions"
      * debug view. Read out of band by [[cursors]] on a gRPC thread while listener threads write it,
      * hence concurrent.
      *
      * RECORDED WHERE MESSAGES ARE ACKNOWLEDGED - on a Drop as well as a Deliver - because both mean
      * the session consumed the message. The alternative, letting the client derive it from the rows
      * on screen, is wrong by however much the session filters out: a filter passing 1% of a topic
      * would show a session that had read to the end as barely started.
      *
      * A HIGH-WATER MARK. `negativeAcknowledge` and the merge's cap both put messages back for
      * redelivery, so an OLDER message can legitimately arrive after a newer one has been counted;
      * letting the cursor walk backwards there would make the view flicker between two positions
      * neither of which is wrong. Only advancing keeps it monotonic, which is what "how far has this
      * read" means.
      */
    private val cursorByTopic = ConcurrentHashMap[String, TopicCursor]()

    /** Record that `topicFqn` has been consumed as far as this message. Advances only - see
      * [[cursorByTopic]].
      */
    def recordCursor(topicFqn: String, messageId: PulsarMessageId, publishTime: Long): Unit =
        cursorByTopic.merge(
            topicFqn,
            TopicCursor(messageId, publishTime),
            (existing, incoming) => if incoming.messageId.compareTo(existing.messageId) > 0 then incoming else existing
        )
        ()

    /** A snapshot of the read position per topic. */
    def cursors: Map[String, TopicCursor] = cursorByTopic.asScala.toMap

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
            held.listener.targetMessageHandler.onNext(held.message)
            acknowledge(held.consumer, held.message)
            held.listener.recordCursor(
                held.consumer.getTopic,
                held.message.getMessageId,
                held.message.getPublishTime
            )
        catch
            case err: Throwable =>
                logger.warn(s"Handing a message back for redelivery: delivering it failed. ${err.getMessage}")
                Try(held.consumer.negativeAcknowledge(held.message))
                ()

    /** Route one Deliver outcome: through the session's rate limiter when one is installed,
      * straight through otherwise. The limiter's offer is an enqueue - it never blocks the calling
      * listener thread and never blocks the ordering lock the merge path holds around it. */
    def deliver(held: HeldMessage): Unit = deliveryRateLimiter match
        case Some(limiter) => limiter.offer(held)
        case None          => deliverNow(held)

    /** Called once per message the discard swallows, so a skip in flight can be reported to the
      * client - a dropped message reaches nothing else, so this is the only signal there is.
      *
      * A no-op until a client resumes the session, and rewired by
      * `ConsumerSessionTargetRunner.resume` on every play. Unlike [[startFromDiscard]] there is
      * nothing to preserve across a pause: it carries no state.
      */
    var onStartFromDiscardProgress: () => Unit = () => ()

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
    private val awaitingAckRetry = ConcurrentHashMap.newKeySet[PulsarMessageId]()

    /** Test-only window: how many decided messages still owe the broker an acknowledgment. */
    private[session_runner] def awaitingAckRetryCount: Int = awaitingAckRetry.size

    /** Acknowledge a DECIDED message - dropped or delivered, merge-path or local. On failure the
      * decision stands: the id is remembered, the message handed back, and the redelivery is
      * acknowledged-and-ignored at the top of [[received]]. See [[awaitingAckRetry]] for why this
      * replaced both the refund and the log-and-hope paths.
      */
    private def acknowledge(consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]], msg: org.apache.pulsar.client.api.Message[Array[Byte]]): Unit =
        def retryOnRedelivery(reason: String): Unit =
            logger.warn(
                s"A decided message's acknowledgment failed; its decision stands and the redelivery will only be acknowledged. Consumer: ${consumer.getConsumerName}. $reason"
            )
            awaitingAckRetry.add(msg.getMessageId)
            Try(consumer.negativeAcknowledge(msg))
            ()

        if !consumer.isConnected then retryOnRedelivery(s"Consumer ${consumer.getConsumerName} is not connected.")
        else
            Try(consumer.acknowledgeAsync(msg)) match
                case Success(acknowledged) =>
                    acknowledged.whenComplete((_, err) => if err != null then retryOnRedelivery(err.getMessage))
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
        if awaitingAckRetry.remove(msg.getMessageId) then
            acknowledge(consumer, msg)
        else decide(consumer.getTopic, canAcknowledge = consumer.isConnected) match
            case ConsumerListener.Action.Reject =>
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
                    // How the merge's flow control reaches THIS stream's consumer. Registered on
                    // first delivery - a stream that never delivers has nothing to pause - and a
                    // no-op for a pass-through layer.
                    startFromOrdering.registerStreamPauseHooks(
                        startFromStreamId(consumer.getConsumerName, consumer.getTopic),
                        pause = () => { Try(consumer.pause()); () },
                        resume = () => { Try(consumer.resume()); () }
                    )
                    // What comes back is what the OFFER resolved, which is often not the message
                    // just offered and may belong to another topic - and therefore to another
                    // target's listener, which is why each held message carries its own.
                    val resolved = startFromOrdering.offer(
                        consumerName = consumer.getConsumerName,
                        topicFqn = consumer.getTopic,
                        publishTime = msg.getPublishTime,
                        messageId = msg.getMessageId,
                        payload = HeldMessage(consumer, msg, this)
                    )
                    handleResolved(resolved)
                    // The batch that spends the budget's last unit is handled just above, still
                    // under the lock; only AFTER it may later messages take the lock-free path.
                    startFromOrdering.settleIfDone()
                    startFromOrdering.reconcileFlowControl()
                }

    /** The stall watchdog's entry: give up on a stream silent past the window even when NO further
      * offer will ever arrive to trigger the offer-driven check - the last held backlog message has
      * nobody behind it to speak. Same lock, same handling as an offer's resolutions.
      */
    def sweepStartFromStall(): Unit =
        startFromOrdering.inOrder {
            val abandonedBefore = startFromOrdering.abandonedStreams.size
            val resolved = startFromOrdering.sweepStalled()
            if resolved.nonEmpty then handleResolved(resolved)
            // A sweep's give-up can spend the budget's last unit too (drain on abandonment), and
            // its drains change what flow control wants paused.
            startFromOrdering.settleIfDone()
            startFromOrdering.reconcileFlowControl()
            // A give-up changed the ANSWER (degraded, abandoned stream names) even when it
            // resolved no messages - and it may never be followed by another drop. Push the
            // disclosure itself; the runner's gate lets the first degraded frame through
            // whatever the reporting interval says.
            if startFromOrdering.abandonedStreams.size > abandonedBefore then reportDiscardProgress()
        }

    /** The streams the start-from resolution gave up waiting for - the session's degradation
      * record, surfaced through the progress API. */
    def startFromAbandonedStreams: Vector[String] = startFromOrdering.abandonedStreams

    /** Called by the runner on RESUME, before it re-arms the sweep: paused time must not count
      * against a silent stream, and the resume just woke every consumer wholesale, so the
      * flow-control bookkeeping has to match that reality too. */
    def resetStartFromStallClock(): Unit = startFromOrdering.inOrder {
        startFromOrdering.resetStallClock()
        startFromOrdering.resetAppliedFlowControl()
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
                                case StartFromOutcome.Deliver =>
                                    // Through the rate limiter when one is installed. The offer is
                                    // an instant enqueue, so holding the ordering lock across it
                                    // costs nothing - and the DROPS around it stay unlimited,
                                    // which is what keeps a counted skip positioning at full
                                    // speed under any limit.
                                    held.listener.deliver(held)
                        catch
                            case err: Throwable =>
                                logger.warn(
                                    s"Handing a start-from-ordered message back for redelivery: delivering it failed. ${err.getMessage}"
                                )
                                Try(held.consumer.negativeAcknowledge(held.message))
                                ()
                    }
}
