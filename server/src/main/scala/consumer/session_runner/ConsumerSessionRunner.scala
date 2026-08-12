package consumer.session_runner

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.session_config.{ConsumerSessionConfig, DeliveryOrderKey, MessageDeliveryOrder}
import consumer.session_target.ConsumerSessionTarget
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient

import scala.util.{Failure, Success, Try}
import scala.jdk.CollectionConverters.*

import java.util.concurrent.{Executors, ScheduledExecutorService, TimeUnit}
import java.util.concurrent.atomic.AtomicLong
import java.io.ByteArrayOutputStream
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import consumer.value_projections.ValueProjectionResult

import scala.util.boundary
import boundary.break

type ConsumerSessionTargetIndex = Int

/** ONE MESSAGE'S IDENTITY for the single-attempt delivery memo: the topic it arrived on and its
  * broker message id. Never the id alone - a session consumes many topics, and on a non-persistent
  * topic every id is (ledger 0, entry 0), which is why such topics carry no key at all. */
type DeliveryKey = (NonPartitionedTopicFqn, org.apache.pulsar.client.api.MessageId)

/** EVERYTHING ONE DELIVERY ATTEMPT PREPARED for the client: the finished response, and whether
  * sending it spends a unit of the play's delivery budget. Held from the moment the pipeline
  * produced it until a send actually takes, so a retry is a re-SEND rather than a second pass
  * through deserialization, the JS context, the user's filters and the counters.
  *
  * Stamped with the play generation it was prepared under: a response belongs to the play that
  * built it - it carries that play's counters and was meant for that play's stream - so a retry
  * arriving after a second Play must prepare a fresh one instead.
  */
final case class PreparedDelivery(
    playGeneration: Long,
    messages: Seq[consumerPb.Message],
    errors: Vector[String],
    spendsBudgetUnit: Boolean
)

/** What the SESSION says about a delivery attempt before the target does any work for it. */
enum DeliveryAdmission:
    /** A fresh attempt under the current play: run the pipeline. */
    case Prepare

    /** The play this handler was wired under has been superseded (a second Play, a Stop, or a
      * stream ended by a failed resume). Nothing may be mutated for it. */
    case Superseded

    /** A previous attempt's response was re-sent; the pipeline must NOT run again. */
    case Replayed

/** The single shape every ResumeResponse takes, so a message response and a progress-only push
  * cannot drift apart.
  *
  * `startFromProgress` rides along on EVERY response, which is how the client learns that a skip
  * finished: the completing state arrives with the first message that actually gets delivered.
  * `None` means the session's start-from needed no counting at all, and the client is told nothing
  * rather than told zero.
  */
def resumeResponse(
    messages: Seq[consumerPb.Message],
    errors: Vector[String],
    startFromProgress: Option[consumerPb.StartFromProgress],
    orderingLateDeliveries: Long = 0L,
    deliveryOrderActive: Boolean = false,
    orderKeyFallbacks: Long = 0L,
    deliveryOrderWaitingStreams: Int = 0,
    replayCaughtUp: Boolean = false,
    replayBoundaryAtMs: Long = 0L,
    replayNewerEntriesApprox: Long = 0L,
    replaySeamViolations: Long = 0L,
    replayExcludedTopics: Seq[String] = Seq.empty,
    replayExcludedTopicCount: Int = 0
): consumerPb.ResumeResponse =
    val status = errors.size match
        case 0 => Status(code = Code.OK.value)
        case _ => Status(code = Code.UNKNOWN.value, message = errors.mkString("\n\n"))

    // Stats ride along when ANY part has something to say: a skip in flight, a best-effort
    // order confessing late deliveries, the guaranteed replay's caught-up state or seam ledger,
    // or the fact that an ordering layer is RUNNING at all - which is what lets the client show
    // its chip only for sessions that actually pay the reorder latency (a single-stream
    // BEST-EFFORT session builds no layer, whatever the config asked; Guaranteed builds one at
    // any width). Absent otherwise, so clients keep treating absence as "nothing to report".
    val consumerStats =
        if startFromProgress.isEmpty && orderingLateDeliveries == 0 && !deliveryOrderActive && orderKeyFallbacks == 0
            && deliveryOrderWaitingStreams == 0 && !replayCaughtUp && replaySeamViolations == 0
        then None
        else
            Some(consumerPb.ConsumerStats(
                startFromProgress = startFromProgress,
                orderingLateDeliveries = orderingLateDeliveries,
                deliveryOrderActive = deliveryOrderActive,
                orderKeyFallbacks = orderKeyFallbacks,
                deliveryOrderWaitingStreams = deliveryOrderWaitingStreams,
                replayCaughtUp = replayCaughtUp,
                replayBoundaryAtMs = if replayCaughtUp then replayBoundaryAtMs else 0L,
                replayNewerEntriesApprox = if replayCaughtUp then replayNewerEntriesApprox else 0L,
                replaySeamViolations = replaySeamViolations,
                replayExcludedTopics = if replayCaughtUp then replayExcludedTopics else Seq.empty,
                replayExcludedTopicCount = if replayCaughtUp then replayExcludedTopicCount else 0
            ))

    consumerPb.ResumeResponse(
        messages = messages,
        status = Some(status),
        consumerStats = consumerStats
    )

/** One stalled stream's classification for the DEBUG-level stall diagnostic: is the stream the
  * delivery order is waiting on verifiably out of messages, or does it hold retained messages the
  * session has not received yet (delivery lag - the case the guarantee exists for)?
  *
  * `endOfTopic` is where the stream's topic ends NOW (None when the broker would not say);
  * `consumedThrough` is the newest position this session has processed from it (None before the
  * first message). Pure, so the classification is pinned without a broker; the caller does the
  * lookups. SERVER-SIDE ONLY: the wire's ConsumerStats carries the waiting-streams count alone -
  * telling the CLIENT which case each stream is in would need a per-stream proto field that does
  * not exist, so the distinction lives in the debug log until one does.
  */
/** APPROXIMATELY how many entries one stream recorded past its replay boundary, from the boundary
  * end and the broker's current end.
  *
  * Entry arithmetic is exact only within one ledger; across a rollover the older ledgers' entry
  * counts are unknowable from the ids alone, so the newest ledger's entries stand in as the
  * lower bound. And an ENTRY is not a message - a batching producer packs many messages into
  * one - which is why everything downstream of this says "~N" and never promises a count
  * (measured 2026-07-25: the broker's own backlog numbers count entries too). PURE, so the
  * arithmetic is pinned without a broker.
  */
def replayNewerEntriesApproxOf(boundary: EntryPosition, current: EntryPosition): Long =
    if current == EntryPosition.empty then 0L
    else if boundary == EntryPosition.empty then (current.entryId + 1) max 1L
    else if !isStrictlyPastBacklogEnd(current, boundary) then 0L
    else if current.ledgerId == boundary.ledgerId then current.entryId - boundary.entryId
    else (current.entryId + 1) max 1L

def stalledStreamEmptinessNote(endOfTopic: Option[EntryPosition], consumedThrough: Option[EntryPosition]): String =
    endOfTopic match
        case None => "the topic's end could not be read, so whether it holds unread messages is unknown"
        case Some(end) if end == EntryPosition.empty => "verifiably empty - no message has ever been published (or retained)"
        case Some(end) =>
            consumedThrough match
                case Some(consumed) if isPastBacklogEnd(consumed, end) =>
                    "verifiably empty beyond the session's position - waiting for a NEW message"
                case _ => "holds retained messages the session has not received yet (delivery lag)"

