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
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import zio.test.*

/** The start-from discard must be applied EXACTLY ONCE, at session start.
  *
  * This is the regression that seek + discard invites: the counter lives next to the pause/resume
  * machinery, and re-arming it on resume would silently skip a fresh n messages every time the user
  * hits play - a bug that only shows up on the second play and looks like data loss.
  *
  * Everything here runs offline. `ConsumerSessionTargetRunner.resume` and `pause` are the REAL
  * production methods; they are driven with an empty consumer map, so the only work left in them is
  * the listener state they touch - which is exactly what is under test. `ConsumerListener.decide` is
  * the real decision `received` makes, one call per delivered message.
  */
object startFromDiscardOnceTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/discard-once"

    /** A listener already open for business. It starts CLOSED in production - nothing may be
      * consumed before the session is armed and a client has resumed it - and
      * `ConsumerSessionTargetRunner.resume` is what opens it. */
    private def listener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def targetConfig(topicFqns: Vector[String]): ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = true,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = topicFqns)),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    private def targetRunner(consumerListener: ConsumerListener, topicFqns: Vector[String] = Vector(topicFqn)): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = targetConfig(topicFqns),
            nonPartitionedTopicFqns = topicFqns,
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = Map.empty,
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    /** Drives the production `resume` with no-op callbacks - the same call `ConsumerSessionRunner`
      * makes on every play. */
    private def resume(runner: ConsumerSessionTargetRunner): Unit =
        runner.resume(onNext = (_, _, _, _) => (), isDebug = false, incrementNumMessageProcessed = () => (), onStartFromDiscardProgress = () => ())

    /** How the listener would treat `count` consecutively delivered messages. */
    private def deliver(l: ConsumerListener, count: Int): Vector[ConsumerListener.Action] =
        Vector.fill(count)(l.decide(topicFqn, canAcknowledge = true))

    import ConsumerListener.Action.*

    def spec = suite(this.getClass.toString)(
        test("a listener that has never been resumed consumes NOTHING - it hands every message back") {
            // VERIFIED against Pulsar 3.2.1, and the reason this matters: the start-from set-up does
            // broker round trips (the backward entry walk, reading each topic's last message id)
            // while the session is still being built. If the listener accepted during that window it
            // would ACKNOWLEDGE messages into a message handler that is still a no-op, and a session
            // could swallow its whole backlog and then deliver nothing at all. A live 3-partition
            // "skip first 4" delivered ZERO of its 12 messages until this was closed.
            val fresh = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            fresh.startFromDiscard = StartFromDiscard.shared(3)
            val beforeAnyResume = deliver(fresh, 5)
            assertTrue(
                beforeAnyResume.forall(_ == Reject),
                fresh.startFromDiscard.remaining == 3L
            ) ?? s"an unarmed session consumed messages: $beforeAnyResume"
        },
        test("resuming the target is what opens the listener") {
            val fresh = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            fresh.startFromDiscard = StartFromDiscard.shared(1)
            val runner = targetRunner(fresh)
            val closed = deliver(fresh, 1)
            resume(runner)
            val open = deliver(fresh, 2)
            assertTrue(closed == Vector(Reject), open == Vector(Drop, Deliver))
        },
        test("the first n delivered messages are dropped and everything after them is delivered") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            assertTrue(deliver(l, 6) == Vector(Drop, Drop, Drop, Deliver, Deliver, Deliver), l.startFromDiscard.remaining == 0L)
        },
        test("resuming a target does not re-arm the discard") {
            // The regression: 3 to skip, 2 already skipped, then the user pauses and plays again.
            // Re-arming would drop 3 MORE messages here.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(3)
            val runner = targetRunner(l)

            resume(runner)
            val beforePause = deliver(l, 2)
            runner.pause()
            resume(runner)
            val afterResume = deliver(l, 3)

            assertTrue(
                beforePause == Vector(Drop, Drop),
                afterResume == Vector(Drop, Deliver, Deliver),
                l.startFromDiscard.remaining == 0L
            ) ?? "exactly 3 messages may ever be dropped, however many times the session is resumed"
        },
        test("a discard already spent stays spent across further pause/resume cycles") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(2)
            val runner = targetRunner(l)
            resume(runner)
            deliver(l, 2)

            val laterRounds = (1 to 3).flatMap { _ =>
                runner.pause()
                resume(runner)
                deliver(l, 2)
            }.toVector

            assertTrue(laterRounds.forall(_ == Deliver), l.startFromDiscard.remaining == 0L) ??
                s"a spent discard was re-armed by resume: $laterRounds"
        },
        test("a message rejected while paused does not consume the discard") {
            // A paused listener nacks, and `negativeAckRedeliveryDelay(0)` brings the message
            // straight back. Counting it as dropped would skip n+1 messages.
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(2)
            val runner = targetRunner(l)

            resume(runner)
            val first = l.decide(topicFqn, canAcknowledge = true)
            runner.pause()
            val whilePaused = deliver(l, 5)
            resume(runner)
            val afterResume = deliver(l, 3)

            assertTrue(
                first == Drop,
                whilePaused.forall(_ == Reject),
                afterResume == Vector(Drop, Deliver, Deliver),
                l.startFromDiscard.remaining == 0L
            )
        },
        test("resume leaves the counter object itself alone") {
            // Belt and braces on the mechanism rather than the effect: `resume` must not swap the
            // discard for a fresh one either.
            val l = listener()
            val armed = StartFromDiscard.shared(5)
            l.startFromDiscard = armed
            val runner = targetRunner(l)
            resume(runner)
            runner.pause()
            resume(runner)
            assertTrue(l.startFromDiscard eq armed)
        },
        test("a session reports the remaining discard, counting a shared counter once") {
            // Two targets over one shared counter: summing per target would report double and make
            // "skipped exactly n" unassertable.
            val shared = StartFromDiscard.shared(4)
            val firstListener = listener()
            val secondListener = listener()
            firstListener.startFromDiscard = shared
            secondListener.startFromDiscard = shared

            val session = ConsumerSessionRunner(
                sessionName = "cs-discard",
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
                targets = Map(0 -> targetRunner(firstListener), 1 -> targetRunner(secondListener))
            )

            val atStart = session.remainingStartFromDiscard
            deliver(firstListener, 1)
            deliver(secondListener, 2)

            assertTrue(atStart == 4L, session.remainingStartFromDiscard == 1L)
        },
        test("a session sums per-topic counters across its targets") {
            val firstListener = listener()
            val secondListener = listener()
            firstListener.startFromDiscard = StartFromDiscard.perTopic(Map(topicFqn -> 3L))
            secondListener.startFromDiscard = StartFromDiscard.perTopic(Map(topicFqn -> 3L))

            val session = ConsumerSessionRunner(
                sessionName = "cs-discard-per-topic",
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
                targets = Map(0 -> targetRunner(firstListener), 1 -> targetRunner(secondListener))
            )

            deliver(firstListener, 1)
            assertTrue(session.remainingStartFromDiscard == 5L)
        }
    ) @@ TestAspect.sequential
