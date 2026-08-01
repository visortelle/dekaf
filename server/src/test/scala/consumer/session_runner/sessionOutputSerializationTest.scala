package consumer.session_runner

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
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.{AtomicBoolean, AtomicInteger, AtomicLong, AtomicReference}
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.jdk.CollectionConverters.*

/** THE SESSION'S OUTPUT PATH IS SHARED AND ITS INPUTS ARE NOT.
  *
  * Pulsar delivers each physical topic on its own listener thread. Everything downstream of that is
  * shared by the whole session: one global ordering layer that decides the delivery ORDER, one
  * gRPC `StreamObserver` that every response leaves through, and one start-from budget.
  *
  * Three things were unserialized, and each loses something different:
  *
  *   - the ordering layer's lock was released before the messages it resolved were processed, so a
  *     later message could overtake an earlier one and stateful filters and projections saw them in
  *     a different order than the merge decided;
  *   - progress pushes called `StreamObserver.onNext` straight from listener threads, and
  *     `StreamObserver` is not thread-safe;
  *   - the discard budget was decremented before the message was acknowledged, so a progress push
  *     that threw (a cancelled stream, a concurrently entered observer) spent the budget on a
  *     message that was never acknowledged - its redelivery was then DELIVERED instead of skipped,
  *     and the session showed a message the user asked to skip.
  *
  * Everything here runs offline: `ConsumerListener.received` is the real delivery path, driven from
  * real threads with a proxy consumer and hand-built messages. Only the broker is replaced.
  */