case class ConsumerSessionRunner(
    sessionName: String,
    sessionConfig: ConsumerSessionConfig,
    sessionContextPool: ConsumerSessionContextPool,
    var grpcResponseObserver: Option[io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]],
    var schemasByTopic: SchemasByTopic,
    var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner],
    // For the GUARANTEED replay's excluded-topics indicator only: re-resolving the topic
    // selectors at caught-up needs an admin client the runner otherwise never held. Optional
    // with a None default so the offline test fixtures build exactly as before; production
    // (`make`) always passes one.
    adminClient: Option[PulsarAdmin] = None
) {
    /** Session-wide counters, stamped onto EVERY `pb.Message` the browser receives.
      *
      * Atomic, and held in the body rather than as constructor params, because
      * `incrementNumMessageProcessed` is called from the target message handler BEFORE the
      * per-message context lease - i.e. concurrently, one listener thread per partition. As plain
      * `var Long`s these lost read-modify-write updates, so a partitioned session under-reported how
      * many messages it had processed and shipped that wrong number to the UI.
      *
      * `numMessageSent` happens to be incremented inside the lease today and so is already
      * serialized; it is atomic too so the guarantee does not silently depend on that call staying
      * where it is.
      */
    private val numMessageProcessedCounter = AtomicLong(0)
    private val numMessageSentCounter = AtomicLong(0)

    /** The per-resume delivery budget: how many more messages may be LOADED before the drain stops.
      * Long.MaxValue when no budget is armed - the decrement below runs unconditionally, and from
      * MaxValue it cannot reach zero in a session's lifetime. Reset by every resume.
      */
    private val remainingToDeliver = AtomicLong(Long.MaxValue)

    /** The PLAY GENERATION: bumped by every resume, by stop, and by [[failAndComplete]] - every
      * event that makes the play a handler was wired under no longer the current one.
      *
      * Every resume's handler closure captures the generation it was wired under and refuses to
      * run under any other. It is checked in the TARGET handler, before that handler's first
      * mutation, and again in the session callback before the send: the observer-identity check at
      * the send alone was far too late, because by the time a superseded handler reached it the
      * counters had moved, the message had been deserialized, the JS context had been leased and
      * the user's stateful filters had already seen the message.
      */
    private val playGeneration = AtomicLong(0)

    /** THE SINGLE-ATTEMPT DELIVERY MEMO: what each in-flight delivery has already prepared for the
      * client, keyed by the message it is for and kept only until its send takes.
      *
      * A delivery's pipeline is NOT repeatable. It advances the processed and sent counters, and it
      * runs the user's filters, coloring rules and value projections - which are stateful by
      * design: they accumulate into the session's JS state and its stdout. So when a send failed
      * (a cancelled call, a backpressured client) and the message came back - by broker redelivery
      * on the ordinary path, or by Guaranteed's in-place retry - re-entering that pipeline applied
      * every one of those effects a second time. The browser received the message exactly once and
      * saw counters, accumulated state and console output as though it had been processed twice.
      *
      * The retry therefore RE-SENDS what the first attempt built. Entries live only between a
      * failed send and its retry, and are dropped by the next resume; the size bound is a last
      * resort against a client that fails every write forever - evicting merely returns that
      * message to the old re-run behaviour, it never loses one.
      */
    private val preparedDeliveries =
        new java.util.LinkedHashMap[DeliveryKey, PreparedDelivery](64, 0.75f, false):
            override def removeEldestEntry(e: java.util.Map.Entry[DeliveryKey, PreparedDelivery]): Boolean =
                size > 512

    private def rememberPrepared(key: DeliveryKey, prepared: PreparedDelivery): Unit =
        preparedDeliveries.synchronized { preparedDeliveries.put(key, prepared) }
        ()

    private def forgetPrepared(key: DeliveryKey): Unit =
        preparedDeliveries.synchronized { preparedDeliveries.remove(key) }
        ()

    /** What a previous attempt prepared for this message UNDER THIS PLAY, if anything. */
    private def preparedFor(key: DeliveryKey, generation: Long): Option[PreparedDelivery] =
        preparedDeliveries.synchronized(Option(preparedDeliveries.get(key)).filter(_.playGeneration == generation))

    /** Test-only window: how many deliveries are prepared but not yet sent. */
    private[session_runner] def preparedDeliveryCount: Int = preparedDeliveries.synchronized(preparedDeliveries.size)

    /** Test-only window: which play generation is current. */
    private[session_runner] def currentPlayGeneration: Long = playGeneration.get

    def numMessageProcessed: Long = numMessageProcessedCounter.get
    def numMessageSent: Long = numMessageSentCounter.get

    def incrementNumMessageProcessed(): Unit = numMessageProcessedCounter.incrementAndGet()

    /** Messages the start-from discard has still to drop before this session shows anything.
      *
      * Exposed so a test can assert "exactly n were skipped" instead of inferring it from what came
      * out. `distinct` is identity-based (StartFromDiscard defines no equals), which is what a
      * SharedTotal plan needs: every target holds the SAME counter and it must be counted once.
      *
      * Reads the EFFECTIVE counter, not the reportable one: this is the mechanism, and a latest-n
      * seek correction still has messages to drop even though the client is deliberately not shown
      * a progress bar for it.
      */
    def remainingStartFromDiscard: Long =
        targets.values.map(_.consumerListener.effectiveDiscard).toVector.distinct.map(_.remaining).sum

    /** How far the start-from skip has got, or `None` when there is no skip to do.
      *
      * Absent - not zero-and-complete - for every mode that seeks exactly (earliest, latest, a
      * date/time, a message id, an approximate position): those reach their position with the seek
      * itself, and a progress report for them would be an invention.
      *
      * `distinct` is identity-based, which is what a shared counter needs: every target of a
      * "skip first n" session holds the SAME counter, and counting it once per target would report
      * n times the number of targets. On a partitioned "skip first n" that counter belongs to the
      * global merge rather than to the listener, which is what `progressDiscard` resolves - the
      * merge decides the drops, so it is the only thing that knows how many are left.
      */
    def startFromProgress: Option[consumerPb.StartFromProgress] =
        val discards = targets.values.map(_.consumerListener.progressDiscard).toVector.distinct
        val toSkip = discards.map(_.total).sum

        Option.when(toSkip > 0) {
            val left = discards.map(_.remaining).sum
            // The degradation record rides on every progress frame: a stream the merge abandoned
            // means the position is best-effort, and the client keeps saying so for the session's
            // life. One listener suffices - the ordering layer is session-wide.
            val abandoned = targets.values.headOption.map(_.consumerListener.startFromAbandonedStreams).getOrElse(Vector.empty)
            consumerPb.StartFromProgress(
                messagesSkipped = toSkip - left,
                messagesToSkip = toSkip,
                complete = left <= 0,
                degraded = abandoned.nonEmpty,
                abandonedStreams = abandoned
            )
        }

    /** The order this session is delivering in RIGHT NOW.
      *
      * Starts as the configured one and can be LOWERED by [[setDeliveryOrder]] while the session
      * runs. The saved configuration is deliberately untouched: this is a live-session control, and
      * a client that wants the next Play to use the new order writes it into the configuration
      * itself.
      *
      * Volatile: written on the gRPC thread that switches, read by whoever asks afterwards.
      */
    @volatile private var liveDeliveryOrder: MessageDeliveryOrder = sessionConfig.messageDeliveryOrder

    /** What [[setDeliveryOrder]] would compare a request against - the live order, not the saved
      * one. */
    def deliveryOrder: MessageDeliveryOrder = liveDeliveryOrder

    /** CHANGE THE DELIVERY ORDER OF THIS RUNNING SESSION, without recreating it.
      *
      * Only Guaranteed -> Best effort is honoured; [[deliveryOrderSwitchFor]] carries the whole
      * matrix and the reasons the other directions are refused rather than faked. A refusal is
      * thrown with the client-facing reason, exactly as `pause` reports its failures.
      *
      * NOTHING ELSE ABOUT THE SESSION MOVES. The consumers, their subscriptions, the
      * acknowledgment identity, the counted start-from budget and the flow-control state all carry
      * on; the messages the guaranteed barrier was holding are RELEASED under the new rules rather
      * than dropped or re-read. That is the entire reason this is not implemented as "recreate the
      * session with a different configuration": the held set is received-but-unacknowledged and
      * lives nowhere else, re-resolving the start-from against a log that has moved would select a
      * different set of messages for Latest-n and both approximate modes, and everything already on
      * screen would arrive again as duplicates.
      *
      * THE LAYER IS THE SOURCE OF TRUTH. It is relaxed first and the live order is recorded only
      * once that returned, so a session can never advertise an order its ordering layer is not
      * actually applying.
      */
    def setDeliveryOrder(requested: MessageDeliveryOrder): Unit =
        deliveryOrderSwitchFor(liveDeliveryOrder, requested) match
            case DeliveryOrderSwitch.AlreadyThere => ()
            case DeliveryOrderSwitch.Refused(reason) => throw new IllegalArgumentException(reason)
            case DeliveryOrderSwitch.RelaxToBestEffort =>
                // ONE listener does it for the whole session: the ordering layer is session-wide -
                // the same instance on every target - because the counted modes are defined over
                // the merged stream. Relaxing it once relaxes it for every target.
                targets.values.headOption.foreach(_.consumerListener.relaxDeliveryOrderToBestEffort())
                // THE REPLAY STATE DIES WITH THE BARRIER. This is the designed "continue live
                // with Best effort" transition (owner decision 2026-08-09): the caught-up wire
                // state clears, every Boundary hold lifts - the auto-pause's and any past-end
                // racer's - and the intake re-opens, so live delivery resumes under Best effort.
                // UNLESS the user's own pause is also standing (PauseReason.User held): their
                // pause outranks the transition, the gate stays shut, and the next Resume goes
                // live - relaxing a session must never un-pause one the user explicitly stopped.
                replayCaughtUpNow = false
                replayNewerEntriesApprox = 0L
                replayExcludedTopics = Vector.empty
                replayExcludedTopicCount = 0
                val userPaused = targets.values.exists(_.pauseArbiters.values.exists(_.heldReasons.contains(PauseReason.User)))
                targets.values.foreach { target =>
                    if !userPaused then target.consumerListener.startAcceptingNewMessages()
                    target.pauseArbiters.values.foreach(_.release(PauseReason.Boundary))
                }
                liveDeliveryOrder = requested
                // RE-ARM AT THE NEW CADENCE. Best effort's sweep is the timer half of its residence
                // bound, so a session relaxed out of Guaranteed must not keep Guaranteed's slower
                // diagnostics cadence - an all-idle tail would then sit up to a second past its
                // grace instead of a quarter of one.
                cancelStallSweep()
                armStallSweep()
                permitLogger.info(
                    s"Consumer session $sessionName switched from Guaranteed to Best effort delivery order while running; " +
                        "the messages it was holding were released in the new order."
                )

    /** Whether the client that resumed this session asked for consumer stats
      * (`ResumeRequest.include_consumer_stats`).
      *
      * It used to be read off the request and then dropped, so every client received the stats -
      * including the MESSAGE-LESS progress frames a skip in flight pushes, which a client that
      * asked for no stats has no reason to expect. Set on every resume, like the debug flag.
      *
      * Volatile: written on the gRPC thread that resumes, read by listener threads composing
      * responses - without it a listener could briefly keep using the previous play's flag.
      */
    @volatile var includeConsumerStats: Boolean = true

    /** What may actually go on the wire: nothing at all unless the client asked for it. */
    private def reportableStartFromProgress: Option[consumerPb.StartFromProgress] =
        if includeConsumerStats then startFromProgress else None

    /** Deliveries resolved out of selected-timestamp order, for the same wire gate: zero unless
      * the client asked for stats and the session actually merges. The ordering layer is
      * session-wide, so one listener's count is the session's. */
    private def reportableOrderingLateDeliveries: Long =
        if includeConsumerStats && continuousOrderingArmed then
            targets.values.headOption.map(_.consumerListener.startFromOrdering.lateDeliveryCount).getOrElse(0L)
        else 0L

    /** Messages that used publish time because the selected timestamp was absent - summed across
      * listeners (each message counts exactly once, at the listener that received it). */
    private def reportableOrderKeyFallbacks: Long =
        if includeConsumerStats && continuousOrderingArmed then
            targets.values.map(_.consumerListener.orderKeyFallbacks.get).sum
        else 0L

    /** Topic/partition streams that have kept an active delivery-order layer waiting past the
      * warning interval. Unlike the warning counter, this clears when progress resumes. */
    private def reportableDeliveryOrderWaitingStreams: Int =
        if includeConsumerStats && continuousOrderingArmed then
            targets.values.headOption.map(_.consumerListener.startFromOrdering.stalledStreamCount).getOrElse(0)
        else 0

    /** THE GUARANTEED REPLAY'S WIRE STATE, stamped onto every response's ConsumerStats while it
      * stands. `replayCaughtUpNow` turns true when the chunk completes (the auto-pause moment)
      * and false the moment a resume extends the boundary or a relax dissolves the barrier; the
      * boundary instant is re-captured by every resume; the newer-entries indicator starts from
      * what the session itself saw handed back past the boundary and may be raised by the
      * off-thread broker refinement, together with the excluded-topics (late-joiner) list.
      * All volatile: written on the pump's thread and the maintenance thread, read by whichever
      * listener thread is composing a response.
      */
    @volatile private var replayCaughtUpNow: Boolean = false
    @volatile private var replayBoundaryAtMs: Long = 0L
    @volatile private var replayNewerEntriesApprox: Long = 0L
    @volatile private var replayExcludedTopics: Vector[String] = Vector.empty
    @volatile private var replayExcludedTopicCount: Int = 0

    /** When the CREATE-TIME replay boundary was captured: session build seeks the consumers and
      * decides every stream's recorded end moments before this runner exists, so construction
      * time is that capture's instant - what the first chunk's caught-up banner reports. */
    private val replayBoundaryCapturedAtMs: Long = System.currentTimeMillis()

    /** Whether any Play has CONSUMED the create-time replay boundary yet. The first Play must use
      * the boundaries decided at session build instead of re-reading the broker (see resume);
      * every later one re-captures and extends. Volatile: resumes are serialized by the service's
      * per-name lock, but successive plays run on different gRPC threads. */
    @volatile private var replayCreateBoundaryConsumed: Boolean = false

    /** Test-only window onto the caught-up state. */
    private[session_runner] def isReplayCaughtUpNow: Boolean = replayCaughtUpNow

    /** The seam-violation counter, from the session-wide ordering layer - one listener's answer
      * is the session's. Reported whenever guaranteed ordering is armed, caught up or not: a
      * seam violation happens MID-replay, right after a resume. */
    private def reportableReplaySeamViolations: Long =
        if includeConsumerStats && guaranteedOrderingArmed then
            targets.values.headOption.map(_.consumerListener.startFromOrdering.replaySeamViolationCount).getOrElse(0L)
        else 0L

    /** Whether a counted start-from is still resolving: the discard has messages left to drop, or
      * the global merge is holding messages while it decides. The rate limiter's permit hold is
      * refused during this window - a consumer whose permits a THROTTLE paused looks exactly like
      * the silent stream the merge gives up on after 30 seconds, and that give-up silently changes
      * a skip's result. Delivers still queue during the window (they are the few at the boundary),
      * so the user-visible rate stays exact; only the broker-side backpressure waits.
      */
    private def startFromResolutionActive: Boolean =
        // For a continuous delivery-order layer, held messages are the steady
        // state, not a resolution in flight: counting them here would refuse the rate limiter's
        // permit holds for the session's whole life. Its budget half still counts - a skip's cut
        // must run at full speed whatever ordering mode carries it.
        remainingStartFromDiscard > 0 || targets.values.exists { target =>
            val ordering = target.consumerListener.startFromOrdering
            !ordering.isContinuousOrdering && ordering.heldCount > 0
        }

    /** Every physical stream this session consumes, across all of its targets. */
    private def allConsumedTopics: Set[NonPartitionedTopicFqn] = targets.values.flatMap(_.consumers.keys).toSet

    /** Which of this session's streams the delivery pacer must LEAVE RUNNING right now, because a
      * counted start-from is still waiting for the next message from them.
      *
      * PER STREAM, and that is the whole point of it. [[startFromResolutionActive]] answers for the
      * SESSION, and a latest-n seek correction that never finishes on one disconnected or idle
      * stream therefore refused every permit hold for the session's life: a hot peer kept feeding
      * the limiter's queue while its watermarks were declined on crossing after crossing, so the
      * advertised 2,000-message / 128 MiB bounds held nothing at all. Only the streams actually
      * still counting are protected now; their peers get the backpressure they earned.
      *
      * Session-wide in the two cases where ANY stream can supply the next counted message: a
      * SHARED "skip first n" budget (one counter over the merged stream - `remainingFor` answers
      * for every topic by construction), and a non-continuous merge still holding messages while
      * it decides the cut. A continuous delivery-order layer is excluded for the same reason
      * [[startFromResolutionActive]] excludes it: held messages are its steady state, not a
      * resolution in flight.
      */
    private def permitHoldSuppressedTopics: Set[NonPartitionedTopicFqn] =
        val mergeStillDeciding = targets.values.exists { target =>
            val ordering = target.consumerListener.startFromOrdering
            !ordering.isContinuousOrdering && ordering.heldCount > 0
        }
        if mergeStillDeciding then allConsumedTopics
        else
            val discards = targets.values.map(_.consumerListener.effectiveDiscard).toVector.distinct
            allConsumedTopics.filter(topicFqn => discards.exists(_.remainingFor(topicFqn) > 0))

    /** Whether any target's ordering layer merges for the session's LIFE - the sweep then stays
      * armed forever and ticks at the grace cadence, because an all-idle tail emits nothing until
      * a tick notices the reorder grace has passed. */
    private def continuousOrderingArmed: Boolean =
        targets.values.exists(_.consumerListener.startFromOrdering.isContinuousOrdering)

    /** Whether that continuous layer is the GUARANTEED one - which decides the sweep cadence, since
      * Guaranteed has no residence for a tick to expire. The ordering layer is session-wide (one
      * instance across every target), so one target's answer is the session's. */
    private def guaranteedOrderingArmed: Boolean =
        targets.values.headOption.exists(target =>
            val ordering = target.consumerListener.startFromOrdering
            ordering.isContinuousOrdering && ordering.isGuaranteedOrdering
        )

    /** The sweep cadence currently armed, or None when no sweep is - a test's window onto the
      * policy-specific choice, and nothing else's. */
    private[consumer] def armedSweepPeriodMs: Option[Long] = synchronized(armedSweepPeriod)

    private var armedSweepPeriod: Option[Long] = None

    /** Applies or lifts the rate limiter's permit hold on every target. Each target refuses under
      * a closed gate, so a user pause always outranks the limiter's backpressure.
      *
      * ANSWERS whether every target applied it. `Consumer.pause()` can throw (a consumer mid-close
      * during a shutdown race), and swallowing that used to let the limiter latch `permitsHeld`
      * with nothing actually paused - the broker kept filling the queue and no retry ever came,
      * because the flag said the work was done. Every target is still ATTEMPTED (one broken
      * consumer must not shield the others), and the aggregate verdict lets the caller keep the
      * flag honest.
      */
    private val permitLogger = com.typesafe.scalalogging.Logger(getClass.getName)

    private def setPermitHold(hold: Boolean, appliesTo: NonPartitionedTopicFqn => Boolean = _ => true): Boolean =
        targets.values.toVector
            .map { target =>
                Try(target.setPermitHold(hold, appliesTo)) match
                    // The target's own verdict, not merely "the method did not throw": a target
                    // answers false when one of its consumers refused the client call, and
                    // mapping that to true let the limiter latch permitsHeld with consumers
                    // still running - the exact lie this aggregation exists to prevent.
                    case Success(applied) => applied
                    case Failure(err) =>
                        permitLogger.warn(
                            s"Could not ${if hold then "hold" else "release"} permits on target ${target.targetIndex}: ${err.getMessage}"
                        )
                        false
            }
            .forall(identity)

    /** The DEBUG-level why behind a waiting-streams disclosure: which streams the delivery order
      * is waiting on, and [[stalledStreamEmptinessNote]] for each. Scheduled onto the shared
      * maintenance thread, never run inline - classifying a stream reads its topic's end from the
      * broker, and the disclosure that triggers this fires under the session's ordering lock.
      * Throttled exactly as the disclosure is (once per NEW stall warning), and skipped outright
      * unless debug logging is enabled, so no broker round trip is ever spent on a log nobody
      * collects. Per-stream and per-episode, hence DEBUG - see the logging guidance.
      */
    private def scheduleStalledStreamDiagnostic(): Unit =
        if permitLogger.underlying.isDebugEnabled then
            Try(ConsumerSessionRunner.maintenanceScheduler.execute(() => logStalledStreamEmptiness()))
            ()

    /** REFINE THE CAUGHT-UP INDICATORS off-thread: the newer-entries estimate from the broker's
      * current ends against the boundary, and the excluded-topics (late-joiner) list from
      * re-resolving the topic selectors. Scheduled by the caught-up announcement onto the shared
      * maintenance thread - both halves are broker round trips, and the announcement runs under
      * the session's ordering lock, exactly the reason the stalled-stream diagnostic is
      * scheduled the same way. Best-effort throughout: a broker that will not answer leaves the
      * locally-known lower bound standing.
      */
    private def scheduleReplayIndicatorRefinement(
        generation: Long,
        observer: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]
    ): Unit =
        Try(ConsumerSessionRunner.maintenanceScheduler.execute(() => refineReplayIndicators(generation, observer)))
        ()

    private def refineReplayIndicators(generation: Long, observer: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]): Unit =
        Try {
            if playGeneration.get == generation && replayCaughtUpNow then
                val boundaryEnds =
                    targets.values.headOption.map(_.consumerListener.startFromOrdering.replayBoundaryEnds).getOrElse(Map.empty)
                var newerEntries = 0L
                targets.values.foreach { target =>
                    target.consumers.foreach { (topicFqn, consumer) =>
                        if !isNonPersistentTopic(topicFqn) then
                            val streamId = startFromStreamId(consumer.getConsumerName, topicFqn)
                            boundaryEnds.get(streamId).foreach { boundary =>
                                Try(consumer.getLastMessageIds.asScala.toVector).foreach { ids =>
                                    val current = ids
                                        .map(EntryPosition.of)
                                        .maxOption(Ordering.by[EntryPosition, (Long, Long, Int)](p => (p.ledgerId, p.entryId, p.batchIndex)))
                                        .getOrElse(EntryPosition.empty)
                                    newerEntries += replayNewerEntriesApproxOf(boundary, current)
                                }
                            }
                    }
                }
                // LATE JOINERS: topics the selectors match NOW that the session is not consuming
                // - typically regex matches created after Play. Excluded from the replay by
                // design; surfaced so the banner can say "restart to include".
                val subscribed = allConsumedTopics
                val matchingNow = adminClient.toVector.flatMap(admin =>
                    targets.values.toVector.flatMap(target =>
                        Try(target.targetConfig.topicSelector.getNonPartitionedTopics(adminClient = admin)).getOrElse(Vector.empty)
                    )
                )
                val excluded = matchingNow.distinct.filterNot(subscribed.contains)
                // Still the same chunk and still caught up? Then record and push one refreshed
                // frame; a resume that landed meanwhile owns the state now and is left alone.
                if playGeneration.get == generation && replayCaughtUpNow then
                    val changed = newerEntries > replayNewerEntriesApprox || excluded.size != replayExcludedTopicCount
                    replayNewerEntriesApprox = math.max(replayNewerEntriesApprox, newerEntries)
                    replayExcludedTopics = excluded.take(ConsumerSessionRunner.replayExcludedTopicNamesCap)
                    replayExcludedTopicCount = excluded.size
                    if changed && includeConsumerStats then Try(sendResponse(observer, Seq.empty, Vector.empty))
        }.failed.foreach(err => permitLogger.debug(s"The caught-up indicator refinement failed and was skipped. ${err.getMessage}"))

    private def logStalledStreamEmptiness(): Unit =
        Try {
            // The ordering layer is session-wide, so the first listener's view is the session's.
            val stalled = targets.values.headOption.map(_.consumerListener.startFromOrdering.stalledStreamIds).getOrElse(Vector.empty)
            if stalled.nonEmpty then
                val consumersByStreamId = targets.values.flatMap { target =>
                    target.consumers.map((topicFqn, consumer) =>
                        startFromStreamId(consumer.getConsumerName, topicFqn) -> (consumer, target.consumerListener)
                    )
                }.toMap
                stalled.foreach { streamId =>
                    val note = consumersByStreamId.get(streamId) match
                        case None => "no live consumer for this stream"
                        case Some((consumer, listener)) =>
                            val endOfTopic = Try(consumer.getLastMessageIds.asScala.toVector).toOption.map(ids =>
                                ids
                                    .map(EntryPosition.of)
                                    .maxOption(Ordering.by[EntryPosition, (Long, Long, Int)](p => (p.ledgerId, p.entryId, p.batchIndex)))
                                    .getOrElse(EntryPosition.empty)
                            )
                            val consumedThrough = listener.consumedBounds
                                .get(consumer.getTopic)
                                .map(bounds => EntryPosition.of(bounds.last.messageId))
                            stalledStreamEmptinessNote(endOfTopic, consumedThrough)
                    permitLogger.debug(s"Delivery ordering in session $sessionName is waiting on $streamId: $note")
                }
        }.failed.foreach(err => permitLogger.debug(s"The stalled-stream diagnostic failed and was skipped. ${err.getMessage}"))

    /** The single timer thread behind the session's delivery rate limiter AND, for a
      * best-effort-ordered session, its continuous sweep ticks - created on first use, so a
      * session that neither throttles nor merges never owns one. Both tenants do real per-message
      * work here (JS lease, send lock), which is exactly why this thread is PER SESSION: on the
      * shared maintenance thread one slow session's filter delayed every other session's timers.
      */
    private var rateLimiterExecutor: Option[ScheduledExecutorService] = None

    private def timerExecutor(): ScheduledExecutorService = synchronized {
        rateLimiterExecutor.getOrElse {
            val created = Executors.newSingleThreadScheduledExecutor(runnable => {
                val thread = Thread(runnable, s"delivery-rate-limit-$sessionName")
                thread.setDaemon(true)
                thread
            })
            rateLimiterExecutor = Some(created)
            created
        }
    }

    private def scheduleRateLimiterTick(delayMs: Long, task: Runnable): Unit =
        // A tick scheduled while stop() is shutting the executor down is a delivery that no longer
        // matters; dropping it is the correct outcome, not an error.
        Try(timerExecutor().schedule(task, delayMs, TimeUnit.MILLISECONDS))
        ()

    /** The merge's stall bound is TIME-driven only through this watchdog: the in-band check runs on
      * offers, and after the last held backlog message no offer may ever come again - a
      * retention-trimmed partition then held the merge forever with the give-up window long
      * expired. Armed on resume while a counted start-from is unresolved, disarmed the moment it
      * resolves (the task cancels itself), on pause, and on stop.
      */
    private var stallSweepTask: Option[java.util.concurrent.ScheduledFuture[?]] = None

    private def armStallSweep(): Unit = synchronized {
        val continuous = continuousOrderingArmed
        if (startFromResolutionActive || continuous) && stallSweepTask.forall(task => task.isDone || task.isCancelled) then
            // The grace cadence for a continuous merge (its ticks are the timer half of the
            // residence bound and stay armed for the session's life); the coarse stall cadence
            // for a counted skip, whose sweep self-cancels once the resolution settles.
            //
            // ON THE SESSION'S OWN TIMER THREAD when continuous: a tick can release held
            // messages and run the whole downstream path - deserialization, user JavaScript, the
            // gRPC send - and on the SHARED maintenance thread one slow session's filter would
            // have delayed every other session's grace timer and the idle janitor with it. The
            // per-session timer already does exactly this class of work for the rate limiter.
            // The skip watchdog stays on the shared thread: its ticks are tiny checks, and its
            // rare give-up drain is a bounded one-off.
            // POLICY-SPECIFIC when continuous - see [[continuousSweepPeriodMs]]. Guaranteed has no
            // residence for a tick to expire and never gives a stream up, so the best-effort grace
            // cadence bought it nothing but work on a session that was simply waiting.
            val periodMs = if continuous then continuousSweepPeriodMs(guaranteedOrderingArmed) else startFromStallSweepPeriodMs
            def tick(): Unit =
                if !startFromResolutionActive && !continuous then cancelStallSweep()
                else
                    Try(targets.values.headOption.foreach(_.consumerListener.sweepStartFromStall())).failed
                        .foreach(err => permitLogger.warn(s"The start-from stall sweep failed; it will run again. ${err.getMessage}"))
            stallSweepTask = Try(
                if continuous then timerExecutor().scheduleWithFixedDelay(() => tick(), periodMs, periodMs, TimeUnit.MILLISECONDS)
                else ConsumerSessionRunner.maintenanceScheduler.scheduleWithFixedDelay(() => tick(), periodMs, periodMs, TimeUnit.MILLISECONDS)
            ).toOption
            armedSweepPeriod = stallSweepTask.map(_ => periodMs)
    }

    private def cancelStallSweep(): Unit = synchronized {
        stallSweepTask.foreach(_.cancel(false))
        stallSweepTask = None
        armedSweepPeriod = None
    }

    /** The session's delivery rate limiter. ONE per session however many targets and partitions the
      * selector matched, so the configured number means "per second, total" - the only reading a
      * user can act on. Rate 0 (the default) short-circuits to the unlimited path.
      */
    val deliveryRateLimiter: DeliveryRateLimiter[HeldMessage] = DeliveryRateLimiter[HeldMessage](
        core = DeliveryRateLimiterCore[HeldMessage](
            nowMs = () => System.nanoTime() / 1_000_000L,
            payloadBytesOf = held => scala.util.Try(Option(held.message.getData).map(_.length.toLong).getOrElse(0L)).getOrElse(0L)
        ),
        schedule = scheduleRateLimiterTick,
        process = held => held.listener.deliverNow(held),
        holdPermits = () => {
            // PER STREAM: hold everything except the streams a counted start-from is still waiting
            // on. Nothing eligible at all is the old whole-session refusal, and it hands back
            // `false` exactly as a target whose consumer threw does - the limiter keeps its flag
            // clear and retries on the next crossing offer.
            val eligible = allConsumedTopics -- permitHoldSuppressedTopics
            eligible.nonEmpty && setPermitHold(true, eligible.contains)
        },
        releasePermits = () =>
            // Truthful, like the hold: the limiter keeps its flag set and RETRIES on its own timer
            // when this answers false. Clearing the flag on a failed release used to strand
            // consumers paused forever - the queue was drained, so no crossing would ever come
            // to notice. EVERY stream, so a partial hold cannot leave one behind.
            setPermitHold(false),
        forceHoldPermits = () =>
            // The ceiling's escalation - see [[deliveryRateLimitForceHoldPermitsAboveQueued]].
            // Every stream, suppression and all: past this point an unbounded queue is the worse
            // outcome than a start-from cut the client is already told is degraded.
            setPermitHold(true)
    )

    /** Hand ONE response to the client, with wherever the start-from skip has got to attached.
      *
      * Every response leaves through here - a delivered message, a count-only placeholder, a
      * progress push - so the client cannot receive one that forgot the stats. That matters for the
      * completing state in particular: the client clears its progress panel when `complete` is true
      * or when the field is absent, so a delivered message that dropped the stats would leave a
      * "skipping..." panel on screen for the rest of the session.
      *
      * SERIALIZED, AND THE RESPONSE IS BUILT INSIDE THE SERIALIZED SECTION. `io.grpc.stub
      * .StreamObserver` is not thread-safe and this is entered from every Pulsar listener thread of
      * the session - one per physical topic - as well as from the gRPC thread that resumed it.
      * Progress pushes made that concrete: several partitions claiming a discard at once each called
      * `onNext` directly, concurrently, on one observer.
      *
      * Taking the lock only around `onNext` was not enough. The response - INCLUDING its start-from
      * counters - was built first, so two threads could snapshot the counters in one order and send
      * in the other: an older, still-incomplete progress frame could be written after a newer,
      * complete one. The client clears its progress panel when it sees `complete`, so the stale
      * frame behind it reopened a "skipping..." panel that stayed for the rest of the session. The
      * snapshot and the write now happen under one lock, which is the only way the two can agree.
      *
      * NOTHING IS WRITTEN AFTER THE STREAM HAS BEEN COMPLETED. See [[stop]].
      *
      * AND A DATA SEND INTO AN ENDED STREAM FAILS rather than reporting success. It used to be a
      * silent no-op, which is the one shape a caller cannot survive: `deliverNow` takes a normal
      * return as "the client has it" and goes straight on to acknowledge, so a delivery in flight
      * across [[stop]] or [[failAndComplete]] - the ordinary consequence of one target's resume
      * throwing while another target is mid-message - removed a persistent message from this
      * session's subscription with no browser ever having seen it. Throwing routes it down the
      * caller's failure path: negative-acknowledge and broker redelivery, so the message survives
      * to be shown by whatever session the client creates next.
      *
      * A MESSAGE-LESS progress frame is still dropped silently: nothing was delivered, so nothing
      * can be lost, and its callers treat a failed push as best-effort by design.
      */
    def sendResponse(
        observer: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        messages: Seq[consumerPb.Message],
        errors: Vector[String]
    ): Unit =
        sendLock.synchronized {
            if streamCompleted && messages.nonEmpty then
                throw new IllegalStateException(
                    "This play stream has ended; the message is handed back for redelivery."
                )
            else if streamCompleted then ()
            else if grpcResponseObserver.exists(_ eq observer) then
                observer match
                    // grpc-java SILENTLY DISCARDS writes to a cancelled call once a cancel
                    // handler is installed, and the cancellation handler clears the observer
                    // only a moment later - a write in that window would vanish while the
                    // caller acknowledged the message. Cancellation is a failed delivery.
                    case sco: io.grpc.stub.ServerCallStreamObserver[?] if sco.isCancelled =>
                        throw new IllegalStateException("The play stream was cancelled; the message is handed back for redelivery.")
                    case _ => ()
                observer.onNext(resumeResponse(
                    messages,
                    errors,
                    reportableStartFromProgress,
                    reportableOrderingLateDeliveries,
                    deliveryOrderActive = includeConsumerStats && continuousOrderingArmed,
                    orderKeyFallbacks = reportableOrderKeyFallbacks,
                    deliveryOrderWaitingStreams = reportableDeliveryOrderWaitingStreams,
                    replayCaughtUp = includeConsumerStats && replayCaughtUpNow,
                    replayBoundaryAtMs = replayBoundaryAtMs,
                    replayNewerEntriesApprox = replayNewerEntriesApprox,
                    replaySeamViolations = reportableReplaySeamViolations,
                    replayExcludedTopics = replayExcludedTopics,
                    replayExcludedTopicCount = replayExcludedTopicCount
                ))
            else
                // The observer this send was built for is no longer the wired one: a second Play
                // replaced it, or the transport cancelled it. Writing anyway could SILENTLY
                // vanish (grpc-java drops writes to a cancelled call once a cancel handler is
                // installed) and the caller would then acknowledge a message no client received.
                // Throwing routes it down the caller's failure path - negative-acknowledge and
                // broker redelivery - so it reaches the CURRENT stream instead, merely late.
                throw new IllegalStateException(
                    "This play stream was replaced or cancelled; the message is handed back for redelivery."
                )
        }

    /** The one thing every write to this session's response stream goes through - including the
      * terminal `onCompleted`, which is what makes "no response after the end" enforceable. */
    private val sendLock = new Object

    /** Whether the client's stream has been ended. Read and written only under [[sendLock]], so
      * every listener thread sees it as soon as the thread that ended the stream let go.
      *
      * STICKY, deliberately. A session is only stopped on its way out - deleted, or replaced by a
      * new session under the same name - and the runner is discarded immediately afterwards. A
      * resume that raced the stop would otherwise start writing into a completed gRPC stream, which
      * throws; the client's own remedy is to create a session, not to revive this one.
      */
    private var streamCompleted: Boolean = false

    /** When this runner stopped having a live play stream (monotonic nanos), `None` while one is
      * wired. Starts ticking at construction - a session that is created and never resumed is
      * exactly as abandoned as one whose tab was closed. Read and written under [[sendLock]] with
      * the observer it describes. This is the idle janitor's whole input: a client that vanishes
      * without a Delete RPC (tab closed, network drop, `beforeunload` that never delivered) leaves
      * consumers connected and reconnect-looping forever, and the ONLY signal that remains is that
      * nobody holds the play stream any more.
      */
    private var idleSinceNanos: Option[Long] = if grpcResponseObserver.isEmpty then Some(System.nanoTime()) else None

    /** Whether this runner's response stream has been ENDED - by [[stop]], or by
      * [[failAndComplete]]. Sticky, like the flag it reads: a terminal runner can never speak
      * again, so `ConsumerServiceImpl.resume` must answer a fresh observer itself rather than wire
      * it into one - every send would be swallowed by the gate and the play stream would hang
      * silent.
      */
    def isStreamCompleted: Boolean = sendLock.synchronized(streamCompleted)

    /** Nanos-timestamp since when this runner has had NO live play stream (or has been terminal),
      * `None` while one is wired - the janitor reaps runners whose value is old enough. */
    def reapableSinceNanos: Option[Long] = sendLock.synchronized(idleSinceNanos)

    /** Forget `observer` if it is still the wired one - the transport told us its call died.
      *
      * Compare-and-clear, not a bare clear: the cancellation of an OLD play stream can arrive
      * after a new resume has already wired its successor, and clearing (or pausing) then would
      * stomp the play the user just started. Returns whether anything was cleared, so the caller
      * knows if the cancellation was current news or stale.
      */
    def releaseCancelledObserver(observer: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]): Boolean =
        sendLock.synchronized {
            if grpcResponseObserver.exists(_ eq observer) then
                grpcResponseObserver = None
                idleSinceNanos = Some(System.nanoTime())
                true
            else false
        }

    /** End the client's stream with a non-OK `status`, through the same lock and terminal flag as
      * every other write to it.
      *
      * This exists for the failure paths that used to write to the observer DIRECTLY: a late
      * target throwing out of a resume leaves the earlier targets' listeners live and pushing into
      * the same observer, so a status frame written outside [[sendLock]] could interleave with a
      * push (`StreamObserver` is not thread-safe), and an `onCompleted` that set no terminal flag
      * let every later push land in a completed stream. Both sends are best-effort - the client's
      * call may already be dead - but the flag, which is what stops the pushing, is set regardless.
      *
      * THE PLAY GENERATION DIES FIRST, before the stream is ended, exactly as in [[stop]]: a
      * handler still in flight under it can no longer reach any client, so it must fail at the
      * generation gate rather than run the whole pipeline - the counters, the JS context, the
      * user's stateful filters - for a response that will never be written.
      */
    def failAndComplete(status: Status): Unit =
        playGeneration.incrementAndGet()
        sendLock.synchronized {
            if !streamCompleted then
                streamCompleted = true
                grpcResponseObserver.foreach { observer =>
                    Try(observer.onNext(consumerPb.ResumeResponse(status = Some(status))))
                    Try(observer.onCompleted())
                }
                grpcResponseObserver = None
                idleSinceNanos = idleSinceNanos.orElse(Some(System.nanoTime()))
        }

    def resume(
        grpcResponseObserver: io.grpc.stub.StreamObserver[consumerPb.ResumeResponse],
        isDebug: Boolean,
        includeConsumerStats: Boolean = true,
        maxMessagesPerSecond: Long = 0,
        maxMessagesToDeliver: Long = 0
    ): Unit =
        // FIRST: this play's generation. Anything still running under an older one dies at the
        // generation gate - in the TARGET handler, before it touches state, budget or the JS
        // context, and again here before the send.
        val myGeneration = playGeneration.incrementAndGet()
        // A new play prepares its own responses: anything the previous one left half-sent carries
        // that play's counters and was built for a stream that is gone, so it is not replayable.
        // Its retry re-runs the pipeline once under this play, like any first attempt.
        preparedDeliveries.synchronized(preparedDeliveries.clear())
        // Under the send lock like every other touch of the observer field: it is read by
        // [[sendResponse]], [[failAndComplete]] and [[stop]] on other threads, and an unserialized
        // write here could interleave with a stop completing the PREVIOUS observer.
        //
        // ONE RESUME GENERATION AT A TIME: a predecessor still wired here is a play stream some
        // client is still holding open (a second tab, a double Play), and silently orphaning it
        // left that stream starving forever - nothing would ever write to it again. It is
        // COMPLETED, under this same lock, so the swap and the goodbye are one atomic step.
        sendLock.synchronized {
            if !streamCompleted then
                this.grpcResponseObserver.filter(_ ne grpcResponseObserver).foreach(previous => Try(previous.onCompleted()))
                this.grpcResponseObserver = Some(grpcResponseObserver)
                idleSinceNanos = None
        }
        this.includeConsumerStats = includeConsumerStats

        // Both delivery controls are per RESUME, like the two flags above them - they belong to
        // the browser that pressed Play, not to the session's saved definition. Configured before
        // the targets resume below, so the gate's volatile write publishes the limiter to the
        // listener threads along with everything else this resume rewired. The user's resume also
        // resumed every consumer regardless of any permit hold the limiter had placed, so the
        // limiter is told to forget it - its next watermark crossing re-asserts the hold instead
        // of believing a stale flag.
        //
        // The delivery budget counts LOADED messages at the send site below; it needs the queue
        // (forceQueue) so the drain can stop the line BETWEEN messages - the budget's whole
        // contract is that the message spending the last unit is the last one sent.
        remainingToDeliver.set(if maxMessagesToDeliver > 0 then maxMessagesToDeliver else Long.MaxValue)
        deliveryRateLimiter.core.setRate(math.max(0, maxMessagesPerSecond))
        deliveryRateLimiter.core.setForceQueue(maxMessagesToDeliver > 0)
        targets.values.foreach(_.consumerListener.deliveryRateLimiter = Some(deliveryRateLimiter))

        // THE GUARANTEED REPLAY BOUNDARY IS THE MOMENT PLAY WAS PRESSED - and CREATE IS THE
        // FIRST PLAY. The boundaries decided at session build - the real recorded ends of the
        // history seeks, and the deliberately EMPTY ends of the live-edge seeks (Latest,
        // latest-n's non-contributors, the approximate-entry endpoint) - are already armed in
        // the ordering layer and ARE the first chunk's boundaries, so the first Play CONSUMES
        // them. Re-reading the broker here instead OVERWROTE a live-edge stream's empty
        // boundary with the backlog's real end - a range the consumer's cursor already sits
        // PAST, so nothing could ever drain it: Latest x Guaranteed on a non-empty topic armed
        // `waiting` over undeliverable history and the caught-up never fired (e2e CS-DM-R3B).
        // Only a LATER resume re-captures fresh ends and EXTENDS the boundary - the one rule
        // for a manual pause's resume and the auto-pause's alike, and correct there because the
        // cursor genuinely sits at the previous chunk's boundary, at or before any new end: the
        // un-emitted remainder and the freshly recorded delta merge in one heap and sort
        // exactly. A failed re-capture fails that resume loudly, exactly as a target that will
        // not resume does. Sequenced deliberately: the generation was bumped FIRST (top of this
        // method), the extension runs under the session's ordering lock HERE, and the consumers
        // - the Boundary holds included - are released only in the target walk BELOW; that
        // order is what makes a stale auto-pause and a past-end nack racing this re-capture
        // converge instead of stomping the play (see announceReplayCaughtUp).
        if guaranteedOrderingArmed then
            val firstPlay = !replayCreateBoundaryConsumed
            val boundaryStreams =
                if firstPlay then Vector.empty
                else startFromStreamsAt(targets.values.flatMap(_.consumers.values).toVector)
            replayCaughtUpNow = false
            replayNewerEntriesApprox = 0L
            replayExcludedTopics = Vector.empty
            replayExcludedTopicCount = 0
            // "Caught up to <t>" reports when the STANDING boundary was captured: session build
            // for the first chunk, this resume for an extension.
            replayBoundaryAtMs = if firstPlay then replayBoundaryCapturedAtMs else System.currentTimeMillis()
            if !firstPlay then targets.values.headOption.foreach(_.consumerListener.extendReplayBoundary(boundaryStreams))
            replayCreateBoundaryConsumed = true

        // THE CAUGHT-UP HOOK, wired per play like the limiter above: the pump invokes it (under
        // the session's ordering lock) whenever the replay barrier reports the chunk complete.
        // The generation gate plus the once-flag make it one announcement per chunk - and make a
        // stale announcement impossible: a Resume bumps the generation BEFORE its boundary
        // extension takes the same ordering lock, so a hook running after that sees a foreign
        // generation and does nothing.
        val replayCaughtUpAnnounced = java.util.concurrent.atomic.AtomicBoolean(false)
        def announceReplayCaughtUp(): Unit =
            if playGeneration.get == myGeneration && replayCaughtUpAnnounced.compareAndSet(false, true) then
                replayNewerEntriesApprox =
                    targets.values.headOption.map(_.consumerListener.startFromOrdering.replayNewerEntriesSeen).getOrElse(0L)
                replayCaughtUpNow = true
                // THE RUNNER-SIDE AUTO-PAUSE: close every intake gate and hold every consumer
                // still - the arbiter's Boundary reason, so the user's own pause state and the
                // merge's flow-control holds stay untouched. Arbiters are leaf locks the
                // flow-control reconcile already takes under the ordering lock on every handled
                // batch, so this introduces no new lock ordering. The full user-pause path
                // (permit lock, limiter quiesce) is deliberately NOT reused here: it takes
                // lifecycle-side locks this thread must not acquire under the ordering lock, and
                // a caught-up barrier has nothing in flight for it to quiesce anyway.
                targets.values.foreach { target =>
                    target.consumerListener.stopAcceptingNewMessages()
                    target.pauseArbiters.values.foreach(_.hold(PauseReason.Boundary))
                }
                permitLogger.info(
                    s"Consumer session $sessionName reached its replay boundary and auto-paused; " +
                        "the caught-up signal was pushed to the client."
                )
                // The signal frame: message-less, stats-bearing - the client learns the state
                // change from it. Best-effort like every progress push; the state itself is
                // already recorded above and rides every later response too.
                if includeConsumerStats then Try(sendResponse(grpcResponseObserver, Seq.empty, Vector.empty))
                scheduleReplayIndicatorRefinement(myGeneration, grpcResponseObserver)
        targets.values.foreach(_.consumerListener.onReplayCaughtUp = () => announceReplayCaughtUp())
        // The drain is re-armed at the BOTTOM of this method, after every target has rewired its
        // handlers onto this resume's observer. Re-arming here scheduled a zero-delay tick that
        // could run a queued tail through the PREVIOUS play's handler closure - sending messages
        // to the cancelled observer, acknowledging them, and charging them to THIS resume's
        // delivery budget. The messages were consumed and never seen.

        // A message the start-from discard swallowed reaches nobody: the listener drops it before the
        // message handler, so nothing on the path below fires while a skip is in flight. Without
        // this push a session skipping millions of messages looks hung - it delivers nothing and
        // says nothing. Runs on the Pulsar listener threads, one per consumer, and on the sweep
        // timer - hence ATOMIC once-only flags, not plain vars: two threads racing the same
        // disclosure must produce exactly one claiming winner, not a duplicated or dropped frame.
        val degradationReported = java.util.concurrent.atomic.AtomicBoolean(false)
        val stallWarningsReported = AtomicLong(0L)
        def reportStartFromDiscardProgress(): Unit =
            // Each NEW stall warning bypasses every other gate: a stalled merge drops nothing and
            // delivers nothing, so no interval boundary would ever be crossed - and the client
            // would show "awaiting new messages" over a session that is stuck WAITING. The
            // waiting-streams count rides on every response's consumer stats; what is decided
            // here is only WHEN a message-less frame is pushed: once per new warning (the merge
            // re-warns only after a stall resolves and a fresh one begins), never per held
            // message or per sweep tick. `getAndAccumulate(max)` is the atomic claim - exactly
            // one caller sees the advance.
            val stallWarningsNow = targets.values.map(_.consumerListener.startFromStallWarnings).maxOption.getOrElse(0L)
            val mustDiscloseStall = includeConsumerStats
                && stallWarningsReported.getAndAccumulate(stallWarningsNow, math.max(_, _)) < stallWarningsNow
            // The debug-level WHY behind the count the client is shown - which streams, and
            // whether each is verifiably out of messages or merely lagging. Throttled with the
            // disclosure itself, and scheduled off-thread: the classification reads each topic's
            // end from the broker, and this closure runs under the ordering lock.
            if mustDiscloseStall then scheduleStalledStreamDiagnostic()
            reportableStartFromProgress match
                case None =>
                    // NO COUNTED SKIP AT ALL - an ordering-only session, whose budget is a shared
                    // zero. This used to fall out of the disclosure entirely: a stalled GUARANTEED
                    // session wrote no ResumeResponse ever, indistinguishable from an empty topic.
                    // The stall is the one thing such a session still has to say.
                    if mustDiscloseStall then sendResponse(grpcResponseObserver, Seq.empty, Vector.empty)
                case Some(progress) =>
                    // The FIRST degraded frame bypasses the interval gate. A give-up may resolve
                    // only a handful of drops - or none at all - and a session that then goes
                    // quiet would never cross another interval boundary: the disclosure would sit
                    // in the server forever, which is the exact silent failure the flag exists to
                    // prevent. The compare-and-set is the once-only claim.
                    val mustDiscloseDegradation = progress.degraded && degradationReported.compareAndSet(false, true)
                    if mustDiscloseDegradation
                        || mustDiscloseStall
                        || shouldReportStartFromProgress(progress.messagesSkipped, progress.messagesToSkip, startFromProgressReportInterval)
                    then
                        if mustDiscloseDegradation then
                            // Log-worthy in its own right: this is the moment the session's answer
                            // became best-effort, and the one frame the client's banner hangs on.
                            permitLogger.info(
                                s"Disclosing start-from degradation to the client: abandoned ${progress.abandonedStreams.mkString(", ")}"
                            )
                        // Message-less on purpose: nothing was delivered, only the counters moved.
                        // The client reads the stats before it looks for a trailing message.
                        sendResponse(grpcResponseObserver, Seq.empty, Vector.empty)

        /** Write what one attempt prepared, remembering it until the write takes.
          *
          * The memo goes in BEFORE the send and comes out only after it returned: a send that
          * throws leaves the prepared response behind, and the retry - a broker redelivery, or
          * Guaranteed's in-place retry - re-sends exactly this instead of running the pipeline
          * again. See [[preparedDeliveries]].
          */
        def sendPrepared(deliveryKey: Option[DeliveryKey], prepared: PreparedDelivery): Unit =
            deliveryKey.foreach(rememberPrepared(_, prepared))
            sendResponse(grpcResponseObserver, prepared.messages, prepared.errors)
            deliveryKey.foreach(forgetPrepared)
            // The budget is charged AFTER the send took: a refused or failed send hands the
            // message back (nack, retry) and must not burn a unit on a delivery nobody
            // received. The last-unit guarantee is intact - the pause lands before this
            // handler returns, so everything behind it in a drain batch is requeued.
            if prepared.spendsBudgetUnit && remainingToDeliver.decrementAndGet() == 0 then deliveryRateLimiter.pauseDraining()

        /** WHAT THE TARGET HANDLER ASKS BEFORE IT DOES ANYTHING AT ALL.
          *
          * The generation gate lives here, at the very front of the delivery, rather than in the
          * session callback below: by the time a handler reaches that callback it has already
          * advanced both processed counters, deserialized the message, leased the JS context and
          * run the target's filters, coloring rules and projections - so a second Play or a Stop
          * crossing an in-flight delivery left all of that behind, and the redelivery then let the
          * user's stateful JavaScript observe the same message a second time.
          *
          * The same question answers the retry of a FAILED send: a response this play already
          * prepared for this message is re-sent here, and the pipeline behind it is skipped.
          */
        def admitDelivery(deliveryKey: Option[DeliveryKey]): DeliveryAdmission =
            if playGeneration.get != myGeneration then DeliveryAdmission.Superseded
            else
                deliveryKey.flatMap(preparedFor(_, myGeneration)) match
                    case Some(prepared) =>
                        sendPrepared(deliveryKey, prepared)
                        DeliveryAdmission.Replayed
                    case None => DeliveryAdmission.Prepare

        def onNext(
            messageFromTarget: Option[ConsumerSessionMessage],
            sessionContext: ConsumerSessionContext,
            stats: ConsumerSessionTargetStats,
            errors: Vector[String],
            deliveryKey: Option[DeliveryKey]
        ): Unit = boundary:
            // THE GENERATION GATE AGAIN, immediately before the send. The target checked it before
            // its first mutation; this is the recheck for work that CROSSED a replacement while it
            // ran - the session filters, coloring rules and projections below all take time. The
            // throw routes the message down the delivery-failure path: handed back for redelivery,
            // recorded in the failed-delivery registry, and delivered exactly once - late - by the
            // machinery of the play that is actually current.
            if playGeneration.get != myGeneration then
                throw new IllegalStateException("This play was superseded; the message is handed back for redelivery.")
            def createAndSendResponse(
                messages: Seq[consumerPb.Message],
                additionalErrors: Vector[String] = Vector.empty,
                spendBudgetUnit: Boolean = false
            ): Unit =
                sendPrepared(deliveryKey, PreparedDelivery(myGeneration, messages, errors ++ additionalErrors, spendBudgetUnit))
                boundary.break(())

            messageFromTarget match
                case None =>
                    val emptyMsgPb = consumerPb.Message(
                        numMessageProcessed = numMessageProcessed,
                        numMessageSent = numMessageSent
                    )
                    // NOT `errors` again: createAndSendResponse already appends the captured
                    // `errors` to every response, so passing them here too doubled every
                    // target-filter debug error the client saw.
                    createAndSendResponse(Seq(emptyMsgPb))

                case Some(msg) =>
                    val messageFilterChainResult = sessionContext.testMessageFilterChain(
                        sessionConfig.messageFilterChain
                    )

                    if !messageFilterChainResult.isOk then
                        // Session-level filter miss: emit the SAME count-only placeholder the drained /
                        // target-filter-miss path (`case None` above) sends - NOT an empty (zero-message)
                        // response. On a zero-message response the client throws reading the trailing
                        // counters (ConsumerSession.tsx: newMessages[newMessages.length - 1]
                        // .getNumMessageProcessed()), which kills the stream handler - so the session
                        // halted at the first non-matching message. A count-only placeholder advances
                        // the processed counter, renders no row, and keeps the stream flowing (matching
                        // the per-target filter, which never halts).
                        val filteredMsgPb = consumerPb.Message(
                            numMessageProcessed = numMessageProcessed,
                            numMessageSent = numMessageSent
                        )
                        val filterErrors = if isDebug then messageFilterChainResult.results.flatMap(r => r.error) else Vector.empty
                        createAndSendResponse(Seq(filteredMsgPb), filterErrors)

                    val coloringRuleChainResult: Vector[ChainTestResult] = if sessionConfig.coloringRuleChain.isEnabled then
                        sessionConfig.coloringRuleChain.coloringRules
                            .filter(_.isEnabled)
                            .map(cr => sessionContext.testMessageFilterChain(cr.messageFilterChain))
                    else
                        Vector.empty

                    val valueProjectionListResult: Vector[ValueProjectionResult] = if sessionConfig.valueProjectionList.isEnabled then
                        sessionConfig.valueProjectionList.projections
                            .filter(_.isEnabled)
                            .map(_.project(sessionContext.context))
                    else
                        Vector.empty

                    val errors: Vector[String] = if isDebug then
                        val messageFilterChainErrors = messageFilterChainResult.results.flatMap(r => r.error)
                        val coloringRuleChainErrors = coloringRuleChainResult.flatMap(r => r.results.flatMap(r2 => r2.error))
                        messageFilterChainErrors ++ coloringRuleChainErrors
                    else Vector.empty

                    numMessageSentCounter.incrementAndGet()

                    val messageToSendPb = msg.messagePb
                        .withSessionContextStateJson(sessionContext.getState)
                        .withDebugStdout(msg._1.debugStdout.getOrElse("") + "\n" + sessionContext.getStdout)
                        .withSessionMessageFilterChainTestResult(ChainTestResult.toPb(messageFilterChainResult))
                        .withSessionColorRuleChainTestResults(coloringRuleChainResult.map(ChainTestResult.toPb))
                        .withSessionValueProjectionListResult(valueProjectionListResult.map(ValueProjectionResult.toPb))
                        .withNumMessageSent(numMessageSent)
                        .withNumMessageProcessed(numMessageProcessed)

                    createAndSendResponse(Seq(messageToSendPb), errors, spendBudgetUnit = true)

        targets.values.foreach(_.resume(
            onNext = onNext,
            isDebug = isDebug,
            incrementNumMessageProcessed = incrementNumMessageProcessed,
            onStartFromDiscardProgress = reportStartFromDiscardProgress,
            admitDelivery = admitDelivery
        ))

        // LAST, deliberately: only now does every listener's handler point at THIS observer, so a
        // queued tail from the previous play drains into the resume that asked for it. See the
        // comment where the limiter is configured above.
        deliveryRateLimiter.resumeDraining()
        // A pause held every source, so paused time proves nothing about a stream's health: hand
        // the silent-stream clock a fresh window instead of letting the first sweep after resume
        // abandon a stream that was merely held along with everything else.
        targets.values.headOption.foreach(_.consumerListener.resetStartFromStallClock())
        armStallSweep()
        // Drive the replay barrier once, now that everything is wired and the consumers run: an
        // EMPTY replay (Latest, a single non-persistent stream, no delta after an extension)
        // will never see an offer to pump it, and its instant caught-up must fire on Play - not
        // never. A non-empty chunk's held remainder resumes emission here too, without waiting
        // for the first new offer or the next sweep tick.
        if guaranteedOrderingArmed then targets.values.headOption.foreach(_.consumerListener.pumpGuaranteedDelivery())
    def pause(): Unit =
        // THE DRAINER STOPS FIRST, before a single target is walked. A paused session delivers
        // NOTHING, including from the limiter's backlog - and this used to run in the `finally`
        // BELOW the target walk, so on a wide session the queued backlog went on being delivered
        // and acknowledged for the whole length of a walk over up to 2,000 consumers, long after
        // the user asked the session to stop. It returns only once nothing is still on its way out
        // (see [[DeliveryRateLimiter.pauseDraining]]), so what follows cannot race a send.
        deliveryRateLimiter.pauseDraining()
        // The step that must NEVER be skipped runs in the finally: one target throwing used to
        // abandon the rest un-attempted AND leave the watchdog sweeping a session the user
        // believed paused. Every target is attempted (each target attempts every consumer - see
        // ConsumerSessionTargetRunner.pause), failures are aggregated, and the aggregate is thrown
        // only after the session is in the safest state this call can reach.
        try
            val failures = targets.values.toVector.flatMap { target =>
                Try(target.pause()).failed.toOption.map(err => s"target ${target.targetIndex}: ${err.getMessage}")
            }
            if failures.nonEmpty then throw new RuntimeException(failures.mkString("; "))
        finally cancelStallSweep()

    /** Release everything this session owns: its consumers and their subscriptions, its GraalVM
      * contexts, and the client's response stream.
      *
      * EVERY step runs even if an earlier one failed, and the failures are aggregated into one
      * exception at the end. It used to swallow unsubscribe failures entirely and close nothing at
      * all, so `deleteConsumer` removed the only handle to the session and answered OK while the
      * subscription stayed on the broker, the consumers stayed connected, the Graal context stayed
      * open and the browser kept a stream that was never completed.
      *
      * Idempotent: each target clears its consumer map, closing a Graal context twice is a no-op,
      * and the observer is forgotten once completed.
      *
      * ENDING THE STREAM IS ITSELF A WRITE TO IT, so it goes through [[sendLock]] like every other
      * one. `onCompleted` used to be called outside that lock with no terminal flag at all, so it
      * could interleave with an `onNext` still in flight on a listener thread - and any push after
      * it wrote to a stream that had already ended.
      */
    def stop(): Unit =
        // FIRST and unconditionally: no handler may do stateful work for a session that is on
        // its way out (a continuous sweep can be mid-delivery on the session's own timer thread),
        // and the shared maintenance task must never keep touching a dying runner.
        playGeneration.incrementAndGet()
        cancelStallSweep()
        Try(pause())
        // The limiter's backlog dies with the session: the messages were never acknowledged, and
        // the NonDurable subscriptions being released below take any redelivery question with
        // them. Clearing promptly is about freeing the payloads, not about correctness.
        Try(deliveryRateLimiter.stop())
        synchronized { rateLimiterExecutor }.foreach(executor => Try(executor.shutdownNow()))
        // An UNEXPECTED throw out of a target's own stop used to become an empty failure vector, so
        // whatever it failed to release was reported as released. It is a failure like any other.
        val targetFailures = targets.values.toVector.flatMap { target =>
            Try(target.stop()) match
                case Success(failures) => failures
                case Failure(err)      => Vector(s"target ${target.targetIndex}: ${err.getMessage}")
        }
        // The pool's own failures count too: a JS context that will not close holds its heap for the
        // life of the process, and this used to be discarded twice over - swallowed inside `close`
        // and then discarded again here.
        val poolFailures = Try(sessionContextPool.close()) match
            case Success(failures) => failures
            case Failure(err)      => Vector(s"JS context pool: ${err.getMessage}")
        val failures = targetFailures ++ poolFailures
        sendLock.synchronized {
            if !streamCompleted then
                streamCompleted = true
                grpcResponseObserver.foreach(observer => Try(observer.onCompleted()))
                grpcResponseObserver = None
                idleSinceNanos = idleSinceNanos.orElse(Some(System.nanoTime()))
        }
        if failures.nonEmpty then
            throw new RuntimeException(s"Consumer session $sessionName could not be fully released. ${failures.mkString("; ")}")
}

