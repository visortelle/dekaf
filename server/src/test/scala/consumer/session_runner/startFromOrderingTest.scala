package consumer.session_runner

import java.util.concurrent.atomic.AtomicLong

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.{ConsumerSessionStartFrom, DateTime, DateTimeUnit, EarliestMessage, LatestMessage, MessageId, NthMessageAfterEarliest, NthMessageBeforeLatest, ApproximateDataPosition, ApproximateTimePosition, RelativeDateTime}
import _root_.consumer.value_projections.ValueProjectionList
import org.apache.pulsar.client.impl.MessageIdImpl
import zio.test.*

/** Wiring the two GLOBAL start-from modes into the session: which delivery stream a message belongs
  * to, when that stream has run out of the messages it held at session start, and where the client
  * reads the skip's progress from once the merge owns the counting.
  *
  * `StartFromOrdering` is generic in what it holds, so the whole routing is driven here with real
  * Pulsar message ids and plain payloads - no broker, no mock. The layer never looks inside what it
  * holds; it only decides drop-or-deliver and hands the payload back.
  */
object startFromOrderingTest extends ZIOSpecDefault:

    private val p0 = "persistent://public/default/ord-partition-0"
    private val p1 = "persistent://public/default/ord-partition-1"
    private val consumerName = "cs-ordering-0"
    private val otherConsumerName = "cs-ordering-1"

    private def id(entryId: Long): MessageIdImpl = new MessageIdImpl(1L, entryId, 0)

    /** A stream whose backlog ended on `lastEntryId`. */
    private def stream(consumer: String, topicFqn: String, lastEntryId: Long): StartFromStream =
        StartFromStream(startFromStreamId(consumer, topicFqn), EntryPosition(1L, lastEntryId, -1, 1))

    private def emptyStream(consumer: String, topicFqn: String): StartFromStream =
        StartFromStream(startFromStreamId(consumer, topicFqn), EntryPosition.empty)

    extension (ordering: StartFromOrdering[String])
        /** One delivered message, as the listener hands it over. */
        def deliver(consumer: String, topicFqn: String, publishTime: Long, entryId: Long, value: String): Vector[(String, StartFromOutcome)] =
            ordering.offer(consumer, topicFqn, publishTime, id(entryId), value)

        def delivered(resolved: Vector[(String, StartFromOutcome)]): Vector[String] =
            resolved.collect { case (value, StartFromOutcome.Deliver) => value }

    private val planSuite = suite("which sessions get a global ordering layer at all")(
        test("SKIP-N gets one as soon as there is more than one stream") {
            assertTrue(
                needsGlobalOrdering(NthMessageAfterEarliest(n = 5), streamCount = 2),
                needsGlobalOrdering(NthMessageAfterEarliest(n = 5), streamCount = 3)
            )
        },
        test("LATEST-N NEVER GETS ONE - it resolves its cut before anything is delivered") {
            // Changed expectation, deliberately: latest-n used to arm a top-n heap of DELIVERED
            // messages here, which made a session's memory a number the user typed and let live
            // traffic evict the historical tail. The cut now comes from entry metadata
            // (`resolveLatestN`), so there is nothing left to hold and nothing left to reorder.
            val armed = Vector(1, 2, 3, 50).filter(streams => needsGlobalOrdering(NthMessageBeforeLatest(n = 5), streams))
            assertTrue(armed.isEmpty) ?? s"latest-n asked for a buffering layer at stream counts $armed"
        },
        test("a single stream keeps the FAST PATH - the ordinary non-partitioned session pays nothing") {
            // One log is already in append order: the head-drop counter is exact on its own, and a
            // merge would hold messages for no reason.
            assertTrue(
                !needsGlobalOrdering(NthMessageAfterEarliest(n = 5), streamCount = 1),
                !needsGlobalOrdering(NthMessageAfterEarliest(n = 5), streamCount = 0)
            )
        },
        test("n = 0 needs no ordering, however many streams there are") {
            // A negative n is REFUSED at the trust boundary before this gate is reached (see
            // `startFromCountRejectionReason`), so it can no longer arrive here from a request. The
            // gate stays defensive about it anyway - answering "no ordering" is the safe reading if
            // one ever did.
            assertTrue(
                !needsGlobalOrdering(NthMessageAfterEarliest(n = 0), streamCount = 4),
                !needsGlobalOrdering(NthMessageAfterEarliest(n = -3), streamCount = 4)
            )
        },
        test("APPROXIMATE POSITION stays per partition, and every exact-seek mode gets nothing") {
            // Deliberate, not an oversight: a count of n is reached by streaming n messages and
            // stopping, but a proportion of the merged stream is only known once all of it has been
            // measured, which is O(topic) at any n.
            val exactSeekModes: Vector[ConsumerSessionStartFrom] = Vector(
                ApproximateDataPosition(fraction = 0.6),
                ApproximateTimePosition(fraction = 0.6),
                EarliestMessage(),
                LatestMessage(),
                DateTime(dateTime = java.time.Instant.EPOCH),
                RelativeDateTime(value = 1, unit = DateTimeUnit.Hour, isRoundedToUnitStart = false),
                MessageId(messageIdBytes = Array.empty)
            )
            val wrongly = exactSeekModes.filter(mode => needsGlobalOrdering(mode, streamCount = 4))
            assertTrue(wrongly.isEmpty) ?? s"these modes asked for a global ordering they must not have: ${wrongly.map(_.getClass.getSimpleName)}"
        },
        test("only skip-n gets the streaming MERGE, and only it") {
            val streams = Vector(stream(consumerName, p0, 9), stream(consumerName, p1, 9))
            val skip = globalOrderingPlanFor(NthMessageAfterEarliest(n = 7), streams)
            val latest = globalOrderingPlanFor(NthMessageBeforeLatest(n = 7), streams)
            assertTrue(
                skip == StartFromOrderingPlan.GlobalSkip(7, streams),
                latest == StartFromOrderingPlan.PassThrough
            ) ?? s"skip=$skip latest=$latest"
        },
        test("the fast path and the exact-seek modes build no layer at all") {
            val oneStream = Vector(stream(consumerName, p0, 9))
            val twoStreams = Vector(stream(consumerName, p0, 9), stream(consumerName, p1, 9))
            assertTrue(
                globalOrderingPlanFor(NthMessageAfterEarliest(n = 7), oneStream) == StartFromOrderingPlan.PassThrough,
                globalOrderingPlanFor(NthMessageBeforeLatest(n = 7), oneStream) == StartFromOrderingPlan.PassThrough,
                globalOrderingPlanFor(ApproximateDataPosition(fraction = 0.6), twoStreams) == StartFromOrderingPlan.PassThrough,
                globalOrderingPlanFor(ApproximateTimePosition(fraction = 0.6), twoStreams) == StartFromOrderingPlan.PassThrough,
                globalOrderingPlanFor(EarliestMessage(), twoStreams) == StartFromOrderingPlan.PassThrough
            )
        }
    )

    private val identitySuite = suite("which stream a message belongs to")(
        test("the same topic reached by two targets is TWO streams") {
            // Each enabled target has its OWN consumer on the topic and delivers it independently.
            // Merging both under the topic name would let one target's head hide the other's.
            assertTrue(startFromStreamId(consumerName, p0) != startFromStreamId(otherConsumerName, p0))
        },
        test("one target's two partitions are two streams") {
            assertTrue(startFromStreamId(consumerName, p0) != startFromStreamId(consumerName, p1))
        },
        test("a skip merge waits for BOTH targets on one topic before it decides") {
            // The regression this guards: keyed by topic alone, the second target's consumer would
            // overwrite the first's head and the merge would drop whichever arrived last.
            val ordering = StartFromOrdering.make[String](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(consumerName, p0, 5), stream(otherConsumerName, p0, 5)))
            )
            val afterFirst = ordering.deliver(consumerName, p0, 200L, 0, "later-target-a")
            val afterSecond = ordering.deliver(otherConsumerName, p0, 100L, 0, "earlier-target-b")
            assertTrue(
                afterFirst.isEmpty,
                // The drop spends the budget's only unit, so the OTHER target's held message is
                // released in the same resolution - the merge does not wait for a head it can no
                // longer use.
                afterSecond == Vector("earlier-target-b" -> StartFromOutcome.Drop, "later-target-a" -> StartFromOutcome.Deliver)
            ) ?? s"afterFirst=$afterFirst afterSecond=$afterSecond"
        }
    )

    private val backlogEndSuite = suite("when a stream stops being waited for")(
        test("a stream is waited for until its recorded last message arrives") {
            val ordering = StartFromOrdering.make[String](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(consumerName, p0, 9), stream(consumerName, p1, 0)))
            )
            // p1's whole backlog is entry 0, so its first delivery also ends it - and the merge can
            // decide without ever hearing from p1 again.
            val held = ordering.deliver(consumerName, p0, 100L, 0, "a1")
            val decided = ordering.deliver(consumerName, p1, 50L, 0, "b1")
            val next = ordering.deliver(consumerName, p0, 200L, 1, "a2")
            assertTrue(
                held.isEmpty,
                decided == Vector("b1" -> StartFromOutcome.Drop, "a1" -> StartFromOutcome.Deliver),
                next == Vector("a2" -> StartFromOutcome.Deliver)
            ) ?? s"held=$held decided=$decided next=$next"
        },
        test("a topic that was empty at session start is never waited for") {
            val ordering = StartFromOrdering.make[String](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(consumerName, p0, 9), emptyStream(consumerName, p1)))
            )
            assertTrue(ordering.deliver(consumerName, p0, 100L, 0, "a1") == Vector("a1" -> StartFromOutcome.Drop))
        },
        test("a stream the plan never heard of is never waited for") {
            // A topic that appears under the session's feet must not hang it. It delivers once and
            // goes quiet - if it had joined the waited-for set, everything after it would be held
            // forever. Two things keep it out of that set, deliberately: the waited-for set is built
            // from the PLAN, and an unknown stream reports itself at its backlog end.
            val ordering = StartFromOrdering.make[String](StartFromOrderingPlan.GlobalSkip(1, Vector(emptyStream(consumerName, p0))))
            val fromUnknown = ordering.deliver(consumerName, p1, 100L, 0, "surprise")
            val fromKnown = ordering.deliver(consumerName, p0, 200L, 0, "known")
            assertTrue(
                fromUnknown == Vector("surprise" -> StartFromOutcome.Drop),
                fromKnown == Vector("known" -> StartFromOutcome.Deliver),
                ordering.heldCount == 0
            ) ?? s"fromUnknown=$fromUnknown fromKnown=$fromKnown"
        },
        test("a partition that answered with MessageId.earliest is drained, not waited for") {
            // The end-to-end shape of the same bug: the plan records what getLastMessageIds said,
            // and for an empty partition that is MessageId.earliest.
            val emptyByEarliest =
                StartFromStream(startFromStreamId(consumerName, p1), EntryPosition.of(org.apache.pulsar.client.api.MessageId.earliest))
            val ordering = StartFromOrdering.make[String](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(consumerName, p0, 1), emptyByEarliest))
            )
            val a1 = ordering.deliver(consumerName, p0, 10L, 0, "a1")
            val a2 = ordering.deliver(consumerName, p0, 20L, 1, "a2")
            assertTrue(
                a1 == Vector("a1" -> StartFromOutcome.Drop),
                ordering.delivered(a2) == Vector("a2")
            ) ?? s"an empty partition held the merge back: a1=$a1 a2=$a2"
        }
    )

    private val passThroughSuite = suite("no reordering at all")(
        test("pass-through delivers every message untouched and holds nothing") {
            val ordering = StartFromOrdering.passThrough[String]
            val resolved = ordering.deliver(consumerName, p0, 10L, 0, "a1")
            assertTrue(resolved == Vector("a1" -> StartFromOutcome.Deliver), ordering.heldCount == 0, ordering.progressDiscard.isEmpty)
        },
        test("a plan with no ordering makes a pass-through") {
            val ordering = StartFromOrdering.make[String](StartFromOrderingPlan.PassThrough)
            assertTrue(ordering.progressDiscard.isEmpty, ordering.deliver(consumerName, p0, 10L, 0, "a1").size == 1)
        }
    )

    /** A listener already open for business. It starts CLOSED in production - nothing may be
      * consumed before the session is armed and a client has resumed it - and
      * `ConsumerSessionTargetRunner.resume` is what opens it. */
    private def listener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def targetRunner(consumerListener: ConsumerListener): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(p0))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(p0),
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = Map.empty,
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(targets: (Int, ConsumerSessionTargetRunner)*): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-ordering",
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = targets.toMap
        )

    private def skipOrdering(n: Long): StartFromOrdering[HeldMessage] =
        StartFromOrdering.make[HeldMessage](
            StartFromOrderingPlan.GlobalSkip(n, Vector(stream(consumerName, p0, 9), stream(consumerName, p1, 9)))
        )

    private val progressSuite = suite("where the client reads the skip's progress from")(
        test("a listener with no ordering reads its own head-drop counter") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(6)
            assertTrue(l.progressDiscard eq l.startFromDiscard)
        },
        test("a listener whose merge owns the counting reads the MERGE's counter") {
            // The merge decides the drops itself, so the listener's own counter is deliberately
            // empty - reading that one would report a session with nothing to skip.
            val l = listener()
            val ordering = skipOrdering(4)
            l.startFromOrdering = ordering
            assertTrue(l.progressDiscard.total == 4L, !(l.progressDiscard eq l.startFromDiscard))
        },
        test("a latest-n reports NOTHING - its head-drop is a seek correction, not a user skip") {
            // A latest-n session's only counter is the overshoot inside the single entry its
            // backward walk stopped on. That is the session reaching the requested position, not
            // the user skipping anything: reporting it told a client asking for the last 5 messages
            // that it was "skipping 95".
            val l = listener()
            l.startFromDiscard = StartFromDiscard.perTopic(Map(p0 -> 3L))
            assertTrue(l.progressDiscard.total == 0L, l.effectiveDiscard.remaining == 3L) ??
                s"latest-n reported a skip of ${l.progressDiscard.total}"
        },
        test("a session reports the merge's progress, and completes when its budget is spent") {
            val l = listener()
            val ordering = skipOrdering(4)
            l.startFromOrdering = ordering
            val runner = session(0 -> targetRunner(l))
            val budget = ordering.progressDiscard.get

            val atStart = runner.startFromProgress.map(p => (p.messagesSkipped, p.messagesToSkip, p.complete))
            budget.claim(p0)
            budget.claim(p1)
            val midway = runner.startFromProgress.map(p => (p.messagesSkipped, p.messagesToSkip, p.complete))
            budget.claim(p0)
            budget.claim(p1)
            val atEnd = runner.startFromProgress.map(p => (p.messagesSkipped, p.messagesToSkip, p.complete))

            assertTrue(
                atStart == Some((0L, 4L, false)),
                midway == Some((2L, 4L, false)),
                atEnd == Some((4L, 4L, true)),
                runner.remainingStartFromDiscard == 0L
            ) ?? s"atStart=$atStart midway=$midway atEnd=$atEnd"
        },
        test("two targets sharing one merge report its counter ONCE, not twice") {
            val ordering = skipOrdering(10)
            val first = listener()
            val second = listener()
            first.startFromOrdering = ordering
            second.startFromOrdering = ordering
            val runner = session(0 -> targetRunner(first), 1 -> targetRunner(second))
            assertTrue(runner.startFromProgress.map(_.messagesToSkip) == Some(10L))
        }
    )

    private val armOnceSuite = suite("the ordering layer is armed once")(
        test("resuming a target does not swap the ordering layer") {
            // The same regression the discard counter has: re-arming on play would start the merge
            // over and skip a fresh n every time the user hits it.
            val l = listener()
            val armed = skipOrdering(3)
            l.startFromOrdering = armed
            val runner = targetRunner(l)
            runner.resume(onNext = (_, _, _, _) => (), isDebug = false, incrementNumMessageProcessed = () => (), onStartFromDiscardProgress = () => ())
            runner.pause()
            runner.resume(onNext = (_, _, _, _) => (), isDebug = false, incrementNumMessageProcessed = () => (), onStartFromDiscardProgress = () => ())
            assertTrue(l.startFromOrdering eq armed)
        },
        test("a merge partway through a skip stays partway through it across a pause") {
            val l = listener()
            val ordering = skipOrdering(5)
            l.startFromOrdering = ordering
            val runner = targetRunner(l)
            ordering.progressDiscard.foreach(_.claim(p0))
            ordering.progressDiscard.foreach(_.claim(p0))
            runner.pause()
            runner.resume(onNext = (_, _, _, _) => (), isDebug = false, incrementNumMessageProcessed = () => (), onStartFromDiscardProgress = () => ())
            assertTrue(l.progressDiscard.remaining == 3L, l.progressDiscard.total == 5L)
        }
    ) @@ TestAspect.sequential

    /** THE FLOW-CONTROL WIRING, end to end at the ordering layer: the merge's desired-paused set
      * actually reaching (and releasing) the per-stream pause hooks. The merge-side watermark
      * logic is pinned in globalStartFromTest; THIS is the half nothing else exercises - e2e
      * counts never cross the 1000-message watermark.
      */
    private val flowControlWiringSuite = suite("the desired-paused set reaches the consumer hooks")(
        test("pause fires past the watermark, resume fires at the cut, and re-assertion heals an external resume") {
            // Two real streams: p1 never delivers (blind), p0 crosses the per-stream watermark.
            val ordering = StartFromOrdering.make[String](
                StartFromOrderingPlan.GlobalSkip(
                    1,
                    Vector(stream(consumerName, p0, 5_000), stream(otherConsumerName, p1, 5_000))
                )
            )
            var p0Paused = 0
            var p0Resumed = 0
            var p1Paused = 0
            ordering.registerStreamPauseHooks(startFromStreamId(consumerName, p0), () => p0Paused += 1, () => p0Resumed += 1)
            ordering.registerStreamPauseHooks(startFromStreamId(otherConsumerName, p1), () => p1Paused += 1, () => ())

            // Cross the production per-stream watermark (1000) while p1 stays silent.
            (1L to (startFromMergePauseStreamAt + 5L)).foreach { i =>
                ordering.deliver(consumerName, p0, 100L + i, i, s"a$i")
            }
            ordering.reconcileFlowControl()
            val pausedAtWatermark = p0Paused
            val blindNeverPaused = p1Paused

            // An EXTERNAL wholesale resume (user resume, or the rate limiter releasing its permit
            // hold) wakes every consumer behind this layer's back. The bookkeeping reset models
            // the runner's call; even without it, the next reconcile re-asserts the pause.
            ordering.resetAppliedFlowControl()
            ordering.reconcileFlowControl()
            val pausedAgainAfterExternalResume = p0Paused

            // p1 finally speaks: older than everything held, at its backlog end... its end is
            // entry 5000, so this message does NOT end its backlog - the budget's exhaustion is
            // what releases everything (skip 1: the drop finishes the merge).
            val atCut = ordering.deliver(otherConsumerName, p1, 1L, 0, "b1")
            ordering.settleIfDone()
            ordering.reconcileFlowControl()

            assertTrue(
                pausedAtWatermark >= 1,
                blindNeverPaused == 0,
                pausedAgainAfterExternalResume > pausedAtWatermark, // the drift self-heals
                atCut.head == ("b1" -> StartFromOutcome.Drop),
                atCut.count(_._2 == StartFromOutcome.Deliver) == (startFromMergePauseStreamAt + 5).toInt,
                p0Resumed >= 1 // the cut released the pause
            ) ?? s"pausedAtWatermark=$pausedAtWatermark again=$pausedAgainAfterExternalResume resumed=$p0Resumed p1Paused=$p1Paused atCutHead=${atCut.headOption}"
        }
    )

    def spec = suite(this.getClass.toString)(planSuite, identitySuite, backlogEndSuite, passThroughSuite, progressSuite, armOnceSuite, flowControlWiringSuite)