object sessionOutputSerializationTest extends ZIOSpecDefault:

    private val consumerName = "cs-serialized-0"
    private val p0 = "persistent://public/default/cs-serialized-partition-0"
    private val p1 = "persistent://public/default/cs-serialized-partition-1"

    /** A delivered message labelled by its partition key, which is what the assertions read back. */
    private def message(topicFqn: String, label: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(label)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"label":"$label"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    /** A connected consumer that records what was acknowledged and what was handed back. */
    private final class RecordingConsumer(topicFqn: String):
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

    private def stream(topicFqn: String, lastEntryId: Long): StartFromStream =
        StartFromStream(startFromStreamId(consumerName, topicFqn), EntryPosition(1L, lastEntryId, -1, 1))

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

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

    private def session(consumerListener: ConsumerListener): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-serialized",
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
            targets = Map(0 -> targetRunner(consumerListener))
        )

    /** A `StreamObserver` exactly as unforgiving as the real one: it is not thread-safe, and it
      * says so. `received` is a plain `var List` so a lost update shows up as a missing response,
      * and `overlaps` counts every time two threads were inside `onNext` at once.
      */
    private final class UnsafeObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val inside = AtomicInteger(0)
        val overlaps = AtomicInteger(0)
        var received: List[consumerPb.ResumeResponse] = Nil

        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if inside.incrementAndGet() != 1 then overlaps.incrementAndGet()
            val current = received
            Thread.`yield`()
            received = value :: current
            inside.decrementAndGet()
            ()

        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()

    private val observerSuite = suite("every response leaves through one serialized sender")(
        test("concurrent listener threads never enter the response observer at once") {
            // Progress pushes made this concrete: one listener thread per physical topic, each
            // calling `onNext` directly on the session's single observer while a normal response
            // could be on its way out from another.
            val runner = session(ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())))
            val observer = UnsafeObserver()
            val threads = 8
            val perThread = 400
            val start = CountDownLatch(1)

            val workers = Vector.tabulate(threads) { i =>
                worker(s"pulsar-listener-$i") {
                    start.await()
                    var k = 0
                    while k < perThread do
                        runner.sendResponse(observer, Seq(consumerPb.Message(numMessageProcessed = k.toLong)), Vector.empty)
                        k += 1
                }
            }
            workers.foreach(_.start())
            start.countDown()
            workers.foreach(_.join(120_000))

            assertTrue(
                observer.overlaps.get == 0,
                observer.received.size == threads * perThread
            ) ?? s"${observer.overlaps.get} concurrent entries; ${observer.received.size} of ${threads * perThread} responses survived"
        },
        test("concurrent progress pushes never enter the response observer at once") {
            // The same thing through the production path: every partition thread claiming the
            // shared discard, each of which may push a progress frame.
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            listener.startAcceptingNewMessages()
            listener.startFromDiscard = StartFromDiscard.shared(80_000)
            val runner = session(listener)
            val observer = UnsafeObserver()
            runner.resume(observer, isDebug = false)

            val threads = 8
            val start = CountDownLatch(1)
            val workers = Vector.tabulate(threads) { i =>
                worker(s"pulsar-listener-progress-$i") {
                    start.await()
                    var k = 0
                    while k < 10_000 do
                        listener.decide(p0, canAcknowledge = true)
                        k += 1
                }
            }
            workers.foreach(_.start())
            start.countDown()
            workers.foreach(_.join(120_000))

            assertTrue(
                observer.overlaps.get == 0,
                listener.startFromDiscard.remaining == 0L,
                observer.received.nonEmpty
            ) ?? s"${observer.overlaps.get} concurrent entries across ${observer.received.size} progress frames"
        }
    )

    private val budgetSuite = suite("a failing progress push must not cost a skipped message")(
        test("a progress observer that throws still leaves exactly n messages skipped and acknowledged") {
            // The client's stream can be cancelled at any moment, and `StreamObserver.onNext` then
            // throws. The budget was already decremented by the time it did, and the message was
            // NOT acknowledged - so the broker redelivered it, the (now spent) budget let it
            // through, and the session showed a message the user had asked to skip.
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            listener.startAcceptingNewMessages()
            listener.startFromDiscard = StartFromDiscard.shared(3)
            listener.onStartFromDiscardProgress = () => throw new IllegalStateException("call already cancelled")

            val delivered = ConcurrentLinkedQueue[String]()
            listener.targetMessageHandler.onNext = msg => delivered.add(msg.getKey)

            val consumer = RecordingConsumer(p0)
            val escaped = ConcurrentLinkedQueue[String]()
            (1 to 5).foreach { i =>
                try listener.received(consumer.consumer, message(p0, s"m$i", 100L + i, i.toLong))
                catch case err: Throwable => escaped.add(s"${err.getClass.getSimpleName}: ${err.getMessage}")
            }

            assertTrue(
                escaped.asScala.toVector.isEmpty,
                consumer.acknowledged.asScala.toVector == Vector("m1", "m2", "m3", "m4", "m5"),
                delivered.asScala.toVector == Vector("m4", "m5"),
                listener.startFromDiscard.remaining == 0L
            ) ?? (s"escaped=${escaped.asScala.toVector} acknowledged=${consumer.acknowledged.asScala.toVector} " +
                s"delivered=${delivered.asScala.toVector}")
        }
    )

    /** Records the ORDER of everything the client sees, and whether the two kinds of event ever
      * overlapped. `onNext` is deliberately slow so "nothing overlapped" is a claim about the lock
      * rather than about how fast two threads happened to run.
      */
    private final class SequencedObserver(writeDelayMs: Long = 0) extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        val enteredNext = CountDownLatch(1)
        private val insideNext = AtomicInteger(0)
        val completed = AtomicBoolean(false)
        val completedWhileWriting = AtomicBoolean(false)
        val nextAfterCompleted = AtomicInteger(0)
        private val frames = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()

        def received: Vector[consumerPb.ResumeResponse] = frames.asScala.toVector

        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if completed.get then nextAfterCompleted.incrementAndGet()
            insideNext.incrementAndGet()
            enteredNext.countDown()
            if writeDelayMs > 0 then Thread.sleep(writeDelayMs)
            frames.add(value)
            insideNext.decrementAndGet()
            ()

        override def onError(t: Throwable): Unit = ()

        override def onCompleted(): Unit =
            if insideNext.get > 0 then completedWhileWriting.set(true)
            completed.set(true)

    /** A listener whose progress snapshot can be interleaved on purpose. The FIRST caller is held
      * inside the snapshot and comes away with an INCOMPLETE reading; every caller after it gets the
      * COMPLETE one. That is precisely the window `sendResponse` used to leave open - the response,
      * including its progress counters, was built BEFORE the send lock was taken.
      */
    private final class GatedProgressListener(gate: CountDownLatch, reachedSnapshot: CountDownLatch)
        extends ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())):
        private val callers = AtomicInteger(0)
        private val stale = StartFromDiscard.shared(2)
        private val fresh = StartFromDiscard.shared(2)
        fresh.claim(p0)
        fresh.claim(p0)

        override def progressDiscard: StartFromDiscard =
            if callers.incrementAndGet() == 1 then
                reachedSnapshot.countDown()
                gate.await(60, TimeUnit.SECONDS)
                stale
            else fresh

    private val terminalSuite = suite("progress never goes backwards, and nothing follows the end of the stream")(
        test("AN OLDER PROGRESS FRAME CANNOT OVERTAKE A NEWER COMPLETE ONE") {
            // The response was built - and its start-from counters read - before `sendLock` was
            // taken, so two listener threads could snapshot in one order and send in the other. The
            // client clears its progress panel when it sees `complete`, then a stale incomplete
            // frame arriving behind it reopened a "skipping..." panel that never went away.
            val gate = CountDownLatch(1)
            val reached = CountDownLatch(1)
            val runner = session(GatedProgressListener(gate, reached))
            val observer = SequencedObserver()

            val older = worker("pulsar-listener-stale")(runner.sendResponse(observer, Seq.empty, Vector.empty))
            older.start()
            reached.await(60, TimeUnit.SECONDS)

            val newer = worker("pulsar-listener-fresh")(runner.sendResponse(observer, Seq.empty, Vector.empty))
            newer.start()
            // Under the fix the newer thread CANNOT get in: the older one holds the send lock while
            // it is held at the snapshot. Under the defect it sails past and lands first.
            newer.join(2_000)

            gate.countDown()
            older.join(60_000)
            newer.join(60_000)

            val progress = observer.received.flatMap(_.consumerStats).flatMap(_.startFromProgress)
            val firstComplete = progress.indexWhere(_.complete)
            assertTrue(
                progress.size == 2,
                firstComplete >= 0,
                progress.drop(firstComplete).forall(_.complete)
            ) ?? s"progress frames in the order the client saw them: ${progress.map(p => s"${p.messagesSkipped}/${p.messagesToSkip} complete=${p.complete}")}"
        },
        test("NO RESPONSE REACHES THE CLIENT AFTER THE STREAM HAS BEEN COMPLETED") {
            // `stop` called `onCompleted` with no terminal gate at all, so any listener thread still
            // in flight - or any later push - called `onNext` on a finished stream. Real gRPC throws
            // there; the browser sees a stream that ended and then spoke again.
            val runner = session(ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())))
            val observer = SequencedObserver()
            runner.resume(observer, isDebug = false)

            runner.stop()
            runner.sendResponse(observer, Seq(consumerPb.Message(numMessageProcessed = 1L)), Vector.empty)

            assertTrue(observer.completed.get, observer.nextAfterCompleted.get == 0) ??
                s"${observer.nextAfterCompleted.get} responses were written after the stream was completed"
        },
        test("THE STREAM IS NOT COMPLETED WHILE A RESPONSE IS STILL BEING WRITTEN") {
            // `onCompleted` was called outside the send lock, so it could interleave with an
            // `onNext` from a listener thread - and `StreamObserver` is not thread-safe.
            val runner = session(ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())))
            val observer = SequencedObserver(writeDelayMs = 400)
            runner.resume(observer, isDebug = false)

            val writer = worker("pulsar-listener-writing")(runner.sendResponse(observer, Seq(consumerPb.Message()), Vector.empty))
            writer.start()
            observer.enteredNext.await(60, TimeUnit.SECONDS)

            runner.stop()
            writer.join(60_000)

            assertTrue(observer.completed.get, !observer.completedWhileWriting.get) ??
                "the response stream was completed while a listener thread was inside onNext"
        }
    )

    private val orderSuite = suite("resolved messages are processed in the order the merge decided")(
        test("a later message cannot overtake the one the merge released first") {
            // The merge holds p0/100 until p1 speaks. p1's message resolves BOTH - dropping p1/50
            // and releasing p0/100 - and the releasing thread then has to process p0/100. Meanwhile
            // p0's own thread offers 200, which the merge (its budget now spent) passes straight
            // through.
            //
            // Releasing the merge's lock before processing let p0/200 be handled first: the
            // session's stateful filters, projections and accumulated state then saw the two
            // messages in the opposite order to the one the merge had just decided on.
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            listener.startAcceptingNewMessages()
            listener.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.GlobalSkip(1, Vector(stream(p0, 9), stream(p1, 0)))
            )

            val processed = ConcurrentLinkedQueue[String]()
            val firstEntered = CountDownLatch(1)
            listener.targetMessageHandler.onNext = msg =>
                if msg.getKey == "a1" then
                    firstEntered.countDown()
                    // WIDENS the window on purpose: "nothing overtook it" must be a claim about
                    // the lock, not about how fast the two threads happened to run.
                    Thread.sleep(300)
                processed.add(msg.getKey)

            val consumerP0 = RecordingConsumer(p0)
            val consumerP1 = RecordingConsumer(p1)
            val escaped = ConcurrentLinkedQueue[String]()

            // p0's first message is held by the merge and returns nothing.
            listener.received(consumerP0.consumer, message(p0, "a1", 100L, 0L))

            val releaser = worker("pulsar-listener-p1") {
                try listener.received(consumerP1.consumer, message(p1, "b1", 50L, 0L))
                catch case err: Throwable => escaped.add(s"p1: ${err.getMessage}")
            }
            val overtaker = worker("pulsar-listener-p0") {
                firstEntered.await(30, TimeUnit.SECONDS)
                try listener.received(consumerP0.consumer, message(p0, "a2", 200L, 1L))
                catch case err: Throwable => escaped.add(s"p0: ${err.getMessage}")
            }

            releaser.start()
            overtaker.start()
            releaser.join(60_000)
            overtaker.join(60_000)

            assertTrue(
                escaped.asScala.toVector.isEmpty,
                processed.asScala.toVector == Vector("a1", "a2"),
                consumerP1.acknowledged.asScala.toVector == Vector("b1")
            ) ?? s"escaped=${escaped.asScala.toVector} processed=${processed.asScala.toVector}"
        },
        test("a pass-through session is NOT serialized - the ordinary path pays nothing") {
            // The lock exists to preserve an order the merge decided. A session with no merge
            // decided no order, so taking a session-wide lock per message there would serialize
            // every partition's deserialization for nothing.
            val ordering = StartFromOrdering.passThrough[String]
            val inside = AtomicInteger(0)
            val concurrent = AtomicInteger(0)
            val start = CountDownLatch(1)
            val workers = Vector.tabulate(4) { i =>
                worker(s"pass-through-$i") {
                    start.await()
                    var k = 0
                    while k < 200 do
                        ordering.inOrder {
                            if inside.incrementAndGet() > 1 then concurrent.incrementAndGet()
                            Thread.`yield`()
                            inside.decrementAndGet()
                        }
                        k += 1
                }
            }
            workers.foreach(_.start())
            start.countDown()
            workers.foreach(_.join(60_000))

            assertTrue(concurrent.get > 0) ??
                "a pass-through ordering layer took a session-wide lock it has no order to protect"
        }
    )

    def spec = suite(this.getClass.toString)(observerSuite, budgetSuite, terminalSuite, orderSuite) @@ TestAspect.sequential