/** The logger [[storeConsumerSession]] reports through - a top-level function needs its own name
  * for the log line to be attributable (and for a test to listen on). */
private val storeConsumerSessionLogger = com.typesafe.scalalogging.Logger("consumer.session_runner.storeConsumerSession")

/** Store a freshly built session under its name, STOPPING whatever it replaced.
  *
  * Creating a session under a name that already existed simply overwrote the entry, and the old
  * runner's consumers went on holding their subscriptions and delivering messages into a session
  * nothing could reach - for the life of the process. The browser re-creates a session on an
  * ordinary configuration change, so this was the common path, not a corner.
  *
  * The replacement goes in FIRST and unconditionally: a predecessor that cannot be released must
  * not make its name permanently unusable, so the failure is LOGGED HERE rather than propagated -
  * it used to be discarded outright, while this comment claimed the caller logged it, so a
  * predecessor that failed to release vanished without a trace in exactly the situation an
  * operator needs one. `ConcurrentHashMap.put` is atomic, so two concurrent creates leave exactly
  * one session stored and the other stopped.
  */
def storeConsumerSession(
    sessions: java.util.concurrent.ConcurrentHashMap[String, ConsumerSessionRunner],
    sessionName: String,
    session: ConsumerSessionRunner
): Unit =
    Option(sessions.put(sessionName, session)).foreach(replaced =>
        Try(replaced.stop()).failed.foreach(err =>
            storeConsumerSessionLogger.warn(
                s"The consumer session being replaced under $sessionName could not be fully released. ${err.getMessage}"
            )
        )
    )
    ()

