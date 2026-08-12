package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.TreatBytesAsJson
import _root_.consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTarget, BasicMessageFilterValueTarget}
import _root_.consumer.message_filter.{JsMessageFilter, MessageFilter, MessageFilterChain, MessageFilterChainMode}
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.google.rpc.code.Code
import com.google.rpc.status.Status
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** WHAT A DELIVERY OWES THE BROKER WHEN THE PLAY UNDERNEATH IT MOVES.
  *
  * Every message this session takes off the broker is either SHOWN to a client and acknowledged, or
  * handed back for redelivery. Three lifecycle races broke that bargain, and each loses something
  * different:
  *
  *   - a send into an ENDED stream (`failAndComplete` while a delivery was in flight) reported
  *     success without writing anything, so the caller acknowledged a message no browser ever saw -
  *     a persistent message gone from the session's subscription for good;
  *   - the play-generation gate sat in the SESSION callback, after the target handler had already
  *     advanced the counters, deserialized, leased the JS context and run the user's filters - so a
  *     second Play made stateful JavaScript observe the same message twice;
  *   - a FAILED send re-entered that whole pipeline on the redelivery (and on Guaranteed's in-place
  *     retry), so the browser could receive a message exactly once while the counters and the JS
  *     state said two or three.
  *
  * Everything runs offline: `ConsumerListener.received`, `deliverNow`, the guaranteed delivery
  * pump, the production target handler installed by `ConsumerSessionTargetRunner.resume` and the
  * real session `onNext` closure. Only the broker is replaced, by proxy consumers and hand-built
  * `MessageImpl`s. Every interleaving is pinned by latches - never by a sleep, and never by
  * repetition until something happens to land.
  */
