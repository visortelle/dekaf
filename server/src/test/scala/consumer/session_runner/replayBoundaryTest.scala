package consumer.session_runner

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.TreatBytesAsJson
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
import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, MessageId as PulsarMessageId, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue}
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** THE GUARANTEED EXACT-REPLAY CONTRACT, pinned at the pause boundary (owner decision 2026-08-09).
  *
  * Guaranteed is an exact replay: deliver everything recorded up to the moment Play was pressed
  * (of what retention still holds), in strict key order, then AUTO-PAUSE with a caught-up signal.
  * No live phase, no stall, no held tail, no 30 s give-up. Resume EXTENDS the boundary to now -
  * one rule for manual pause and auto-pause - and the delta (itself immutable by then) replays
  * exactly: the un-emitted remainder and the delta merge in one heap. A message that arrived past
  * the boundary mid-replay is handed back (its consumer paused) and belongs to the NEXT chunk; it
  * must not spend budget, must not enter the delivery memo, and must not be emitted.
  *
  * These tests were written BEFORE the implementation, per the owner's confirm-first rule, and the
  * Guaranteed ones FAIL against the previous hold-forever code (which kept waiting on every stream
  * forever and never signalled). The Best-effort test is a PIN - it passes before and after.
  *
  * Offline like the other lifecycle suites: proxy consumers, hand-built `MessageImpl`s, the real
  * listener, ordering layer, runner and delivery pump. The recorded ends are the test's to move,
  * which is how "messages were published while the session was paused" is stated rather than
  * waited for.
  */
