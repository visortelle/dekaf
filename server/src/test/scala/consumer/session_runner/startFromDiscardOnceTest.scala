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
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.jdk.CollectionConverters.*

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
            pauseArbiters = Map.empty,
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    /** Drives the production `resume` with no-op callbacks - the same call `ConsumerSessionRunner`
      * makes on every play. */
    private def resume(runner: ConsumerSessionTargetRunner): Unit =
        runner.resume(
            onNext = (_, _, _, _, _) => (),
            isDebug = false,
            incrementNumMessageProcessed = () => (),
            onStartFromDiscardProgress = () => (),
            admitDelivery = _ => DeliveryAdmission.Prepare
        )

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
        test("the MERGE-owned skip budget survives pause/resume: no re-arm, no double count, no gate leak") {
            // The branch's MAIN path. On a multi-stream skip-n the listener's own discard is NONE
            // and the budget lives inside the global merge (`handleStartFrom` arms
            // StartFromDiscardPlan.Nothing + GlobalSkip) - so every exactly-once case above
            // drives the WRONG counter for it. Three claims, each of which held only by
            // inspection until now: a pause/resume cycle leaves the merge's budget untouched
            // (resume never touches `startFromOrdering`), a message the closed gate rejects
            // never reaches the merge and so cannot consume the budget, and after the cycle the
            // skip still drops exactly the globally-first n - the same SET a pause-free run
            // would have dropped.
            val consumerName = "cs-discard-once-0"
            val p0 = "persistent://public/default/discard-once-p0"
            val p1 = "persistent://public/default/discard-once-p1"

            final class RecordingConsumer(topicFqn: String):
                val acknowledged = ConcurrentLinkedQueue[String]()
                val handedBack = ConcurrentLinkedQueue[String]()
                val consumer: Consumer[Array[Byte]] =
                    val handler = new InvocationHandler:
                        override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                            method.getName match
                                case "getTopic"        => topicFqn
                                case "getConsumerName" => consumerName
                                case "isConnected"     => java.lang.Boolean.TRUE
                                case "acknowledgeAsync" =>
                                    acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                                    CompletableFuture.completedFuture(null)
                                case "negativeAcknowledge" =>
                                    handedBack.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                                    null
                                case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                                case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                                case "toString" => s"proxy-consumer($topicFqn)"
                                case _          => null
                    Proxy
                        .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                        .asInstanceOf[Consumer[Array[Byte]]]

            def message(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
                val md = new MessageMetadata()
                md.setPublishTime(publishTime)
                md.setPartitionKey(key)
                val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
                msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
                msg

            val delivered = ConcurrentLinkedQueue[String]()
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg => { delivered.add(msg.getKey); () }))
            // The production resume rewires the target handler onto the full pipeline; this test
            // asserts on the raw delivery SET, so the recorder is reinstalled after each resume.
            def recordDeliveries(): Unit =
                l.targetMessageHandler.onNext = msg => { delivered.add(msg.getKey); () }
            // The listener-owned counter stays NONE - the merge owns the budget.
            val armed = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(
                    3,
                    Vector(
                        StartFromStream(startFromStreamId(consumerName, p0), EntryPosition(1L, 9L, -1, 1)),
                        StartFromStream(startFromStreamId(consumerName, p1), EntryPosition(1L, 9L, -1, 1))
                    )
                )
            )
            l.startFromOrdering = armed
            val runner = targetRunner(l, Vector(p0, p1))
            val c0 = RecordingConsumer(p0)
            val c1 = RecordingConsumer(p1)

            resume(runner)
            recordDeliveries()
            // Publish times interleave the streams: the globally-first 3 are a1(10), b1(20), a2(30).
            l.received(c0.consumer, message(p0, "a1", 10L, 0L)) // held: p1 is blind
            l.received(c1.consumer, message(p1, "b1", 20L, 0L)) // resolves: drop a1; p0 blind
            l.received(c0.consumer, message(p0, "a2", 30L, 1L)) // resolves: drop b1; p1 blind
            val remainingMidSkip = l.effectiveDiscard.remaining

            runner.pause()
            // The closed gate rejects b2 BEFORE the merge ever sees it: handed back, budget intact.
            l.received(c1.consumer, message(p1, "b2", 40L, 1L))
            val remainingWhilePaused = l.effectiveDiscard.remaining
            val handedBackWhilePaused = c1.handedBack.asScala.toVector

            resume(runner)
            recordDeliveries()
            val sameOrderingAfterResume = l.startFromOrdering eq armed
            val remainingAfterResume = l.effectiveDiscard.remaining

            // The broker redelivers the rejected b2; the skip finishes on a2 and b2 is the first
            // message the user sees, then the inert merge passes a3 straight through.
            l.received(c1.consumer, message(p1, "b2", 40L, 1L))
            l.received(c0.consumer, message(p0, "a3", 50L, 2L))

            assertTrue(
                remainingMidSkip == 1L,
                remainingWhilePaused == 1L, // the gate leak would have burned the last unit here
                handedBackWhilePaused == Vector("b2"),
                sameOrderingAfterResume, // resume must not re-arm (or swap) the ordering layer
                remainingAfterResume == 1L, // and must not refill or spend the budget
                // The cut is EXACTLY the globally-first 3 by publish time - a1, b1, a2 - however
                // the pause interleaved; b2 and a3 are what the user sees, in order.
                delivered.asScala.toVector == Vector("b2", "a3"),
                c0.acknowledged.asScala.toVector == Vector("a1", "a2", "a3"),
                c1.acknowledged.asScala.toVector == Vector("b1", "b2"),
                l.effectiveDiscard.remaining == 0L,
                l.startFromDiscard.remaining == 0L // the listener-owned counter never took part
            ) ?? (s"midSkip=$remainingMidSkip paused=$remainingWhilePaused afterResume=$remainingAfterResume " +
                s"delivered=${delivered.asScala.toVector} acked0=${c0.acknowledged.asScala.toVector} " +
                s"acked1=${c1.acknowledged.asScala.toVector}")
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
