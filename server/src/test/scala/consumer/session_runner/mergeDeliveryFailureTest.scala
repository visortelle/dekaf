package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.jdk.CollectionConverters.*

/** WHAT HAPPENS WHEN THE CLIENT STREAM THROWS WHILE A RESOLVED BATCH IS BEING HANDED OUT.
  *
  * The global skip merge answers one `offer` with a BATCH of resolved messages - often several, and
  * belonging to different topics than the one just offered. Each pair in that batch was already
  * DEQUEUED from the merge, so it exists nowhere else. `StreamObserver.onNext` throws the instant the
  * client's call has been cancelled, and that throw used to escape the batch loop: every pair after
  * the failing one was neither delivered, acknowledged, nor handed back - and a NonDurable
  * subscription has no ackTimeout, so the broker never redelivered them while the runner lived.
  *
  * The real `received` path is driven here with proxy consumers and a handler that throws exactly as
  * a cancelled gRPC call does. Only the broker is replaced.
  */
object mergeDeliveryFailureTest extends ZIOSpecDefault:

    private val consumerName = "cs-merge-fail-0"
    private def p(i: Int): String = s"persistent://public/default/merge-fail-partition-$i"

    /** A consumer on `topicFqn` that records which messages it acknowledged and which it handed back
      * (negative-acknowledged). Both are the whole question here. `failFirstAck` makes the FIRST
      * acknowledgment fail asynchronously - the disconnect race the retry set exists for - while
      * every later one succeeds. */
    private final class RecordingConsumer(topicFqn: String, name: String = consumerName, failFirstAck: Boolean = false):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        private val failedOnce = java.util.concurrent.atomic.AtomicBoolean(false)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => name
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "acknowledgeAsync" =>
                            if failFirstAck && failedOnce.compareAndSet(false, true) then
                                CompletableFuture.failedFuture(new RuntimeException("broker went away mid-ack"))
                            else
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

    private def message(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** A stream whose backlog ends on `lastEntryId`. */
    private def stream(topicFqn: String, lastEntryId: Long, name: String = consumerName): StartFromStream =
        StartFromStream(startFromStreamId(name, topicFqn), EntryPosition(1L, lastEntryId, -1, 1))

    /** A listener whose delivery handler throws (exactly as a cancelled gRPC `onNext` does) for any
      * message whose key is in `throwOn`, and records the rest. */
    private def listenerThrowingOn(throwOn: Set[String], delivered: ConcurrentLinkedQueue[String]): ConsumerListener =
        val handler = ConsumerSessionTargetMessageHandler(onNext = msg =>
            if throwOn.contains(msg.getKey) then throw new io.grpc.StatusRuntimeException(io.grpc.Status.CANCELLED)
            delivered.add(msg.getKey)
            ()
        )
        val l = ConsumerListener(handler)
        l.startAcceptingNewMessages()
        l

    def spec = suite(this.getClass.toString)(
        test("a client-cancel throw mid-batch hands the rest back instead of losing them") {
            // A skip of 1 over three streams. Offering c1 resolves the WHOLE batch at once: drop c1
            // (globally earliest), then deliver b1 and a1 in order. The client has cancelled, so the
            // first delivery (b1) throws. a1 was already dequeued from the merge; without per-message
            // containment it is neither delivered nor acknowledged nor handed back, and never comes
            // back. With it, b1 is handed back for redelivery and a1 is still delivered.
            val delivered = ConcurrentLinkedQueue[String]()
            val listener = listenerThrowingOn(Set("b1"), delivered)
            listener.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(p(0), 5), stream(p(1), 5), stream(p(2), 0)))
            )
            val c0 = RecordingConsumer(p(0))
            val c1 = RecordingConsumer(p(1))
            val c2 = RecordingConsumer(p(2))

            // a1 and b1 are held (their streams are still waited for and blind); c1 ends p2's backlog
            // and unblocks the merge, resolving the batch. Pulsar catches a throw out of `received`
            // per message, so the test does too.
            scala.util.Try(listener.received(c0.consumer, message(p(0), "a1", 100L, 0L)))
            scala.util.Try(listener.received(c1.consumer, message(p(1), "b1", 90L, 0L)))
            scala.util.Try(listener.received(c2.consumer, message(p(2), "c1", 50L, 0L)))

            assertTrue(
                c2.acknowledged.asScala.toVector == Vector("c1"), // dropped by the skip
                c1.handedBack.asScala.toVector == Vector("b1"),    // its delivery threw -> handed back
                delivered.asScala.toVector == Vector("a1"),        // the message AFTER the throw still got out
                c0.acknowledged.asScala.toVector == Vector("a1")   // and was acknowledged
            ) ?? (s"acked(c2)=${c2.acknowledged.asScala.toVector} handedBack(c1)=${c1.handedBack.asScala.toVector} " +
                s"delivered=${delivered.asScala.toVector} acked(c0)=${c0.acknowledged.asScala.toVector}")
        },
        test("a Drop resolved by ANOTHER target's offer registers its failed ack where the redelivery arrives") {
            // Two TARGETS (two listeners) share one session-wide ordering. Target B's offer
            // resolves target A's held message as the drop; A's broker connection fumbles the ack.
            // The failed-ack id must be remembered on A - the redelivery arrives THERE - or A
            // re-decides it as a fresh message and, with the skip settled, DELIVERS the one
            // message the user asked to skip. The old code remembered it on the listener that
            // happened to process the batch: B.
            val deliveredA = ConcurrentLinkedQueue[String]()
            val deliveredB = ConcurrentLinkedQueue[String]()
            val listenerA = listenerThrowingOn(Set.empty, deliveredA)
            val listenerB = listenerThrowingOn(Set.empty, deliveredB)
            val shared = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(p(0), 5, name = "csA"), stream(p(1), 0, name = "csB")))
            )
            listenerA.startFromOrdering = shared
            listenerB.startFromOrdering = shared
            val cA = RecordingConsumer(p(0), name = "csA", failFirstAck = true)
            val cB = RecordingConsumer(p(1), name = "csB")

            // a1 (globally earliest) is held on A; b1 ends B's backlog and resolves the batch on
            // B's thread: drop a1, deliver b1. a1's ack fails asynchronously - the decision stands.
            scala.util.Try(listenerA.received(cA.consumer, message(p(0), "a1", 50L, 0L)))
            scala.util.Try(listenerB.received(cB.consumer, message(p(1), "b1", 100L, 0L)))
            // The broker redelivers the un-acked a1 to ITS listener: A.
            scala.util.Try(listenerA.received(cA.consumer, message(p(0), "a1", 50L, 0L)))

            assertTrue(
                deliveredA.asScala.toVector.isEmpty,              // the skipped message never reaches the user
                deliveredB.asScala.toVector == Vector("b1"),
                cA.handedBack.asScala.toVector == Vector("a1"),   // the failed ack handed it back once
                cA.acknowledged.asScala.toVector == Vector("a1"), // the redelivery is finalized silently
                listenerA.awaitingAckRetryCount == 0,             // and the paperwork is closed on A...
                listenerB.awaitingAckRetryCount == 0              // ...not parked forever on B
            ) ?? (s"deliveredA=${deliveredA.asScala.toVector} deliveredB=${deliveredB.asScala.toVector} " +
                s"handedBack(cA)=${cA.handedBack.asScala.toVector} acked(cA)=${cA.acknowledged.asScala.toVector} " +
                s"retryA=${listenerA.awaitingAckRetryCount} retryB=${listenerB.awaitingAckRetryCount}")
        }
    )