object deliveryLifecycleRaceTest extends ZIOSpecDefault:

    private val consumerName = "cs-delivery-race-0"
    private def topic(i: Int): String = s"persistent://public/default/cs-delivery-race-$i"
    private def sid(i: Int): String = startFromStreamId(consumerName, topic(i))

    /** A connected consumer that records what was acknowledged and what was handed back - the two
      * broker-visible dispositions every assertion here is about. */
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
                        // A FAR-FUTURE recorded end: a guaranteed resume re-captures the replay
                        // boundary through this call, and these tests are about mid-replay
                        // lifecycle races - every hand-built message (small entry ids) must stay
                        // inside the boundary and no stream may read as finished.
                        case "getLastMessageIds" =>
                            java.util.List.of[org.apache.pulsar.client.api.MessageId](new MessageIdImpl(1L, 1_000_000L, -1))
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

    private def message(topicFqn: String, key: String, publishTime: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(1L, entryId, -1))
        msg

    private def worker(name: String)(body: => Unit): Thread =
        val t = new Thread((() => body): Runnable, name)
        t.setDaemon(true)
        t

    /** THE STATEFUL TARGET FILTER, and the whole point of using real JavaScript here: it counts its
      * own invocations in a JS global that survives the message, so "the pipeline ran twice for one
      * message" is a fact the test reads back out of the session's context rather than infers. It
      * retains everything, so the counting is independent of what the filter decides.
      *
      * A `def`, and that is load-bearing: `JsMessageFilter` memoizes the compiled function against
      * the FIRST polyglot context it is evaluated in, so one shared instance would keep counting
      * into the first fixture's context and every later fixture would read a run count of zero. */
    private def countingFilter: MessageFilterChain =
        MessageFilterChain(
            isEnabled = true,
            isNegated = false,
            mode = MessageFilterChainMode.All,
            filters = Vector(
                MessageFilter(
                    isEnabled = true,
                    isNegated = false,
                    targetField = BasicMessageFilterTarget(target = BasicMessageFilterValueTarget()),
                    filter = JsMessageFilter(jsCode = "v => { globalThis.__runs = (globalThis.__runs || 0) + 1; return true }")
                )
            )
        )

    /** Records what the client received, and can be made to FAIL its first write - which is what a
      * cancelled or backpressured call does, and the trigger for every retry path here. */
    private final class RecordingObserver(failWrites: Int = 0) extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val frames = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        private val writesToFail = java.util.concurrent.atomic.AtomicInteger(failWrites)
        val completed = java.util.concurrent.atomic.AtomicBoolean(false)

        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if writesToFail.getAndUpdate(n => math.max(0, n - 1)) > 0 then
                throw new IllegalStateException("the client's call could not take this write")
            frames.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = completed.set(true)

        def received: Vector[consumerPb.ResumeResponse] = frames.asScala.toVector
        /** Messages the browser actually got - a status-only frame is not a delivery. */
        def deliveredMessages: Vector[consumerPb.Message] = received.flatMap(_.messages)

    /** A real session over `topicCount` proxy consumers, with the real target handler and the real
      * session `onNext`. `guaranteed` swaps the pass-through ordering layer for the production
      * Guaranteed barrier, whose retry is in-place rather than through the broker. */
    private final class Fixture(sessionName: String, topicCount: Int = 1, guaranteed: Boolean = false):
        val pool: ConsumerSessionContextPool = ConsumerSessionContextPool()
        val listener: ConsumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        listener.startAcceptingNewMessages()
        if guaranteed then
            // The CREATE-TIME boundary, exactly as production arms it: far-future recorded ends,
            // matching what the proxies' getLastMessageIds answers, so every hand-built message
            // (small entry ids) stays mid-replay and no stream reads as finished. Since the
            // create-is-the-first-Play fix the first Play CONSUMES this boundary instead of
            // re-reading the broker, so the fixture must carry it here - relying on a resume-time
            // re-capture to install it left the layer boundary-less and every stream finished.
            val midReplayStreams = Vector.tabulate(topicCount)(i => StartFromStream(sid(i), EntryPosition(1L, 1_000_000L, -1, 1)))
            listener.startFromOrdering = new StartFromOrdering[HeldMessage](
                Some(GlobalSkipMerge[HeldMessage](
                    streamIds = Vector.tabulate(topicCount)(sid),
                    drainedAtStart = Set.empty,
                    discard = StartFromDiscard.shared(0),
                    nowMs = () => 0L,
                    policy = OrderingPolicy.GuaranteedOnly,
                    graceMs = 500L
                )),
                midReplayStreams.map(s => s.id -> s).toMap
            )

        val consumers: Vector[RecordingConsumer] = Vector.tabulate(topicCount)(i => RecordingConsumer(topic(i)))
        private val consumersByTopic: Map[String, Consumer[Array[Byte]]] =
            Vector.tabulate(topicCount)(i => topic(i) -> consumers(i).consumer).toMap

        val target: ConsumerSessionTargetRunner = ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = TreatBytesAsJson()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumersByTopic.keys.toVector)),
                messageFilterChain = countingFilter,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = consumersByTopic.keys.toVector,
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = consumersByTopic,
            pauseArbiters = consumersByTopic.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = listener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

        val runner: ConsumerSessionRunner = ConsumerSessionRunner(
            sessionName = sessionName,
            sessionConfig = ConsumerSessionConfig(
                startFrom = EarliestMessage(),
                targets = Vector.empty,
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

        /** One message arriving on a Pulsar listener thread, through the real delivery path. */
        def deliver(partition: Int, key: String, publishTime: Long, entryId: Long): Unit =
            listener.received(consumers(partition).consumer, message(topic(partition), key, publishTime, entryId))

        /** How many times the user's stateful filter has run, read straight out of the session's
          * JS context - the oracle for "the pipeline ran again". */
        def jsRuns: Int = pool.withContext(0)(_.runCode("globalThis.__runs || 0")).trim.toInt

        def acknowledged: Vector[String] = consumers.flatMap(_.acknowledged.asScala.toVector)
        def handedBack: Vector[String] = consumers.flatMap(_.handedBack.asScala.toVector)

        /** Put a LATCH between `deliverNow` and the production target handler, so a delivery can be
          * held mid-flight while a lifecycle event lands. Installed after `resume`, which is what
          * installs the handler being wrapped; the wrapper keeps its own reference, so a later
          * resume replacing the field cannot rescue a delivery already inside it - exactly like a
          * Pulsar listener thread descheduled just as a second Play arrives. */
        def latchHandler(entered: CountDownLatch, release: CountDownLatch): Unit =
            val installed = listener.targetMessageHandler.onNext
            listener.targetMessageHandler.onNext = msg =>
                entered.countDown()
                release.await(60, TimeUnit.SECONDS)
                installed(msg)

    private val await = 60_000L

    private val terminalStreamSuite = suite("a send into a stream that has ENDED is a failed delivery, not a silent success")(
        test("A DELIVERY IN FLIGHT ACROSS failAndComplete IS HANDED BACK - never acknowledged, never counted as read") {
            // The shape from production: one target's Resume throws, the service ends the client's
            // stream through `failAndComplete`, and another target's listener thread is at that
            // moment inside a delivery. `sendResponse` treated the ended stream as a successful
            // no-op, so `deliverNow` went straight on to acknowledge - and a persistent message
            // left this session's subscription without a browser ever seeing it.
            //
            // The handler here calls `sendResponse` directly: this test is about the SEND crossing
            // the terminal boundary and what `deliverNow` then does with the broker, and wiring it
            // this way keeps the claim independent of the generation gate in front of it (pinned
            // separately below).
            val f = Fixture("cs-terminal-inflight")
            val observer = RecordingObserver()
            f.runner.resume(observer, isDebug = false)

            val inFlight = CountDownLatch(1)
            val release = CountDownLatch(1)
            f.listener.targetMessageHandler.onNext = _ =>
                inFlight.countDown()
                release.await(60, TimeUnit.SECONDS)
                f.runner.sendResponse(observer, Seq(consumerPb.Message(numMessageProcessed = 1L)), Vector.empty)

            val delivering = worker("pulsar-listener-0")(f.deliver(0, "m1", 100L, 0L))
            delivering.start()
            val reachedTheSend = inFlight.await(30, TimeUnit.SECONDS)

            // A later target could not be resumed; the service ends the stream through the runner.
            f.runner.failAndComplete(Status(code = Code.FAILED_PRECONDITION.value, message = "target 1 could not be resumed"))
            release.countDown()
            delivering.join(await)

            val lostToTheEndedStream = observer.deliveredMessages

            // The client creates the session again, and the broker redelivers what was handed back.
            val replacement = Fixture("cs-terminal-inflight-2")
            val secondObserver = RecordingObserver()
            replacement.runner.resume(secondObserver, isDebug = false)
            replacement.deliver(0, "m1", 100L, 0L)

            assertTrue(
                reachedTheSend,
                f.acknowledged.isEmpty, // NOT acknowledged: nothing was written for it
                f.handedBack == Vector("m1"), // handed back for redelivery instead
                f.listener.consumedBounds.isEmpty, // and Topic Positions did not advance over it
                lostToTheEndedStream.isEmpty,
                secondObserver.deliveredMessages.size == 1, // exactly once on the replacement
                replacement.acknowledged == Vector("m1"),
                replacement.handedBack.isEmpty
            ) ?? (s"acknowledged=${f.acknowledged} handedBack=${f.handedBack} bounds=${f.listener.consumedBounds.keySet} " +
                s"lost=${lostToTheEndedStream.size} replacementFrames=${secondObserver.deliveredMessages.size} " +
                s"replacementAcked=${replacement.acknowledged}")
        },
        test("ENDING THE STREAM INVALIDATES THE PLAY FIRST, so the doomed delivery never runs the pipeline") {
            // The other half of the same fix. Refusing at the send keeps the MESSAGE, but the
            // delivery would still have spent the whole pipeline getting there - both processed
            // counters, the deserialization, the JS lease and the user's stateful filters - all for
            // a response that can no longer be written to anybody. `failAndComplete` bumps the play
            // generation before it ends the stream, exactly as `stop` does, so the in-flight
            // handler dies at the target's gate instead.
            val f = Fixture("cs-terminal-generation")
            val observer = RecordingObserver()
            f.runner.resume(observer, isDebug = false)

            val inFlight = CountDownLatch(1)
            val release = CountDownLatch(1)
            f.latchHandler(inFlight, release)

            val delivering = worker("pulsar-listener-0")(f.deliver(0, "m1", 100L, 0L))
            delivering.start()
            val inFlightNow = inFlight.await(30, TimeUnit.SECONDS)
            f.runner.failAndComplete(Status(code = Code.FAILED_PRECONDITION.value, message = "target 1 could not be resumed"))
            release.countDown()
            delivering.join(await)

            assertTrue(
                inFlightNow,
                f.jsRuns == 0, // no user JavaScript ran for a delivery nobody could receive
                f.target.stats.messageProcessed.get == 0L,
                f.runner.numMessageProcessed == 0L,
                f.acknowledged.isEmpty,
                f.handedBack == Vector("m1"),
                observer.deliveredMessages.isEmpty
            ) ?? (s"jsRuns=${f.jsRuns} processed=${f.target.stats.messageProcessed.get} " +
                s"acked=${f.acknowledged} handedBack=${f.handedBack}")
        },
        test("a data send into an ended stream REFUSES, so its caller takes the failure path") {
            // The unit-level statement of the same rule. A progress-only frame may still be dropped
            // silently - losing it costs a progress bar - but a frame carrying a message is a
            // delivery, and a delivery that was not written must never look like one that was.
            val f = Fixture("cs-terminal-send")
            val observer = RecordingObserver()
            f.runner.resume(observer, isDebug = false)
            f.runner.stop()

            val dataSendRefused = Try(f.runner.sendResponse(observer, Seq(consumerPb.Message()), Vector.empty)).isFailure
            val progressPushSurvived = Try(f.runner.sendResponse(observer, Seq.empty, Vector.empty)).isSuccess

            assertTrue(
                dataSendRefused,
                progressPushSurvived,
                observer.completed.get,
                observer.deliveredMessages.isEmpty
            ) ?? s"dataSendRefused=$dataSendRefused progressPushSurvived=$progressPushSurvived frames=${observer.received.size}"
        }
    )

    private val generationGateSuite = suite("a superseded play does no work at all - not even the target's")(
        test("A SECOND PLAY CROSSING AN IN-FLIGHT DELIVERY MUTATES NOTHING, and the message is shown exactly once afterwards") {
            // The gate used to live in the SESSION callback, which the target reaches only after
            // incrementing both processed counters, deserializing the message, leasing the JS
            // context and running the target's filters. So a second Play (or a Stop) crossing an
            // in-flight delivery left the stale attempt's state changes behind: the message was
            // nacked and redelivered, and the user's stateful JavaScript saw it TWICE for one row
            // on screen.
            val f = Fixture("cs-superseded")
            val first = RecordingObserver()
            f.runner.resume(first, isDebug = false)

            val inFlight = CountDownLatch(1)
            val release = CountDownLatch(1)
            f.latchHandler(inFlight, release)

            val delivering = worker("pulsar-listener-0")(f.deliver(0, "m1", 100L, 0L))
            delivering.start()
            val inFlightNow = inFlight.await(30, TimeUnit.SECONDS)

            // The user pressed Play again while that delivery was mid-flight.
            val second = RecordingObserver()
            f.runner.resume(second, isDebug = false)
            release.countDown()
            delivering.join(await)

            val jsRunsAfterStaleAttempt = f.jsRuns
            val processedAfterStaleAttempt = f.target.stats.messageProcessed.get
            val sessionProcessedAfterStaleAttempt = f.runner.numMessageProcessed

            // The broker redelivers what the stale attempt handed back; THIS play delivers it.
            f.deliver(0, "m1", 100L, 0L)

            assertTrue(
                inFlightNow,
                jsRunsAfterStaleAttempt == 0, // the superseded attempt ran no user JavaScript
                processedAfterStaleAttempt == 0L, // and moved no counter
                sessionProcessedAfterStaleAttempt == 0L,
                f.handedBack == Vector("m1"), // it was handed back instead
                first.deliveredMessages.isEmpty, // nothing reached the replaced stream
                f.jsRuns == 1, // ONE run of the stateful filter for one message, in total
                f.target.stats.messageProcessed.get == 1L,
                f.runner.numMessageProcessed == 1L,
                f.runner.numMessageSent == 1L,
                second.deliveredMessages.size == 1,
                f.acknowledged == Vector("m1")
            ) ?? (s"staleAttempt: jsRuns=$jsRunsAfterStaleAttempt processed=$processedAfterStaleAttempt " +
                s"sessionProcessed=$sessionProcessedAfterStaleAttempt; afterwards: jsRuns=${f.jsRuns} " +
                s"processed=${f.target.stats.messageProcessed.get} sent=${f.runner.numMessageSent} " +
                s"acked=${f.acknowledged} handedBack=${f.handedBack} frames=${second.deliveredMessages.size}")
        },
        test("a STOP crossing an in-flight delivery is the same rule: nothing mutated, the message handed back") {
            // Counters only, deliberately: `stop` also CLOSES the session's JS contexts, so the
            // run-count global cannot be read back afterwards - and a delivery that reached the
            // pool at all would have died on the closed context rather than at the gate, which is
            // exactly the reading this asserts against.
            val f = Fixture("cs-stopped-midflight")
            val observer = RecordingObserver()
            f.runner.resume(observer, isDebug = false)

            val inFlight = CountDownLatch(1)
            val release = CountDownLatch(1)
            f.latchHandler(inFlight, release)

            val delivering = worker("pulsar-listener-0")(f.deliver(0, "m1", 100L, 0L))
            delivering.start()
            val inFlightNow = inFlight.await(30, TimeUnit.SECONDS)
            Try(f.runner.stop())
            release.countDown()
            delivering.join(await)

            assertTrue(
                inFlightNow,
                f.target.stats.messageProcessed.get == 0L,
                f.runner.numMessageProcessed == 0L,
                f.acknowledged.isEmpty,
                f.handedBack == Vector("m1"),
                observer.deliveredMessages.isEmpty
            ) ?? (s"processed=${f.target.stats.messageProcessed.get} " +
                s"acked=${f.acknowledged} handedBack=${f.handedBack}")
        }
    )

    private val failedSendSuite = suite("a retry re-SENDS - it does not re-run the pipeline")(
        test("BEST EFFORT: a failed send then a redelivery leaves the stateful filter run ONCE and the counters at one") {
            // The browser can receive a message exactly once and still see the counters - and the
            // user's accumulated JS state - as if it had been processed twice, because the failed
            // attempt had already run the whole target and session pipeline before the send was
            // known to have failed. What the retry owes is the SAME response, sent again.
            val f = Fixture("cs-failed-send-best-effort")
            val observer = RecordingObserver(failWrites = 1)
            f.runner.resume(observer, isDebug = false)

            f.deliver(0, "m1", 100L, 0L) // the send fails; the message is handed back
            val handedBackAfterFailure = f.handedBack
            val acknowledgedAfterFailure = f.acknowledged

            f.deliver(0, "m1", 100L, 0L) // the broker redelivers it

            assertTrue(
                handedBackAfterFailure == Vector("m1"),
                acknowledgedAfterFailure.isEmpty,
                f.jsRuns == 1, // ONE run of the user's stateful filter for one message
                f.target.stats.messageProcessed.get == 1L,
                f.runner.numMessageProcessed == 1L,
                f.runner.numMessageSent == 1L,
                observer.deliveredMessages.size == 1, // and exactly one row on screen
                f.acknowledged == Vector("m1"),
                f.runner.preparedDeliveryCount == 0 // the memo is released by the send that took
            ) ?? (s"jsRuns=${f.jsRuns} processedByTarget=${f.target.stats.messageProcessed.get} " +
                s"processed=${f.runner.numMessageProcessed} sent=${f.runner.numMessageSent} " +
                s"frames=${observer.deliveredMessages.size} acked=${f.acknowledged} handedBack=${f.handedBack} " +
                s"pending=${f.runner.preparedDeliveryCount}")
        },
        test("GUARANTEED: the in-place retry of a failed send is a re-send, not a second pass") {
            // Guaranteed never hands a failed head back to the broker - it keeps it and retries it
            // on the next pump. Same rule, different retry mechanism: the pipeline must not run
            // again, so nothing is counted twice and no stateful filter sees the message twice.
            val f = Fixture("cs-failed-send-guaranteed", topicCount = 2, guaranteed = true)
            val observer = RecordingObserver(failWrites = 1)
            f.runner.resume(observer, isDebug = false)

            f.deliver(0, "m1", 100L, 0L) // held: stream 1 has not spoken yet
            f.deliver(1, "m2", 200L, 0L) // m1 is now the safe head - and its send fails

            val acknowledgedAfterFailure = f.acknowledged
            val jsRunsAfterFailure = f.jsRuns

            f.listener.pumpGuaranteedDelivery() // the retry tick

            assertTrue(
                acknowledgedAfterFailure.isEmpty,
                jsRunsAfterFailure == 1,
                f.handedBack.isEmpty, // Guaranteed keeps the head; the broker is never asked again
                f.jsRuns == 1,
                f.target.stats.messageProcessed.get == 1L,
                f.runner.numMessageProcessed == 1L,
                f.runner.numMessageSent == 1L,
                observer.deliveredMessages.size == 1,
                f.acknowledged == Vector("m1"),
                f.runner.preparedDeliveryCount == 0
            ) ?? (s"jsRuns=${f.jsRuns} (after failure $jsRunsAfterFailure) " +
                s"processedByTarget=${f.target.stats.messageProcessed.get} sent=${f.runner.numMessageSent} " +
                s"frames=${observer.deliveredMessages.size} acked=${f.acknowledged} handedBack=${f.handedBack} " +
                s"pending=${f.runner.preparedDeliveryCount}")
        },
        test("a retry under a NEW play is not replayed - the superseded attempt's response belongs to the stream that is gone") {
            // The two fixes compose in one direction that matters: a prepared response is only ever
            // re-sent to the play that prepared it. A second Play means new stats, a new observer
            // and possibly a new client, so the retry there re-runs the pipeline once - and the
            // counters end at one run per play, never at a stale frame from the previous one.
            val f = Fixture("cs-retry-across-plays")
            val first = RecordingObserver(failWrites = 1)
            f.runner.resume(first, isDebug = false)
            f.deliver(0, "m1", 100L, 0L) // prepared under play 1, send failed, handed back

            val second = RecordingObserver()
            f.runner.resume(second, isDebug = false) // play 2
            f.deliver(0, "m1", 100L, 0L) // the redelivery lands under the new play

            assertTrue(
                f.jsRuns == 2, // once per play - the first play's run is not undoable
                f.runner.numMessageSent == 2L,
                first.deliveredMessages.isEmpty,
                second.deliveredMessages.size == 1,
                f.acknowledged == Vector("m1")
            ) ?? (s"jsRuns=${f.jsRuns} sent=${f.runner.numMessageSent} first=${first.deliveredMessages.size} " +
                s"second=${second.deliveredMessages.size} acked=${f.acknowledged}")
        }
    )

    def spec = suite(this.getClass.toString)(terminalStreamSuite, generationGateSuite, failedSendSuite) @@ TestAspect.sequential
