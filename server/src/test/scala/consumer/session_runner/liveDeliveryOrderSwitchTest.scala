package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.{ConsumerSessionConfig, MessageDeliveryOrder}
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.jdk.CollectionConverters.*

/** THE ONE THAT MATTERS: a Guaranteed session holding messages behind a silent stream, switched to
  * Best effort WHILE RUNNING, driven through the real listener and the real ordering layer.
  *
  * This is the whole promise of the operation, and each half of it is a separate way to lose data:
  *
  *   - the held set is RELEASED, not dropped - those messages were received and never
  *     acknowledged, and they exist nowhere but in the merge;
  *   - each of them is delivered EXACTLY ONCE, in the new order - a release that also let the
  *     barrier deliver, or that re-offered anything, would double them;
  *   - NOTHING IS RE-READ FROM THE BROKER - no seek, no redelivery request, no negative
  *     acknowledgment. That is precisely what recreating the session could not promise: it would
  *     re-resolve the start-from against a log that has moved and hand back a different set.
  *
  * Only the broker is replaced, by proxy consumers and hand-built `MessageImpl`s;
  * `ConsumerListener.received`, the guaranteed delivery pump and the ordering layer are the
  * production ones. The merge's clock is injected so "the session has been stalled for a while"
  * is a fact the test states rather than waits for.
  */