object ConsumerSessionRunner:

    /** Whether the selected delivery mode needs an ordering layer.
      *
      * Best effort needs one only ACROSS sources - one Pulsar topic or partition has no
      * cross-source order to decide, so a single stream stays on the free pass-through path.
      * GUARANTEED builds its layer at ANY stream count since the exact-replay redesign (owner
      * decision 2026-08-09): the replay boundary, the finished-stream barrier, the auto-pause
      * and the caught-up signal all live in the layer, and a one-partition replay needs them
      * exactly as much as a fifty-partition one.
      */
    def needsDeliveryOrderLayer(order: MessageDeliveryOrder, streamCount: Int): Boolean =
        order match
            case MessageDeliveryOrder.Guaranteed => true
            case MessageDeliveryOrder.AsReceived => false
            case _                               => streamCount > 1

    /** How many excluded-topic NAMES the caught-up signal carries; the count field carries the
      * rest. A regex can match a whole namespace of late joiners, and the banner needs a few
      * names, not a wall. */
    val replayExcludedTopicNamesCap: Int = 5

    private def isReadCompactedTarget(targetConfig: consumer.session_target.ConsumerSessionTarget): Boolean =
        targetConfig.consumptionMode.mode match
            case _: consumer.session_target.consumption_mode.modes.ReadCompactedConsumptionMode => true
            case _                                                                              => false

    /** Why ordering by broker publish time must be refused against this broker configuration,
      * or None when it is available - or when the configuration is UNREADABLE, which must not
      * block anybody (no broker-side steps are ever required to use Dekaf; the per-message
      * fallback counter discloses instead). Pure, so the boundary is pinned without a broker. */
    def brokerPublishTimeUnavailableReason(brokerConfig: Option[Map[String, String]]): Option[String] =
        brokerConfig.flatMap { config =>
            val stamps = config
                .get("brokerEntryMetadataInterceptors")
                .exists(_.contains("AppendBrokerTimestampMetadataInterceptor"))
            val exposes = config
                .get("exposingBrokerEntryMetadataToClientEnabled")
                .exists(_.trim.equalsIgnoreCase("true"))
            Option.when(!(stamps && exposes))(
                "Broker publish time is unavailable because this cluster does not stamp and expose broker " +
                    "timestamp entry metadata. Choose Publish time or Event time, or ask an administrator to " +
                    "enable AppendBrokerTimestampMetadataInterceptor and exposingBrokerEntryMetadataToClientEnabled."
            )
        }

    /** The most ENABLED targets one session may run. The per-target topic cap
      * ([[ConsumerSessionTargetRunner.maxTopicsPerTarget]]) bounded one target, but the UI appends
      * targets without limit, so N targets multiplied that bound right back away. Generous - a
      * session this wide is already unusable interactively - but a bound. */
    val maxEnabledTargetsPerSession: Int = 25

    /** The most physical topic streams one session may run in total, across every enabled target.
      * Each stream is a consumer, a subscription and a receiver queue; the per-target and
      * per-session-target caps alone would still admit maxEnabledTargets x maxTopicsPerTarget
      * streams, which is not an interactive session, it is a load test. */
    val maxStreamsPerSession: Int = 2_000

    /** Why a session with this many enabled targets must be refused, or None if it is admissible.
      * Pure so the boundary is unit-testable without a broker; [[make]] wires it in. */
    def enabledTargetCountRejectionReason(sessionName: String, enabledTargetCount: Int): Option[String] =
        Option.when(enabledTargetCount > maxEnabledTargetsPerSession)(
            s"Consumer session $sessionName has $enabledTargetCount enabled targets, more than the $maxEnabledTargetsPerSession " +
                "one session can run. Disable some targets or split the work across several sessions."
        )

    /** Why a session whose enabled targets resolve to these many physical streams must be refused,
      * or None if it is admissible. Counted per target, NOT distinct across targets: two targets
      * selecting the same topic each keep their own consumer on it, so each costs a stream. */
    def sessionStreamTotalRejectionReason(sessionName: String, streamCountsByTarget: Vector[Int]): Option[String] =
        val total = streamCountsByTarget.sum
        Option.when(total > maxStreamsPerSession)(
            s"Consumer session $sessionName resolves to $total physical topic streams across its enabled targets " +
                s"(${streamCountsByTarget.mkString(" + ")}), more than the $maxStreamsPerSession one session can run. " +
                "Narrow the topic selectors (tighter regexes, or specific topics) or split the work across several sessions."
        )
    /** ONE daemon thread for every session's periodic upkeep (the start-from stall sweeps). Each
      * armed sweep is a tiny check every couple of seconds, and it self-cancels the moment its
      * skip resolves - a thread per session outlived its one job by the whole session lifetime.
      * The rare give-up DRAIN does run session work here (delivering what a silent stream held
      * back), which is accepted: it fires at most once per abandoned stream. The delivery rate
      * limiter keeps its per-session timer - its ticks do real per-message work under the
      * session's own locks and must not serialize sessions against each other.
      */
    private[consumer] lazy val maintenanceScheduler: ScheduledExecutorService =
        Executors.newSingleThreadScheduledExecutor(runnable => {
            val thread = Thread(runnable, "consumer-session-maintenance")
            thread.setDaemon(true)
            thread
        })
    /** @param sessionContextPool
      *   the session's GraalVM engine and JS contexts. A parameter (with the production default)
      *   only so a test can prove the pool is RELEASED when construction fails - it is created
      *   before anything else and so is the first thing that can be leaked.
      */
    def make(
        pulsarClient: PulsarClient,
        adminClient: PulsarAdmin,
        sessionName: String,
        sessionConfig: ConsumerSessionConfig,
        sessionContextPool: ConsumerSessionContextPool = ConsumerSessionContextPool()
    ): ConsumerSessionRunner =
        var targets: Map[ConsumerSessionTargetIndex, ConsumerSessionTargetRunner] = Map.empty

        // Admission on what the CONFIG alone already tells us, before any broker work: past this
        // many targets there is nothing to resolve or subscribe, only a refusal to deliver.
        enabledTargetCountRejectionReason(sessionName, sessionConfig.targets.count(_.isEnabled)).foreach { reason =>
            Try(sessionContextPool.close())
            throw new IllegalArgumentException(reason)
        }

        // EVERYTHING THIS SESSION OWNS IS RELEASED IF ANY OF IT FAILS, and the pool is inside that
        // guard from the very first step. It used to be built before the guard existed, so a target
        // that failed to build released the targets built before it (`buildAllOrRelease`) and left
        // the GraalVM engine and its JS contexts open with nothing holding a handle to them - a
        // whole engine leaked per failed create, and the browser retries a failed create.
        def releasingSession[A](build: => A): A =
            try build
            catch
                case err: Throwable =>
                    targets.values.foreach(target => Try(target.stop()))
                    Try(sessionContextPool.close())
                    throw err

        // RESOLVE EVERY SELECTOR BEFORE ANY CONSUMER EXISTS. Three session-wide decisions need
        // the full picture first: the per-target and session-total admission caps (refusing
        // AFTER subscribing meant a doomed session transiently created hundreds of consumers
        // just to release them), the empty-target refusal, and the best-effort-order prefetch
        // budget, which divides across the session's ACTUAL stream total - a number no single
        // target can know.
        val resolvedTargets: Vector[((ConsumerSessionTarget, Int), Vector[NonPartitionedTopicFqn])] =
            releasingSession(sessionConfig.targets.filter(_.isEnabled).zipWithIndex.map { (targetConfig, i) =>
                val fqns = targetConfig.topicSelector.getNonPartitionedTopics(adminClient = adminClient)
                // A namespaced-regex selector can match a whole namespace; past this many
                // physical topics the session would spend its life subscribing and every counted
                // mode's per-message work scales with the count - refusing loudly beats grinding
                // into a session nobody can use.
                if fqns.size > ConsumerSessionTargetRunner.maxTopicsPerTarget then
                    throw new IllegalArgumentException(
                        s"Target $i resolves to ${fqns.size} physical topics, more than the ${ConsumerSessionTargetRunner.maxTopicsPerTarget} " +
                            "one session can handle. Narrow the topic selector (a tighter regex, or specific topics) or split the work " +
                            "across several sessions."
                    )
                ((targetConfig, i), fqns)
            })

        val emptyTargets = resolvedTargets.collect { case ((_, i), fqns) if fqns.isEmpty => i }
        if emptyTargets.nonEmpty then
            releasingSession(throw new IllegalArgumentException(
                s"Consumer session $sessionName has enabled targets that resolved to no topics: ${emptyTargets.mkString(", ")}."
            ))

        sessionStreamTotalRejectionReason(sessionName, resolvedTargets.map(_._2.size))
            .foreach(reason => releasingSession(throw new IllegalArgumentException(reason)))

        // Refuse target/start-position combinations before constructing a subscription. The
        // information is already present in `resolvedTargets`; building up to 2,000 consumers only
        // to release them again is both observable outside Dekaf and needlessly expensive.
        val readCompactedTargetIndexes = resolvedTargets.collect {
            case ((targetConfig, targetIndex), _) if isReadCompactedTarget(targetConfig) => targetIndex
        }.sorted
        readCompactedStartFromRejectionReason(sessionConfig.startFrom, readCompactedTargetIndexes)
            .foreach(reason => releasingSession(throw new IllegalArgumentException(reason)))
        skipOverlapRejectionReason(sessionConfig.startFrom, resolvedTargets.map(_._2))
            .foreach(reason => releasingSession(throw new IllegalArgumentException(reason)))

        val totalSessionStreams = resolvedTargets.map(_._2.size).sum
        // A single delivery stream is already ordered as Pulsar delivers it. The selected mode is
        // therefore a no-op: do not reject it, reduce prefetch, or inspect timestamps for a merge
        // layer that will not exist.
        val orderingLayerNeeded = needsDeliveryOrderLayer(sessionConfig.messageDeliveryOrder, totalSessionStreams)

        // GUARANTEED ordering refuses a MERGE over non-persistent topics up front: such a topic
        // retains nothing and may be legitimately silent forever, so waiting on it inside a
        // multi-stream barrier would mean a session that can never speak. Scoped to more than
        // one stream, exactly as before the replay redesign made Guaranteed build a layer at
        // any width: a SINGLE non-persistent stream stays legal - it retains nothing, so its
        // replay boundary is empty and the session answers with an instant caught-up instead of
        // a refusal (owner decision 2026-08-09, design item on non-persistent).
        if totalSessionStreams > 1 && sessionConfig.messageDeliveryOrder == MessageDeliveryOrder.Guaranteed then
            val nonPersistent = resolvedTargets.flatMap(_._2).filter(isNonPersistentTopic).distinct
            if nonPersistent.nonEmpty then
                releasingSession(throw new IllegalArgumentException(
                    s"Guaranteed ordering is not supported when merging non-persistent topics " +
                        s"(${nonPersistent.mkString(", ")}). Choose Best effort or Fastest, or remove those topics."
                ))

        // Ordering by BROKER PUBLISH TIME needs the broker to stamp and expose entry metadata.
        // Dekaf requires NO broker changes: when the broker's effective configuration is
        // readable and clearly lacks the two settings, the create is refused with the exact
        // remediation; when it is not readable (permissions, old broker), the session proceeds
        // and the per-message fallback counter discloses instead. Scoped to MORE THAN ONE
        // stream, the pre-replay boundary of this refusal: a single-stream Guaranteed session
        // now builds a layer too, but one log is already in append order - the key only feeds
        // seam detection - so a session that was accepted before must not become a refusal, and
        // the fallback counter discloses there instead.
        if orderingLayerNeeded && totalSessionStreams > 1 && sessionConfig.deliveryOrderKey == DeliveryOrderKey.BrokerPublishTime then
            ConsumerSessionRunner
                .brokerPublishTimeUnavailableReason(
                    Try(adminClient.brokers().getRuntimeConfigurations.asScala.toMap).toOption
                )
                .foreach(reason => releasingSession(throw new IllegalArgumentException(reason)))

        // ALL OR NOTHING, at the target level as well as inside each target: a session builds one
        // runner per enabled target, and a plain `map` left every target built before a failing one
        // subscribed and unreachable.
        targets = releasingSession(buildAllOrRelease[((ConsumerSessionTarget, Int), Vector[NonPartitionedTopicFqn]), (Int, ConsumerSessionTargetRunner)](
            inputs = resolvedTargets,
            build = resolvedTarget =>
                val ((targetConfig, i), fqns) = resolvedTarget
                i -> ConsumerSessionTargetRunner.make(
                    sessionName = sessionName,
                    targetIndex = i,
                    pulsarClient = pulsarClient,
                    schemasByTopic = Map.empty,
                    sessionContextPool = sessionContextPool,
                    targetConfig = targetConfig,
                    nonPartitionedTopicFqns = fqns,
                    receiverQueueSize =
                        if orderingLayerNeeded then mergeReceiverQueueSizeFor(totalSessionStreams)
                        else receiverQueueSizeFor(fqns.size)
                )
            ,
            release = (_, target) => target.stop()
        ).toMap)

        // A session with nothing to consume from used to be accepted: `make` returned a runner with
        // an empty consumer map and ConsumerServiceImpl.createConsumer answered Code.OK, so the UI
        // showed a session in state `running` that could never deliver a message and never said
        // why. Reject it here, before any seeking, so the client gets a real non-OK status.
        if targets.isEmpty then
            Try(sessionContextPool.close())
            throw new IllegalArgumentException(
                s"Consumer session $sessionName has no enabled targets."
            )



        // DISTINCT: two enabled targets may legitimately select the same topic, and each keeps its
        // own consumer on it. What this vector feeds - schema lookup, the non-persistent rejection,
        // the Message-ID lookup and the single-topic fast path - all ask ABOUT a topic rather than
        // consume from it, and asking twice about one topic broke the Message-ID mode outright.
        val nonPartitionedTopicFqns = targets.values.flatMap(_.nonPartitionedTopicFqns).toVector.distinct
        val schemasByTopic = releasingSession(getSchemasByTopic(adminClient, nonPartitionedTopicFqns))

        targets = targets.map { case (targetIndex, target) =>
            targetIndex -> target.copy(schemasByTopic = schemasByTopic)
        }

        // The delivery order's timestamp, wired per listener so each keeps its own fallback
        // counter (a message without the selected timestamp uses publish time and is counted -
        // the client turns the first count into a remediation notice). Only an ordering session
        // pays any of this; as-received keeps the plain publish-time default untouched.
        if orderingLayerNeeded then
            targets.values.foreach { target =>
                val listener = target.consumerListener
                listener.orderingTimeOf = sessionConfig.deliveryOrderKey match
                    case DeliveryOrderKey.PublishTime => _.getPublishTime
                    case DeliveryOrderKey.BrokerPublishTime =>
                        msg =>
                            val stamped = msg.getBrokerPublishTime
                            if stamped.isPresent then stamped.get
                            else
                                listener.orderKeyFallbacks.incrementAndGet()
                                msg.getPublishTime
                    case DeliveryOrderKey.EventTime =>
                        msg =>
                            val eventTime = msg.getEventTime
                            if eventTime > 0 then eventTime
                            else
                                listener.orderKeyFallbacks.incrementAndGet()
                                msg.getPublishTime
            }

        val consumers = targets.values.flatMap(_.consumers).map(_._2).toVector

        val startFromPlan = releasingSession {
            handleStartFrom(
                startFrom = sessionConfig.startFrom,
                consumers = consumers,
                adminClient = adminClient,
                pulsarClient = pulsarClient,
                nonPartitionedTopicFqns = nonPartitionedTopicFqns,
                deliveryOrdering = sessionConfig.messageDeliveryOrder
            )
        }

        // Arm the start-from discard ONCE, here: the seek has happened and no consumer has been
        // resumed yet. `resume` deliberately knows nothing about it - re-arming on every play would
        // skip a fresh batch of messages each time the session is paused and resumed.
        //
        // A SharedTotal plan is ONE counter over the merged stream, so every target must get the
        // SAME instance; a PerTopic plan gets a fresh counter per target, because two targets may
        // select the same topic and each has its own consumer to correct.
        val sharedDiscard = startFromPlan.discard match
            case StartFromDiscardPlan.SharedTotal(n) => StartFromDiscard.shared(n)
            case _                                   => StartFromDiscard.none

        // The global ordering layer is ONE object for the whole session for the same reason a
        // SharedTotal counter is: "the globally-first n" and "the globally-last n" are counted over
        // every target's stream at once, so a layer per target would answer n per target.
        val ordering = StartFromOrdering.make[HeldMessage](
            startFromPlan.ordering,
            // The byte half of the merge's memory watermarks: what one held message costs.
            payloadBytesOf = held => scala.util.Try(Option(held.message.getData).map(_.length.toLong).getOrElse(0L)).getOrElse(0L)
        )

        targets.values.foreach { target =>
            target.consumerListener.startFromDiscard =
                StartFromDiscard.forTarget(startFromPlan.discard, sharedDiscard, target.nonPartitionedTopicFqns)
            target.consumerListener.startFromOrdering = ordering
        }

        ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = sessionConfig,
            schemasByTopic = schemasByTopic,
            sessionContextPool = sessionContextPool,
            targets = targets,
            grpcResponseObserver = None,
            adminClient = Some(adminClient)
        )