object replayBoundaryTest extends ZIOSpecDefault:

    private val consumerName = "cs-replay-0"
    private def topic(i: Int): String = s"persistent://public/default/cs-replay-$i"
    private def sid(i: Int): String = startFromStreamId(consumerName, topic(i))

    /** A connected consumer whose RECORDED END the test controls. `lastIds` is what
      * `getLastMessageIds` answers - moving it forward is the test's way of publishing while the
      * session is not looking. Acks, nacks and pause/resume calls are recorded, and so is every
      * BOUNDARY read of the last ids: the first Play must consume the boundaries decided at
      * session build without asking the broker for ends at all, and only a read counter can pin
      * that. The counter deliberately excludes reads made on the shared maintenance thread -
      * the post-caught-up indicator refinement and the stall diagnostic legitimately read ends
      * there, asynchronously, and they are not the boundary capture the pin is about. */
    private final class RecordingConsumer(topicFqn: String):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        val pauseCalls = ConcurrentLinkedQueue[String]()
        val boundaryEndReads = AtomicLong(0)
        /** Armed to make the next BOUNDARY `getLastMessageIds` fail the way an unreachable broker
          * does (the maintenance thread's refinement reads stay unaffected - they are best-effort
          * by design and must not be what the loud-failure pin observes). */
        @volatile var failLastIds: Boolean = false
        @volatile var lastIds: java.util.List[PulsarMessageId] = java.util.Collections.emptyList()

        def recordedEnd(entryId: Long): Unit =
            lastIds = java.util.List.of(new MessageIdImpl(1L, entryId, -1))

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "getLastMessageIds" =>
                            if !Thread.currentThread.getName.startsWith("consumer-session-maintenance") then
                                boundaryEndReads.incrementAndGet()
                                if failLastIds then
                                    throw new IllegalStateException(s"the broker would not answer getLastMessageIds for $topicFqn")
                            lastIds
                        case "pause" =>
                            pauseCalls.add("pause")
                            null
                        case "resume" =>
                            pauseCalls.add("resume")
                            null
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

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val frames = ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            frames.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = ()
        def received: Vector[consumerPb.ResumeResponse] = frames.asScala.toVector
        def deliveredMessages: Vector[consumerPb.Message] = received.flatMap(_.messages)
        /** Rows on screen: frames carrying a real message (a count-only placeholder has no id). */
        /** Rows on screen by partition key. The converter serializes the key as JSON, so the pb
          * field carries `"a-100"` quotes and all - stripped here so assertions read plainly. */
        def deliveredKeys: Vector[String] =
            deliveredMessages.flatMap(_.key).map(_.stripPrefix("\"").stripSuffix("\""))
        def caughtUpFrames: Vector[consumerPb.ConsumerStats] =
            received.flatMap(_.consumerStats).filter(_.replayCaughtUp)

    /** A real Guaranteed session over proxy consumers: real listener, real ordering layer with
      * RECORDED ENDS, real runner and delivery pump. The merge clock is injected.
      *
      * `endsAtPlay` is the boundary the session DECIDED at build time - what `handleStartFrom`
      * armed the ordering layer with. `brokerEnds` is what the BROKER answers when asked for the
      * last ids (`getLastMessageIds`, the resume re-capture's source); it defaults to the same
      * values, which is the history-seek case. A LIVE-EDGE seek is the case where the two differ:
      * the decided boundary is deliberately EMPTY (nothing to replay - the cursor sits at the
      * live edge) while the broker still reports the backlog's real end behind that cursor. The
      * old fixture conflated the two, so the re-capture path always read ends equal to the
      * decided ones and its overwrite of a live-edge boundary was invisible (e2e CS-DM-R3B).
      */
    private final class Fixture(
        sessionName: String,
        topicCount: Int,
        endsAtPlay: Map[Int, Long],
        guaranteed: Boolean = true,
        brokerEnds: Option[Map[Int, Long]] = None
    ):
        var monoMs: Long = 0L
        val pool: ConsumerSessionContextPool = ConsumerSessionContextPool()
        val listener: ConsumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))

        val consumers: Vector[RecordingConsumer] = Vector.tabulate(topicCount)(i => RecordingConsumer(topic(i)))
        brokerEnds.getOrElse(endsAtPlay).foreach((i, entryId) => if entryId >= 0 then consumers(i).recordedEnd(entryId))

        private def streamsAtPlay: Vector[StartFromStream] =
            Vector.tabulate(topicCount) { i =>
                val end = endsAtPlay.get(i).filter(_ >= 0).map(e => EntryPosition(1L, e, -1, 1)).getOrElse(EntryPosition.empty)
                StartFromStream(sid(i), end)
            }

        val merge = GlobalSkipMerge[HeldMessage](
            streamIds = Vector.tabulate(topicCount)(sid),
            drainedAtStart = streamsAtPlay.filter(_.lastAtStart == EntryPosition.empty).map(_.id).toSet,
            discard = StartFromDiscard.shared(0),
            nowMs = () => monoMs,
            policy = if guaranteed then OrderingPolicy.GuaranteedOnly else OrderingPolicy.BestEffortOnly,
            graceMs = 500L
        )
        listener.startFromOrdering = new StartFromOrdering[HeldMessage](
            Some(merge),
            streamsAtPlay.map(s => s.id -> s).toMap
        )

        private val consumersByTopic: Map[String, Consumer[Array[Byte]]] =
            Vector.tabulate(topicCount)(i => topic(i) -> consumers(i).consumer).toMap

        val pauseArbiters: Map[String, ConsumerPauseArbiter] =
            consumersByTopic.map((fqn, c) => fqn -> ConsumerPauseArbiter(c))
        listener.pauseArbiters = pauseArbiters.map((fqn, arbiter) => startFromStreamId(consumerName, fqn) -> arbiter)

        val target: ConsumerSessionTargetRunner = ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = TreatBytesAsJson()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumersByTopic.keys.toVector)),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = consumersByTopic.keys.toVector,
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = consumersByTopic,
            pauseArbiters = pauseArbiters,
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
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty),
                messageDeliveryOrder = if guaranteed then MessageDeliveryOrder.Guaranteed else MessageDeliveryOrder.BestEffort
            ),
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

        def deliver(partition: Int, key: String, publishTime: Long, entryId: Long): Unit =
            listener.received(consumers(partition).consumer, message(topic(partition), key, publishTime, entryId))

        def acknowledged: Vector[String] = consumers.flatMap(_.acknowledged.asScala.toVector)
        def handedBack: Vector[String] = consumers.flatMap(_.handedBack.asScala.toVector)
        def close(): Unit =
            Try(runner.stop())
            ()

    def spec = suite(this.getClass.toString)(
        test("PIN, Best effort: a burst published while paused is handed back and appears after resume") {
            // The Best-effort side of the pause boundary, unchanged by the replay redesign: a
            // paused session rejects what arrives (handed back for redelivery), and the burst is
            // delivered - exactly once - when the redeliveries land after resume. This PASSED
            // before the redesign and must keep passing; it is the control for the Guaranteed
            // tests below.
            //
            // LISTENER TIER, deliberately: a runner-level best-effort session routes deliveries
            // through the rate limiter's queue and drains them on the session's own timer thread,
            // so the assertions would race real time. Down here the gate, the merge, the nack and
            // the redelivery are the production ones and every step is synchronous - exactly the
            // shape liveDeliveryOrderSwitchTest pins the relax path with.
            var monoMs = 0L
            val delivered = ConcurrentLinkedQueue[String]()
            val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = msg =>
                delivered.add(msg.getKey)
                ()
            ))
            listener.startAcceptingNewMessages()
            listener.startFromOrdering = new StartFromOrdering[HeldMessage](
                Some(GlobalSkipMerge[HeldMessage](
                    streamIds = Vector(sid(0), sid(1)),
                    drainedAtStart = Set.empty,
                    discard = StartFromDiscard.shared(0),
                    nowMs = () => monoMs,
                    policy = OrderingPolicy.BestEffortOnly,
                    graceMs = 500L
                )),
                Map.empty
            )
            val consumers = Vector(RecordingConsumer(topic(0)), RecordingConsumer(topic(1)))
            def deliver(partition: Int, key: String, publishTime: Long, entryId: Long): Unit =
                listener.received(consumers(partition).consumer, message(topic(partition), key, publishTime, entryId))
            def deliveredKeys: Vector[String] = delivered.asScala.toVector
            def handedBack: Vector[String] = consumers.flatMap(_.handedBack.asScala.toVector)
            def acknowledged: Vector[String] = consumers.flatMap(_.acknowledged.asScala.toVector)

            deliver(0, "a-100", 100L, 0L)
            deliver(1, "b-200", 200L, 0L)
            monoMs += 501L
            listener.sweepStartFromStall() // the timer half of the residence bound
            val beforePause = deliveredKeys

            listener.stopAcceptingNewMessages() // the pause gate, exactly as target.pause closes it
            deliver(0, "a-300", 300L, 1L) // the burst lands while paused
            deliver(1, "b-400", 400L, 1L)
            val rejectedWhilePaused = handedBack

            listener.startAcceptingNewMessages() // and resume re-opens it
            deliver(0, "a-300", 300L, 1L) // the broker redelivers the burst
            deliver(1, "b-400", 400L, 1L)
            monoMs += 501L
            listener.sweepStartFromStall()

            assertTrue(
                beforePause == Vector("a-100", "b-200"),
                rejectedWhilePaused.sorted == Vector("a-300", "b-400"),
                deliveredKeys == Vector("a-100", "b-200", "a-300", "b-400"),
                deliveredKeys.distinct == deliveredKeys, // exactly once each
                acknowledged.sorted == Vector("a-100", "a-300", "b-200", "b-400")
            ) ?? s"beforePause=$beforePause rejected=$rejectedWhilePaused delivered=$deliveredKeys acked=$acknowledged"
        },
        test("GUARANTEED IS AN EXACT REPLAY: the recorded range delivers to the last message, in key order, then AUTO-PAUSES") {
            // Recorded at play: stream 0 holds entries 0..1, stream 1 holds entry 0. The replay
            // must deliver ALL THREE in key order and then pause itself with the caught-up signal.
            // Against the previous hold-forever code this FAILS: after stream 1 delivered its only
            // message the barrier kept waiting for its next word forever, so a-300 was a held tail
            // and no signal ever came.
            val f = Fixture("cs-replay-boundary", topicCount = 2, endsAtPlay = Map(0 -> 1L, 1 -> 0L))
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L)
                f.deliver(0, "a-300", 300L, 1L) // stream 0's recorded end
                f.deliver(1, "b-200", 200L, 0L) // stream 1's recorded end

                assertTrue(
                    // Everything recorded is delivered - the last message included, because every
                    // end is known - in strict key order.
                    observer.deliveredKeys == Vector("a-100", "b-200", "a-300"),
                    f.acknowledged.sorted == Vector("a-100", "a-300", "b-200"),
                    // The runner-side auto-pause: intake closed, consumers held.
                    !f.listener.isAcceptingNewMessages,
                    f.pauseArbiters.values.forall(_.heldReasons.contains(PauseReason.Boundary)),
                    // And the caught-up signal went out on the stats channel.
                    observer.caughtUpFrames.nonEmpty,
                    f.merge.heldCount == 0
                ) ?? (s"delivered=${observer.deliveredKeys} acked=${f.acknowledged} " +
                    s"gateOpen=${f.listener.isAcceptingNewMessages} held=${f.merge.heldCount} " +
                    s"frames=${observer.received.size} caughtUp=${observer.caughtUpFrames.size}")
            finally f.close()
        },
        test("NO LIVE PHASE: a past-boundary arrival mid-replay is handed back, its consumer paused, and it is NOT emitted") {
            // Stream 1 races ahead: it delivers its recorded end AND a message past it while
            // stream 0 is still replaying. The past-end message belongs to the NEXT chunk - handed
            // back, consumer paused via the arbiter, no budget, no memo, no emission - and its
            // arrival is itself proof stream 1's recorded range is done. Against the previous
            // code this FAILS: the past-end message entered the merge and was emitted.
            val f = Fixture("cs-replay-next-chunk", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(1, "b-200", 200L, 0L) // stream 1's recorded end
                f.deliver(1, "b-400", 400L, 1L) // PAST the boundary: next chunk's business
                val pastEndDisposition = (f.handedBack.toVector, observer.deliveredKeys)
                val boundaryHeldEarly = f.pauseArbiters(topic(1)).heldReasons.contains(PauseReason.Boundary)
                f.deliver(0, "a-100", 100L, 0L) // stream 0 finishes the replay

                assertTrue(
                    pastEndDisposition == (Vector("b-400"), Vector.empty),
                    boundaryHeldEarly, // the racing consumer was paused the moment it crossed
                    observer.deliveredKeys == Vector("a-100", "b-200"),
                    !observer.deliveredKeys.contains("b-400"),
                    f.acknowledged.sorted == Vector("a-100", "b-200"), // b-400 was never decided
                    observer.caughtUpFrames.nonEmpty, // the replay still completed and signalled
                    // The signal knows newer messages exist: the handed-back entry was seen and
                    // counted (approximately - "~N", entries not messages).
                    observer.caughtUpFrames.exists(_.replayNewerEntriesApprox >= 1L),
                    observer.caughtUpFrames.forall(_.replayBoundaryAtMs > 0L),
                    f.merge.heldCount == 0
                ) ?? (s"pastEnd=$pastEndDisposition delivered=${observer.deliveredKeys} " +
                    s"acked=${f.acknowledged} caughtUp=${observer.caughtUpFrames.map(s => (s.replayNewerEntriesApprox, s.replayBoundaryAtMs))}")
            finally f.close()
        },
        test("RESUME EXTENDS THE BOUNDARY: the delta replays exactly, then the session auto-pauses again") {
            // Chunk 1 replays and auto-pauses. New messages land while paused (the recorded end
            // moves; the prefetched one is handed back at the gate). Resume re-captures every
            // stream's end and the SAME session replays the delta - the handed-back message
            // redelivers and now belongs to the chunk, exactly once. Against the previous code
            // this FAILS twice over: no auto-pause ever happened, and the delta message was held
            // behind the forever-silent peer stream instead of completing a chunk.
            val f = Fixture("cs-replay-extend", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L)
                f.deliver(1, "b-200", 200L, 0L)
                val chunkOne = observer.deliveredKeys
                val chunkOneCaughtUp = observer.caughtUpFrames.nonEmpty

                // Published while paused: stream 1's log grows; the prefetched copy is refused at
                // the closed gate and handed back.
                f.consumers(1).recordedEnd(1L)
                f.deliver(1, "b-400", 400L, 1L)
                val refusedWhilePaused = f.handedBack.contains("b-400")

                // Resume: the boundary extends to now, the Boundary holds lift, and the broker's
                // redelivery of b-400 is now IN the chunk.
                val second = RecordingObserver()
                f.runner.resume(second, isDebug = false)
                val boundaryLifted = f.pauseArbiters.values.forall(!_.heldReasons.contains(PauseReason.Boundary))
                f.deliver(1, "b-400", 400L, 1L)

                assertTrue(
                    chunkOne == Vector("a-100", "b-200"),
                    chunkOneCaughtUp,
                    refusedWhilePaused,
                    boundaryLifted,
                    second.deliveredKeys == Vector("b-400"), // the delta, exactly - stream 0 has no delta
                    second.caughtUpFrames.nonEmpty, // and the second chunk announces its own boundary
                    f.acknowledged.sorted == Vector("a-100", "b-200", "b-400"),
                    f.acknowledged.size == 3, // exactly once each, across the seam
                    !f.listener.isAcceptingNewMessages, // auto-paused again
                    f.merge.heldCount == 0
                ) ?? (s"chunkOne=$chunkOne delta=${second.deliveredKeys} acked=${f.acknowledged} " +
                    s"boundaryLifted=$boundaryLifted caughtUp2=${second.caughtUpFrames.size} " +
                    s"gateOpen=${f.listener.isAcceptingNewMessages}")
            finally f.close()
        },
        test("THE SEAM IS LOUD ON THE WIRE: a skewed delta row carries the per-message flag, and the stats carry the counter") {
            // The wire half of the seam contract: the merge-tier semantics live in
            // replaySeamTest; here the flagged emission is driven through the real target
            // pipeline and the real response path, so the row the browser renders carries
            // Message.replay_seam_violation and the frame's stats carry
            // ConsumerStats.replay_seam_violations.
            val f = Fixture("cs-replay-seam-wire", topicCount = 2, endsAtPlay = Map(0 -> 0L, 1 -> 0L))
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L)
                f.deliver(1, "b-200", 200L, 0L) // chunk 1 completes: max emitted key is 200
                val cleanRows = observer.deliveredMessages.map(_.replaySeamViolation)

                f.consumers(0).recordedEnd(1L) // stream 0 grew while paused
                val second = RecordingObserver()
                f.runner.resume(second, isDebug = false)
                f.deliver(0, "a-150", 150L, 1L) // the delta undercuts the emitted maximum

                assertTrue(
                    cleanRows == Vector(false, false),
                    second.deliveredKeys == Vector("a-150"), // delivered - never silently dropped
                    second.deliveredMessages.map(_.replaySeamViolation) == Vector(true), // and loudly flagged
                    second.received.flatMap(_.consumerStats).exists(_.replaySeamViolations == 1L),
                    second.caughtUpFrames.nonEmpty
                ) ?? (s"cleanRows=$cleanRows delta=${second.deliveredKeys} " +
                    s"flags=${second.deliveredMessages.map(_.replaySeamViolation)} " +
                    s"seams=${second.received.flatMap(_.consumerStats).map(_.replaySeamViolations)}")
            finally f.close()
        },
        test("the caught-up wire shape: boundary and indicator ride only with the marker, and a seam alone still surfaces stats") {
            // The pure response builder's contract for the new fields, pinned like the progress
            // shape above it: stats appear when the replay has something to say, and the
            // boundary/indicator fields never ride without the caught-up marker.
            val caughtUp = resumeResponse(
                Seq.empty,
                Vector.empty,
                None,
                replayCaughtUp = true,
                replayBoundaryAtMs = 1234L,
                replayNewerEntriesApprox = 7L,
                replayExcludedTopics = Seq("persistent://a/b/late"),
                replayExcludedTopicCount = 3
            )
            val seamOnly = resumeResponse(Seq.empty, Vector.empty, None, replaySeamViolations = 2L)
            val notCaughtUp = resumeResponse(Seq.empty, Vector.empty, None, replayBoundaryAtMs = 1234L, replayNewerEntriesApprox = 7L)
            assertTrue(
                caughtUp.consumerStats.exists(stats =>
                    stats.replayCaughtUp && stats.replayBoundaryAtMs == 1234L && stats.replayNewerEntriesApprox == 7L
                        && stats.replayExcludedTopics == Seq("persistent://a/b/late") && stats.replayExcludedTopicCount == 3
                ),
                seamOnly.consumerStats.exists(_.replaySeamViolations == 2L),
                notCaughtUp.consumerStats.isEmpty // no marker, no fields, no stats at all
            ) ?? s"caughtUp=${caughtUp.consumerStats} seamOnly=${seamOnly.consumerStats} notCaughtUp=${notCaughtUp.consumerStats}"
        },
        test("the newer-entries arithmetic is entry-honest: same-ledger exact, cross-ledger a lower bound, nothing from nothing") {
            // The pure half of the "~N newer" indicator (the broker refinement task feeds it).
            assertTrue(
                replayNewerEntriesApproxOf(EntryPosition(1, 5, -1, 1), EntryPosition(1, 9, -1, 1)) == 4L,
                replayNewerEntriesApproxOf(EntryPosition(1, 5, -1, 1), EntryPosition(1, 5, -1, 1)) == 0L,
                replayNewerEntriesApproxOf(EntryPosition(1, 5, -1, 1), EntryPosition(2, 2, -1, 1)) == 3L, // newest ledger's entries, at least
                replayNewerEntriesApproxOf(EntryPosition(1, 5, -1, 1), EntryPosition(2, -1, -1, 1)) == 1L, // rolled but unreadable: at least one
                replayNewerEntriesApproxOf(EntryPosition.empty, EntryPosition(1, 2, -1, 1)) == 3L, // nothing recorded, three entries now
                replayNewerEntriesApproxOf(EntryPosition(1, 5, -1, 1), EntryPosition.empty) == 0L, // nothing there at all
                replayNewerEntriesApproxOf(EntryPosition.empty, EntryPosition.empty) == 0L
            )
        },
        test("AN EMPTY REPLAY IS AN INSTANT CAUGHT-UP: nothing recorded means the signal fires on Play, not never") {
            // Latest + Guaranteed, and the single non-persistent stream, both land here: every
            // stream's boundary is empty, so there is nothing to replay and the session must say
            // so immediately instead of sitting silent. Against the previous code this FAILS: a
            // Guaranteed session with nothing to deliver simply never spoke.
            //
            // STRENGTHENED (2026-08-09, e2e CS-DM-R3B): the DECIDED boundary is empty while the
            // BROKER still reports a real backlog end - the actual Latest x Guaranteed shape on a
            // non-empty topic, where the seek put the cursor at the live edge PAST the backlog.
            // The old fixture handed the resume path consumers whose getLastMessageIds answered
            // empty too, so the first-play re-capture read the same ends and its OVERWRITE of the
            // live-edge boundary was invisible: this pin passed while the real session armed
            // `waiting` over the undeliverable backlog range and waited forever. The first Play
            // must CONSUME the create-time boundary - instant caught-up, and ZERO broker end
            // reads (the boundaryEndReads assertion is what makes the pin bite).
            val f = Fixture(
                "cs-replay-empty",
                topicCount = 2,
                endsAtPlay = Map(0 -> -1L, 1 -> -1L),
                brokerEnds = Some(Map(0 -> 5L, 1 -> 3L))
            )
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                assertTrue(
                    observer.caughtUpFrames.nonEmpty,
                    observer.deliveredKeys.isEmpty,
                    !f.listener.isAcceptingNewMessages,
                    f.pauseArbiters.values.forall(_.heldReasons.contains(PauseReason.Boundary)),
                    // THE NO-RE-READ ASSERTION: the first Play consumes the boundaries decided at
                    // session build; the broker is not asked for ends at all.
                    f.consumers.forall(_.boundaryEndReads.get == 0L)
                ) ?? (s"frames=${observer.received.size} caughtUp=${observer.caughtUpFrames.size} delivered=${observer.deliveredKeys} " +
                    s"endReads=${f.consumers.map(_.boundaryEndReads.get)}")
            finally f.close()
        },
        test("MIXED LIVE-EDGE AND HISTORY: the history stream's backlog replays, the live-edge stream contributes nothing, caught-up fires") {
            // One target seeks stream 1 into its history (recorded end entry 1 - two messages)
            // while stream 0 sits at the live edge over a non-empty backlog (decided boundary
            // EMPTY, broker end entry 5). The replay is exactly stream 1's recorded range; the
            // live-edge stream is never waited for and never read for ends. Against the
            // re-capturing code this FAILS: the first Play overwrote stream 0's empty boundary
            // with entry 5 - a range the cursor already sits past - so the barrier waited on it
            // forever and no caught-up ever came.
            val f = Fixture(
                "cs-replay-mixed-live-edge",
                topicCount = 2,
                endsAtPlay = Map(0 -> -1L, 1 -> 1L),
                brokerEnds = Some(Map(0 -> 5L, 1 -> 1L))
            )
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(1, "b-100", 100L, 0L)
                f.deliver(1, "b-200", 200L, 1L) // stream 1's recorded end
                assertTrue(
                    observer.deliveredKeys == Vector("b-100", "b-200"),
                    observer.caughtUpFrames.nonEmpty,
                    f.acknowledged.sorted == Vector("b-100", "b-200"),
                    !f.listener.isAcceptingNewMessages,
                    f.pauseArbiters.values.forall(_.heldReasons.contains(PauseReason.Boundary)),
                    f.consumers.forall(_.boundaryEndReads.get == 0L),
                    f.merge.heldCount == 0
                ) ?? (s"delivered=${observer.deliveredKeys} caughtUp=${observer.caughtUpFrames.size} " +
                    s"acked=${f.acknowledged} endReads=${f.consumers.map(_.boundaryEndReads.get)}")
            finally f.close()
        },
        test("A SECOND RESUME RE-CAPTURES: the live-edge stream's delta replays exactly, and only then is the broker asked for ends") {
            // The other half of "create is the first Play": SUBSEQUENT resumes must re-capture -
            // the cursor then genuinely sits at the previous chunk's boundary, so the freshly
            // read ends describe a deliverable delta. Stream 0 starts at the live edge over a
            // 6-entry backlog (instant caught-up, nothing shown - that is what Latest means);
            // one message is recorded while auto-paused; the resume reads the new end and the
            // delta replays, exactly once. Against the re-capturing code this FAILS at the first
            // step already: no instant caught-up ever fires.
            val f = Fixture(
                "cs-replay-second-resume",
                topicCount = 2,
                endsAtPlay = Map(0 -> -1L, 1 -> -1L),
                brokerEnds = Some(Map(0 -> 5L, 1 -> -1L))
            )
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                val instantCaughtUp = observer.caughtUpFrames.nonEmpty
                val readsOnFirstPlay = f.consumers.map(_.boundaryEndReads.get).sum

                // Published while auto-paused: stream 0's log grows past the live edge.
                f.consumers(0).recordedEnd(6L)
                val second = RecordingObserver()
                f.runner.resume(second, isDebug = false)
                val readsOnSecondPlay = f.consumers.map(_.boundaryEndReads.get).sum
                f.deliver(0, "a-600", 600L, 6L) // the delta - the one message past the old edge

                assertTrue(
                    instantCaughtUp,
                    readsOnFirstPlay == 0L,
                    readsOnSecondPlay > 0L, // the re-capture DID happen - later resumes extend
                    second.deliveredKeys == Vector("a-600"),
                    second.caughtUpFrames.nonEmpty, // and the extended chunk completes again
                    f.acknowledged == Vector("a-600"),
                    !f.listener.isAcceptingNewMessages,
                    f.merge.heldCount == 0
                ) ?? (s"instant=$instantCaughtUp reads=($readsOnFirstPlay, $readsOnSecondPlay) " +
                    s"delta=${second.deliveredKeys} caughtUp2=${second.caughtUpFrames.size} acked=${f.acknowledged}")
            finally f.close()
        },
        test("A FAILED RE-CAPTURE ON A LATER RESUME STILL FAILS THE RESUME LOUDLY") {
            // The first Play consumes the create-time boundary and needs no broker; a LATER
            // resume genuinely re-reads the ends, and a broker that will not answer must fail
            // that resume with the topic named - never quietly arm a boundary it did not read.
            val f = Fixture("cs-replay-recapture-fails", topicCount = 1, endsAtPlay = Map(0 -> 0L))
            try
                val observer = RecordingObserver()
                f.runner.resume(observer, isDebug = false)
                f.deliver(0, "a-100", 100L, 0L) // the whole recorded range: instant chunk, auto-pause
                val caughtUp = observer.caughtUpFrames.nonEmpty

                f.consumers(0).failLastIds = true
                val second = Try(f.runner.resume(RecordingObserver(), isDebug = false))

                assertTrue(
                    caughtUp,
                    second.isFailure,
                    second.failed.toOption.exists(_.getMessage.contains(topic(0)))
                ) ?? s"caughtUp=$caughtUp second=$second"
            finally f.close()
        }
    ) @@ TestAspect.sequential