object liveDeliveryOrderSwitchTest extends ZIOSpecDefault:

    private val consumerName = "cs-live-order-0"
    private val graceMs = 500L

    private def p(i: Int): String = s"persistent://public/default/live-order-partition-$i"
    private def sid(i: Int): String = startFromStreamId(consumerName, p(i))

    private final class MonoClock:
        var monoMs: Long = 0L
        def advance(ms: Long): Unit = monoMs += ms

    /** A consumer that records what the session did to it. `reReads` is the point: anything that
      * would make the broker hand messages over again - a seek, a redelivery request, a negative
      * acknowledgment - is recorded, and the switch must produce none of them. */
    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val reReads = ConcurrentLinkedQueue[String]()

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        // A FAR-FUTURE recorded end for the guaranteed resume's boundary
                        // re-capture: these tests pin the mid-replay stall and its relax, so no
                        // stream may read as finished and no hand-built message as past-end.
                        case "getLastMessageIds" =>
                            java.util.List.of[org.apache.pulsar.client.api.MessageId](new MessageIdImpl(1L, 1_000_000L, -1))
                        case "acknowledgeAsync" =>
                            acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" =>
                            reReads.add(s"negativeAcknowledge/${args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey}")
                            null
                        case name if name.startsWith("seek") || name.startsWith("redeliver") =>
                            reReads.add(name)
                            null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => s"proxy-consumer($topicFqn)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def message(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** A listener wired to a GUARANTEED ordering layer over `streamCount` streams, with the
      * merge's clock in the test's hands. The `StartFromOrdering` constructor is package-visible
      * for exactly this: the real plumbing, an injected clock. */
    private final class Fixture(streamCount: Int):
        val clock = MonoClock()
        val delivered = ConcurrentLinkedQueue[String]()
        val merge = GlobalSkipMerge[HeldMessage](
            streamIds = Vector.tabulate(streamCount)(sid),
            drainedAtStart = Set.empty,
            discard = StartFromDiscard.shared(0),
            nowMs = () => clock.monoMs,
            policy = OrderingPolicy.GuaranteedOnly,
            graceMs = graceMs
        )
        val listener: ConsumerListener =
            val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg =>
                delivered.add(msg.getKey)
                ()
            ))
            l.startAcceptingNewMessages()
            l.startFromOrdering = new StartFromOrdering[HeldMessage](Some(merge), Map.empty)
            l
        val consumers: Vector[RecordingConsumer] = Vector.tabulate(streamCount)(i => RecordingConsumer(p(i)))
        private var nextEntryId = Map.empty[Int, Long].withDefaultValue(0L)

        def deliver(partition: Int, key: String, publishTime: Long): Unit =
            val entryId = nextEntryId(partition)
            nextEntryId = nextEntryId.updated(partition, entryId + 1)
            listener.received(consumers(partition).consumer, message(p(partition), key, publishTime, entryId))

        def deliveredKeys: Vector[String] = delivered.asScala.toVector
        def acknowledgedKeys: Vector[String] = consumers.flatMap(_.acknowledged.asScala.toVector)
        def reReads: Vector[String] = consumers.flatMap(_.reReads.asScala.toVector)

        /** The runner `behindTheRpc` installed, for the properties that live on it rather than on
          * the RPC's answer. */
        var installedRunner: Option[ConsumerSessionRunner] = None

        /** The same fixture behind the real RPC, so the whole path - `SetDeliveryOrder`, the
          * lifecycle lock, the runner, the listener, the merge - can be driven at once. */
        def behindTheRpc(sessionName: String): consumer.ConsumerServiceImpl =
            val consumersByTopic = Vector.tabulate(streamCount)(i => p(i) -> consumers(i).consumer).toMap
            val target = ConsumerSessionTargetRunner(
                targetIndex = 0,
                targetConfig = ConsumerSessionTarget(
                    isEnabled = true,
                    consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                    messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                    topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumersByTopic.keys.toVector)),
                    messageFilterChain = MessageFilterChain.empty,
                    coloringRuleChain = ColoringRuleChain.empty,
                    valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
                ),
                nonPartitionedTopicFqns = consumersByTopic.keys.toVector,
                schemasByTopic = Map.empty,
                sessionContextPool = ConsumerSessionContextPool(),
                consumers = consumersByTopic,
                pauseArbiters = consumersByTopic.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
                consumerListener = listener,
                stats = ConsumerSessionTargetStats(messageProcessed = java.util.concurrent.atomic.AtomicLong(0))
            )
            val runner = ConsumerSessionRunner(
                sessionName = sessionName,
                sessionConfig = ConsumerSessionConfig(
                    startFrom = EarliestMessage(),
                    targets = Vector.empty,
                    messageFilterChain = MessageFilterChain.empty,
                    coloringRuleChain = ColoringRuleChain.empty,
                    pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                    valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty),
                    messageDeliveryOrder = MessageDeliveryOrder.Guaranteed
                ),
                sessionContextPool = ConsumerSessionContextPool(),
                grpcResponseObserver = None,
                schemasByTopic = Map.empty,
                targets = Map(0 -> target)
            )
            val sessions = new java.util.concurrent.ConcurrentHashMap[consumer.ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put(sessionName, runner)
            installedRunner = Some(runner)
            consumer.ConsumerServiceImpl(sessions)

    def spec = suite(this.getClass.toString)(
        test("A LIVE SWITCH RELEASES THE HELD SET EXACTLY ONCE, IN BEST-EFFORT ORDER, WITHOUT TOUCHING THE BROKER") {
            // Three partitions, the third of which never publishes anything - the ordinary shape of
            // a Guaranteed stall. Arrival order is deliberately not publish-time order, so a
            // release that merely flushed the queues would show up immediately.
            val f = Fixture(streamCount = 3)
            f.deliver(0, "a-100", 100L)
            f.deliver(0, "a-300", 300L)
            f.deliver(1, "b-200", 200L)
            f.deliver(1, "b-400", 400L)
            f.deliver(0, "a-500", 500L)

            val deliveredWhileStalled = f.deliveredKeys
            val acknowledgedWhileStalled = f.acknowledgedKeys
            val heldBehindTheSilentStream = f.merge.heldCount

            // The session has been stalled long enough for the user to notice and click.
            f.clock.advance(graceMs + 1)
            f.listener.relaxDeliveryOrderToBestEffort()

            // And the barrier really is gone: pumping it again must produce nothing.
            f.listener.pumpGuaranteedDelivery()

            assertTrue(
                deliveredWhileStalled.isEmpty, // Guaranteed held everything behind partition 2
                acknowledgedWhileStalled.isEmpty, // and acknowledged nothing, so nothing was consumable
                heldBehindTheSilentStream == 5,
                f.deliveredKeys == Vector("a-100", "b-200", "a-300", "b-400", "a-500"),
                f.deliveredKeys.distinct == f.deliveredKeys, // exactly once
                f.acknowledgedKeys.sorted == f.deliveredKeys.sorted, // each released message was acknowledged
                f.reReads.isEmpty, // no seek, no redelivery request, no nack: nothing came from the broker again
                f.merge.heldCount == 0,
                !f.listener.startFromOrdering.isGuaranteedOrdering,
                f.listener.startFromOrdering.isContinuousOrdering // still ordered, just no longer no-escape
            ) ?? (s"deliveredWhileStalled=$deliveredWhileStalled held=$heldBehindTheSilentStream " +
                s"delivered=${f.deliveredKeys} acked=${f.acknowledgedKeys} reReads=${f.reReads}")
        },
        test("THROUGH THE REAL RPC: one SetDeliveryOrder call releases what the barrier was holding") {
            // The whole feature end to end - `SetDeliveryOrder` -> lifecycle lock -> runner ->
            // listener -> merge - on a session stalled behind a silent partition. No recreate, no
            // re-read, no duplicate, and the session's LIVE order really moved.
            val f = Fixture(streamCount = 2)
            val service = f.behindTheRpc("cs-live-order-rpc")
            f.deliver(0, "m-100", 100L)
            f.deliver(0, "m-200", 200L)
            val deliveredWhileStalled = f.deliveredKeys
            f.clock.advance(graceMs + 1)

            val response = Await.result(
                service.setDeliveryOrder(consumerPb.SetDeliveryOrderRequest(
                    consumerName = "cs-live-order-rpc",
                    messageDeliveryOrder = consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
                )),
                Duration(30, SECONDS)
            )

            assertTrue(
                deliveredWhileStalled.isEmpty,
                response.getStatus.code == com.google.rpc.code.Code.OK.value,
                f.deliveredKeys == Vector("m-100", "m-200"),
                f.acknowledgedKeys.sorted == Vector("m-100", "m-200"),
                f.reReads.isEmpty,
                f.merge.heldCount == 0,
                !f.listener.startFromOrdering.isGuaranteedOrdering
            ) ?? (s"status=${response.getStatus} delivered=${f.deliveredKeys} acked=${f.acknowledgedKeys} " +
                s"reReads=${f.reReads} held=${f.merge.heldCount}")
        },
        test("THE SWEEP CADENCE FOLLOWS THE POLICY, and a live relax re-arms it at the faster one") {
            // Guaranteed has no residence for a sweep tick to expire and never gives a stream up,
            // so it does not need the best-effort grace cadence - on a wide idle session that was
            // four whole-set scans a second producing nothing. But the relax is exactly what turns
            // the residence bound back on, and a session left on the slower cadence would then sit
            // up to a second past its grace instead of a quarter of one. So the switch re-arms.
            val f = Fixture(streamCount = 2)
            val service = f.behindTheRpc("cs-live-order-cadence")
            val runner = f.installedRunner.get
            val observer = new io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
                override def onNext(value: consumerPb.ResumeResponse): Unit = ()
                override def onError(t: Throwable): Unit = ()
                override def onCompleted(): Unit = ()

            runner.resume(observer, isDebug = false) // arms the continuous sweep
            val armedForGuaranteed = runner.armedSweepPeriodMs

            val response = Await.result(
                service.setDeliveryOrder(consumerPb.SetDeliveryOrderRequest(
                    consumerName = "cs-live-order-cadence",
                    messageDeliveryOrder = consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME
                )),
                Duration(30, SECONDS)
            )
            val armedAfterRelax = runner.armedSweepPeriodMs
            scala.util.Try(runner.stop())

            assertTrue(
                response.getStatus.code == com.google.rpc.code.Code.OK.value,
                armedForGuaranteed.contains(guaranteedSweepPeriodMs),
                armedForGuaranteed.contains(continuousSweepPeriodMs(guaranteed = true)),
                armedAfterRelax.contains(mergeTopicsSweepPeriodMs),
                runner.armedSweepPeriodMs.isEmpty // and stopping disarms it
            ) ?? (s"armedForGuaranteed=$armedForGuaranteed armedAfterRelax=$armedAfterRelax " +
                s"guaranteed=$guaranteedSweepPeriodMs bestEffort=$mergeTopicsSweepPeriodMs status=${response.getStatus}")
        },
        test("delivery CONTINUES under the new rules for messages that arrive after the switch") {
            val f = Fixture(streamCount = 2)
            f.deliver(0, "a-100", 100L) // partition 1 is silent: the barrier holds this
            f.clock.advance(graceMs + 1)
            f.listener.relaxDeliveryOrderToBestEffort()
            val releasedByTheSwitch = f.deliveredKeys

            // Arrivals after the switch are ordinary best-effort traffic: held for their own
            // residence while the peer is quiet, then delivered by the sweep - never held forever.
            f.deliver(0, "a-700", 700L)
            val heldWhileFresh = f.deliveredKeys
            f.clock.advance(graceMs + 1)
            f.listener.sweepStartFromStall()

            assertTrue(
                releasedByTheSwitch == Vector("a-100"),
                heldWhileFresh == Vector("a-100"),
                f.deliveredKeys == Vector("a-100", "a-700"),
                f.acknowledgedKeys.sorted == Vector("a-100", "a-700"),
                f.reReads.isEmpty,
                f.merge.heldCount == 0
            ) ?? s"released=$releasedByTheSwitch delivered=${f.deliveredKeys} acked=${f.acknowledgedKeys}"
        },
        test("switching twice releases nothing the second time - the operation is idempotent") {
            val f = Fixture(streamCount = 2)
            f.deliver(0, "a-100", 100L)
            f.deliver(0, "a-200", 200L)
            f.clock.advance(graceMs + 1)
            f.listener.relaxDeliveryOrderToBestEffort()
            val afterFirst = f.deliveredKeys
            f.listener.relaxDeliveryOrderToBestEffort()

            assertTrue(
                afterFirst == Vector("a-100", "a-200"),
                f.deliveredKeys == afterFirst,
                f.acknowledgedKeys.sorted == Vector("a-100", "a-200"), // one acknowledgment each, still
                f.reReads.isEmpty
            ) ?? s"afterFirst=$afterFirst delivered=${f.deliveredKeys} acked=${f.acknowledgedKeys}"
        },
        test("a switch while the INTAKE GATE is shut still neither loses nor doubles the held set") {
            // A pause closes the intake gate; the switch is a decision about what the session
            // ALREADY holds, so it releases that set down the ordinary delivery path (in a live
            // session, into the rate limiter, whose drain a pause has stopped). What must hold
            // either way: nothing released twice, nothing lost, nothing re-read - and the gate
            // itself is untouched, so a message arriving now is still handed straight back.
            val f = Fixture(streamCount = 2)
            f.deliver(0, "a-100", 100L)
            f.deliver(0, "a-200", 200L)
            f.listener.stopAcceptingNewMessages()
            f.clock.advance(graceMs + 1)
            f.listener.relaxDeliveryOrderToBestEffort()

            val afterSwitch = f.deliveredKeys
            val reReadsAfterSwitch = f.reReads
            f.deliver(1, "b-300", 300L) // the closed gate must refuse this

            assertTrue(
                afterSwitch == Vector("a-100", "a-200"),
                afterSwitch.distinct == afterSwitch,
                f.acknowledgedKeys.sorted == Vector("a-100", "a-200"),
                reReadsAfterSwitch.isEmpty,
                f.merge.heldCount == 0,
                f.deliveredKeys == afterSwitch, // the refused arrival reached nobody
                f.reReads == Vector("negativeAcknowledge/b-300") // it was handed back, as a pause promises
            ) ?? s"delivered=${f.deliveredKeys} acked=${f.acknowledgedKeys} reReads=${f.reReads}"
        }
    ) @@ TestAspect.sequential
