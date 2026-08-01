package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.value_projections.ValueProjectionList
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Modifier, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.{AtomicBoolean, AtomicLong}
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.jdk.CollectionConverters.*

/** THE TWO THINGS THAT DECIDE WHETHER A DELIVERED MESSAGE IS KEPT, AND WHAT EACH OF THEM COSTS WHEN
  * IT IS WRONG.
  *
  * `ConsumerListener.decide` is entered from one Pulsar listener thread per physical topic, for
  * every message the broker hands over. It reads two pieces of shared state:
  *
  *   - THE PAUSE GATE, written from gRPC threads. A stale read here delivers a message into a
  *     session the user has paused.
  *   - THE START-FROM BUDGET, which is the user's "skip the first n". Claiming one costs a message
  *     - the message is acknowledged into nothing and nobody ever sees it - so a claim that is not
  *     matched by a real acknowledgment means Pulsar redelivers a message whose budget is already
  *     spent, and the session shows a message the user asked to skip while reporting that exactly n
  *     were skipped.
  *
  * Everything here drives the real `received`/`decide`/`pause` paths with proxy consumers and
  * hand-built messages. Only the broker is replaced.
  */
object listenerGateAndBudgetTest extends ZIOSpecDefault:

    private val p0 = "persistent://public/default/gate-partition-0"

    private def message(label: String, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(1_000L + entryId)
        md.setPartitionKey(label)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"label":"$label"}""".getBytes("UTF-8")), Schema.BYTES, p0)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** A consumer that can lose its connection and can refuse an acknowledgment, both of which real
      * brokers do. `acknowledged` records only the acknowledgments that actually SUCCEEDED - which
      * is the whole question here.
      */
    private final class RecordingConsumer(onPause: () => Unit = () => ()):
        val connected = AtomicBoolean(true)
        val acknowledgeFails = AtomicBoolean(false)
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        val paused = AtomicBoolean(false)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => p0
                        case "getConsumerName" => "cs-gate-0"
                        case "isConnected"     => java.lang.Boolean.valueOf(connected.get)
                        case "pause" =>
                            paused.set(true)
                            onPause()
                            null
                        case "resume" => null
                        case "acknowledgeAsync" =>
                            if acknowledgeFails.get then CompletableFuture.failedFuture(new RuntimeException("broker refused the acknowledgment"))
                            else
                                acknowledged.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                                CompletableFuture.completedFuture(null)
                        case "negativeAcknowledge" =>
                            handedBack.add(args(0).asInstanceOf[PulsarMessage[Array[Byte]]].getKey)
                            null
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(p0.hashCode)
                        case "toString" => "proxy-consumer(gate)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    private def openListener(): (ConsumerListener, ConcurrentLinkedQueue[String]) =
        val delivered = ConcurrentLinkedQueue[String]()
        val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg => { delivered.add(msg.getKey); () }))
        listener.startAcceptingNewMessages()
        (listener, delivered)

    private def targetRunner(consumerListener: ConsumerListener, consumer: Consumer[Array[Byte]]): ConsumerSessionTargetRunner =
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
            consumers = Map(p0 -> consumer),
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private val budgetSuite = suite("a skip budget is spent by an ACKNOWLEDGED drop, and by nothing else")(
        test("a drop the consumer could not acknowledge is handed back, and the budget survives it") {
            // THE defect. `decide` claimed the budget and the acknowledgment helper then did
            // NOTHING when the consumer was disconnected. Pulsar redelivered the message, the
            // (already spent) budget let it through, and a session asked to skip one message showed
            // it - while reporting that the skip had completed.
            val (listener, delivered) = openListener()
            listener.startFromDiscard = StartFromDiscard.shared(1)
            val consumer = RecordingConsumer()
            consumer.connected.set(false)

            listener.received(consumer.consumer, message("m1", 1L))
            val afterDisconnect = listener.startFromDiscard.remaining

            // The connection comes back and the broker redelivers what was never acknowledged.
            consumer.connected.set(true)
            listener.received(consumer.consumer, message("m1", 1L))

            assertTrue(
                afterDisconnect == 1L,
                consumer.handedBack.asScala.toVector == Vector("m1"),
                delivered.asScala.toVector.isEmpty,
                consumer.acknowledged.asScala.toVector == Vector("m1"),
                listener.startFromDiscard.remaining == 0L
            ) ?? (s"budget after the disconnected delivery=$afterDisconnect handedBack=${consumer.handedBack.asScala.toVector} " +
                s"delivered=${delivered.asScala.toVector} acknowledged=${consumer.acknowledged.asScala.toVector}")
        },
        test("a drop whose ack FAILS stays decided: the unit stays spent on THAT message, its redelivery is paperwork") {
            // The old contract REFUNDED the unit, which kept the count right and the set wrong: the
            // refunded unit was spent on the NEXT message, and the redelivered original - the one
            // the user asked to skip - was shown. Now the decision stands: budget spent once, on
            // m1; m2 flows through untouched by that unit; m1's redelivery is acknowledged and
            // shown to nobody.
            val (listener, delivered) = openListener()
            listener.startFromDiscard = StartFromDiscard.shared(1)
            val consumer = RecordingConsumer()
            consumer.acknowledgeFails.set(true)

            listener.received(consumer.consumer, message("m1", 1L))
            val afterFailedAck = listener.startFromDiscard.remaining
            val retriesArmed = listener.awaitingAckRetryCount

            consumer.acknowledgeFails.set(false)
            // The next NEW message arrives before m1's redelivery - with a refund, this one would
            // have consumed the returned unit and m1 would later be shown.
            listener.received(consumer.consumer, message("m2", 2L))
            listener.received(consumer.consumer, message("m1", 1L))

            assertTrue(
                afterFailedAck == 0L,
                retriesArmed == 1,
                delivered.asScala.toVector == Vector("m2"),
                consumer.acknowledged.asScala.toVector == Vector("m2", "m1"),
                listener.awaitingAckRetryCount == 0
            ) ?? (s"budget after failed ack=$afterFailedAck retriesArmed=$retriesArmed delivered=${delivered.asScala.toVector} " +
                s"acknowledged=${consumer.acknowledged.asScala.toVector} retriesLeft=${listener.awaitingAckRetryCount}")
        },
        test("a DELIVERED message whose ack fails is not shown twice when the broker redelivers it") {
            // Same mechanism, other outcome: the delivery happened, only the paperwork failed. The
            // redelivery must be acknowledged and NOT rendered again.
            val (listener, delivered) = openListener()
            val consumer = RecordingConsumer()
            consumer.acknowledgeFails.set(true)

            listener.received(consumer.consumer, message("m1", 1L))
            consumer.acknowledgeFails.set(false)
            listener.received(consumer.consumer, message("m1", 1L))

            assertTrue(
                delivered.asScala.toVector == Vector("m1"),
                consumer.acknowledged.asScala.toVector == Vector("m1"),
                listener.awaitingAckRetryCount == 0
            ) ?? (s"delivered=${delivered.asScala.toVector} acknowledged=${consumer.acknowledged.asScala.toVector}")
        },
        test("exactly n UNIQUE messages are skipped when every acknowledgment lands") {
            // The control: nothing above may cost the ordinary path its exactness.
            val (listener, delivered) = openListener()
            listener.startFromDiscard = StartFromDiscard.shared(3)
            val consumer = RecordingConsumer()

            (1 to 5).foreach(i => listener.received(consumer.consumer, message(s"m$i", i.toLong)))

            assertTrue(
                delivered.asScala.toVector == Vector("m4", "m5"),
                consumer.acknowledged.asScala.toVector == Vector("m1", "m2", "m3", "m4", "m5"),
                consumer.handedBack.asScala.toVector.isEmpty,
                listener.startFromDiscard.remaining == 0L
            ) ?? s"delivered=${delivered.asScala.toVector} acknowledged=${consumer.acknowledged.asScala.toVector}"
        },
        test("a DELIVERED message on a disconnected consumer is handed back rather than shown unacknowledged") {
            // Nothing may be decided about a message the consumer cannot answer for. Handing it
            // back is the only outcome that neither loses it nor double-counts it.
            val (listener, delivered) = openListener()
            val consumer = RecordingConsumer()
            consumer.connected.set(false)

            listener.received(consumer.consumer, message("m1", 1L))

            assertTrue(delivered.asScala.toVector.isEmpty, consumer.handedBack.asScala.toVector == Vector("m1"))
        }
    )

    private val gateSuite = suite("the pause gate")(
        test("PAUSE CLOSES THE GATE BEFORE THE CONSUMERS STOP DELIVERING") {
            // Order matters and it was the wrong way round: the consumers were paused first and the
            // gate closed afterwards, so every callback the client had already buffered was
            // delivered into a session the user had just paused. Closing the gate first makes the
            // window empty by construction.
            val (listener, _) = openListener()
            val gateClosedWhenPaused = AtomicBoolean(false)
            val consumer = RecordingConsumer(onPause = () => gateClosedWhenPaused.set(listener.decide(p0, canAcknowledge = true) == ConsumerListener.Action.Reject))
            val runner = targetRunner(listener, consumer.consumer)

            runner.pause()

            assertTrue(
                consumer.paused.get,
                gateClosedWhenPaused.get,
                listener.decide(p0, canAcknowledge = true) == ConsumerListener.Action.Reject
            ) ?? "the consumer was paused while the listener was still accepting messages"
        },
        test("a paused listener rejects rather than consuming the skip budget") {
            // A rejected message is coming back, so counting it as skipped would skip it twice.
            val (listener, _) = openListener()
            listener.startFromDiscard = StartFromDiscard.shared(2)
            listener.stopAcceptingNewMessages()

            val action = listener.decide(p0, canAcknowledge = true)

            assertTrue(action == ConsumerListener.Action.Reject, listener.startFromDiscard.remaining == 2L)
        },
        test("THE GATE CARRIES A HAPPENS-BEFORE - it is read by listener threads and written by gRPC threads") {
            // A plain `var Boolean` has no memory-ordering guarantee at all, so a Pulsar listener
            // thread was entitled to go on seeing "accepting" indefinitely after an RPC thread had
            // paused the session. A data race cannot be observed reliably from a test, so the
            // MECHANISM is pinned instead: reverting the field to a plain var fails this.
            val field = classOf[ConsumerListener].getDeclaredFields.find(_.getName.toLowerCase.contains("acceptingnewmessages"))
            val isSafe = field.exists(f =>
                classOf[java.util.concurrent.atomic.AtomicBoolean].isAssignableFrom(f.getType) || Modifier.isVolatile(f.getModifiers)
            )
            assertTrue(field.isDefined, isSafe) ??
                s"the pause gate is ${field.map(f => s"${f.getType.getSimpleName} (volatile=${Modifier.isVolatile(f.getModifiers)})")}"
        }
    )

    private val ackLoggingSuite = suite("a merge-path acknowledgment failure is LOGGED, as the scope note promises")(
        test("a DELIVERED message whose acknowledgment fails leaves a warning naming the consumer") {
            // `acknowledgeDrop`'s scope note says a failed merge-path acknowledgment "is logged" -
            // but `acknowledge` (the Deliver/merge-Drop path) discarded the future outright, so an
            // unacknowledged, soon-to-be-redelivered message left no trace at all.
            val appender = new ch.qos.logback.core.read.ListAppender[ch.qos.logback.classic.spi.ILoggingEvent]()
            appender.start()
            // SLF4J hands a SubstituteLogger to callers that arrive while the backend is still
            // initializing; under parallel suite execution the first fetch can land in that window
            // and the WARN under test is replayed to the REAL logger later - without this appender.
            // Re-fetch until the logback binding is in place (the same guard libraryScanTest uses).
            var slf4jLogger = org.slf4j.LoggerFactory.getLogger(classOf[ConsumerListener].getName)
            var attempts = 0
            while !slf4jLogger.isInstanceOf[ch.qos.logback.classic.Logger] && attempts < 500 do
                Thread.sleep(2)
                slf4jLogger = org.slf4j.LoggerFactory.getLogger(classOf[ConsumerListener].getName)
                attempts += 1
            val logbackLogger = slf4jLogger.asInstanceOf[ch.qos.logback.classic.Logger]
            logbackLogger.addAppender(appender)
            try
                val (listener, delivered) = openListener()
                val consumer = RecordingConsumer()
                consumer.acknowledgeFails.set(true)

                listener.received(consumer.consumer, message("m1", 1L))

                val warned = appender.list.asScala.toVector
                    .filter(_.getLevel == ch.qos.logback.classic.Level.WARN)
                    .map(_.getFormattedMessage)
                assertTrue(
                    delivered.asScala.toVector == Vector("m1"),
                    // The wording changed with the decision-stands contract; what the note promises
                    // is a WARN that names the consumer and says the ack failed.
                    warned.exists(m => m.contains("decision stands") && m.contains("acknowledgment failed") && m.contains("cs-gate-0"))
                ) ?? s"delivered=${delivered.asScala.toVector} warned=$warned"
            finally logbackLogger.detachAppender(appender)
        }
    )

    def spec = suite(this.getClass.toString)(budgetSuite, gateSuite, ackLoggingSuite)
