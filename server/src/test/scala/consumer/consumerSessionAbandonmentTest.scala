package consumer

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.ConsumerSessionConfig
import _root_.consumer.session_runner.*
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import zio.test.*

import java.util.concurrent.{ConcurrentHashMap, TimeUnit}
import java.util.concurrent.atomic.AtomicLong
import scala.jdk.CollectionConverters.*

/** THE CLIENT THAT VANISHES: what happens to a session when nobody says goodbye.
  *
  * The browser sends its Delete RPC from `beforeunload`, where delivery is best-effort - so a
  * closed tab, a dropped connection or a crashed laptop leaves the session's consumers connected,
  * consuming and acknowledging into a dead stream, and (once their namespace is deleted)
  * reconnect-looping for the life of the process. A real run demonstrated exactly that: a session
  * still fighting for a deleted namespace half an hour after its tab was gone.
  *
  * Three mechanisms end that, and this suite pins each without a broker:
  *   - the transport CANCELLATION handler pauses intake the moment the call dies;
  *   - a repeated Resume COMPLETES the predecessor stream instead of silently starving it;
  *   - the idle JANITOR stops and removes sessions that have had no live play stream for the TTL
  *     - and, when every consumer is also DISCONNECTED, on a much shorter leash.
  */
object consumerSessionAbandonmentTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/abandonment"

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val responses = java.util.concurrent.ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        val completed = java.util.concurrent.atomic.AtomicBoolean(false)
        val completions = java.util.concurrent.atomic.AtomicInteger(0)
        val nextAfterCompleted = java.util.concurrent.atomic.AtomicInteger(0)
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if completed.get then nextAfterCompleted.incrementAndGet()
            responses.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit =
            completed.set(true)
            completions.incrementAndGet()
            ()
        def received: Vector[consumerPb.ResumeResponse] = responses.asScala.toVector

    /** The shape gRPC actually hands a server-streaming call: a ServerCallStreamObserver whose
      * cancellation handler the service must install. `fireCancel` is the transport reporting the
      * call dead - it runs the handler synchronously, like grpc-java does on its executor.
      *
      * @param cancelOnHandlerRegistration
      *   the call is ALREADY dead when the handler is installed, so the transport runs it right
      *   there. That pins the one window the service cannot close by ordering alone: the cancel
      *   callback has to be registered before the per-name lifecycle lock is taken (gRPC only
      *   allows handler registration early), and the observer is wired into the runner only
      *   afterwards - so this cancellation runs against a runner it was never wired into.
      */
    private final class CancellableServerObserver(cancelOnHandlerRegistration: Boolean = false)
        extends io.grpc.stub.ServerCallStreamObserver[consumerPb.ResumeResponse]:
        val delegate = RecordingObserver()
        @volatile private var cancelHandler: Option[Runnable] = None
        @volatile private var cancelledFlag = false
        def fireCancel(): Unit =
            cancelledFlag = true
            cancelHandler.foreach(_.run())
        def hasCancelHandler: Boolean = cancelHandler.isDefined
        override def isCancelled: Boolean = cancelledFlag
        override def setOnCancelHandler(handler: Runnable): Unit =
            cancelHandler = Some(handler)
            if cancelOnHandlerRegistration then fireCancel()
        override def setOnCloseHandler(handler: Runnable): Unit = ()
        override def setCompression(compression: String): Unit = ()
        override def isReady: Boolean = true
        override def setOnReadyHandler(handler: Runnable): Unit = ()
        override def disableAutoInboundFlowControl(): Unit = ()
        override def request(count: Int): Unit = ()
        override def setMessageCompression(enable: Boolean): Unit = ()
        override def onNext(value: consumerPb.ResumeResponse): Unit = delegate.onNext(value)
        override def onError(t: Throwable): Unit = delegate.onError(t)
        override def onCompleted(): Unit = delegate.onCompleted()

    /** A consumer that records every client call by name; async methods answer a completed future
      * so a stop() walking the full release path never trips over the proxy. `connected` is the
      * broker's side of the story - what `isConnected` answers the janitor - and the tests flip
      * it to play a broker outage or a deleted topic without a broker. Answered directly, not
      * logged: it is a poll, not a lifecycle command. */
    private final class RecordingConsumer:
        private val callLog = java.util.concurrent.ConcurrentLinkedQueue[String]()
        def calls: Vector[String] = callLog.asScala.toVector
        @volatile var connected: Boolean = true
        val consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]] =
            val handler = new java.lang.reflect.InvocationHandler:
                override def invoke(proxy: Object, method: java.lang.reflect.Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"    => topicFqn
                        case "isConnected" => java.lang.Boolean.valueOf(connected)
                        case "equals"      => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode"    => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString"    => "recording-consumer"
                        case name =>
                            callLog.add(name)
                            if method.getReturnType == classOf[java.util.concurrent.CompletableFuture[?]]
                            then java.util.concurrent.CompletableFuture.completedFuture(null)
                            else null
            java.lang.reflect.Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[org.apache.pulsar.client.api.Consumer[Array[Byte]]]), handler)
                .asInstanceOf[org.apache.pulsar.client.api.Consumer[Array[Byte]]]

    private def listener(): ConsumerListener =
        val l = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
        l.startAcceptingNewMessages()
        l

    private def targetRunner(
        consumerListener: ConsumerListener,
        consumers: Map[String, org.apache.pulsar.client.api.Consumer[Array[Byte]]] = Map.empty
    ): ConsumerSessionTargetRunner =
        ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicFqn))),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = Vector(topicFqn),
            schemasByTopic = Map.empty,
            sessionContextPool = ConsumerSessionContextPool(),
            consumers = consumers,
            pauseArbiters = consumers.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(sessionName: String, target: ConsumerSessionTargetRunner): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = sessionName,
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
            targets = Map(0 -> target)
        )

    private val ttlNanos = TimeUnit.MINUTES.toNanos(10)
    private def wellPastTtl: Long = System.nanoTime() + ttlNanos + TimeUnit.MINUTES.toNanos(1)

    private def serviceWith(entries: (String, ConsumerSessionRunner)*): (ConsumerServiceImpl, ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]) =
        val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
        entries.foreach((name, runner) => sessions.put(name, runner))
        (ConsumerServiceImpl(consumerSessions = sessions, idleSessionTtlNanos = ttlNanos), sessions)

    /** Far enough below [[ttlNanos]] (10 minutes) that several grace windows fit inside the TTL:
      * every "reaped at the grace" assertion below is therefore about the SHORT rule, never an
      * accidental TTL expiry. */
    private val graceNanos = TimeUnit.MINUTES.toNanos(2)

    private def serviceWithGrace(entries: (String, ConsumerSessionRunner)*): (ConsumerServiceImpl, ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]) =
        val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
        entries.foreach((name, runner) => sessions.put(name, runner))
        (ConsumerServiceImpl(consumerSessions = sessions, idleSessionTtlNanos = ttlNanos, disconnectedSessionGraceNanos = graceNanos), sessions)

    def spec = suite(this.getClass.toString)(
        test("THE VANISHED CLIENT: cancellation pauses intake at once, and the janitor reaps the session after the TTL") {
            val recording = RecordingConsumer()
            val runner = session("cs-vanished", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWith("cs-vanished" -> runner)
            val observer = CancellableServerObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-vanished", includeConsumerStats = true), observer)
            val handlerInstalled = observer.hasCancelHandler
            val reapableWhileLive = runner.reapableSinceNanos
            val pausesBeforeCancel = recording.calls.count(_ == "pause")

            observer.fireCancel() // the tab closed; the Delete RPC never arrived

            val pausedByCancellation = recording.calls.count(_ == "pause") > pausesBeforeCancel
            val idleClockStarted = runner.reapableSinceNanos.isDefined
            val reaped = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                handlerInstalled,
                reapableWhileLive.isEmpty,
                pausedByCancellation,
                idleClockStarted,
                reaped == Vector("cs-vanished"),
                !sessions.containsKey("cs-vanished"),
                runner.isStreamCompleted
            ) ?? s"calls=${recording.calls} reaped=$reaped"
        },
        test("A CANCELLATION THAT WINS THE WIRING WINDOW WIRES NOTHING, RESUMES NOTHING, AND LEAVES THE SESSION REAPABLE") {
            // The narrow window the previous test cannot reach: it cancels only after a synchronous
            // Resume has RETURNED, so the observer is wired and the compare-and-clear inside the
            // runner does its job. Here the call dies between callback registration and wiring -
            // `onPlayStreamCancelled` finds no matching observer, answers false, and does nothing.
            //
            // What must NOT follow is the resume wiring an already-dead stream: that opens intake
            // and resumes the consumers (every message then fails into a stream nobody holds and is
            // nacked forever) and clears the idle clock, so the janitor can never see the session as
            // abandoned and its subscription pins broker resources for the life of the process.
            val recording = RecordingConsumer()
            // Gate CLOSED, like a session that has never been played - `listener()` opens it.
            val gateClosed = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
            val runner = session("cs-cancel-race", targetRunner(gateClosed, consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWith("cs-cancel-race" -> runner)
            val observer = CancellableServerObserver(cancelOnHandlerRegistration = true)

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-cancel-race", includeConsumerStats = true), observer)

            val intakeOpened = gateClosed.isAcceptingNewMessages
            val consumersResumed = recording.calls.contains("resume")
            val idleClockRunning = runner.reapableSinceNanos.isDefined
            val reaped = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                !intakeOpened,
                !consumersResumed,
                idleClockRunning,
                reaped == Vector("cs-cancel-race"),
                !sessions.containsKey("cs-cancel-race")
            ) ?? (s"intakeOpened=$intakeOpened consumersResumed=$consumersResumed " +
                s"idleClockRunning=$idleClockRunning reaped=$reaped calls=${recording.calls}")
        },
        test("A SECOND PLAY COMPLETES THE FIRST STREAM instead of starving it, and pushes reach only the successor") {
            val l = listener()
            l.startFromDiscard = StartFromDiscard.shared(2)
            val runner = session("cs-two-plays", targetRunner(l))
            val (service, _) = serviceWith("cs-two-plays" -> runner)
            val first = RecordingObserver()
            val second = RecordingObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-two-plays", includeConsumerStats = true), first)
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-two-plays", includeConsumerStats = true), second)
            (1 to 2).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(
                first.completed.get,
                first.completions.get == 1,
                first.received.isEmpty,
                first.nextAfterCompleted.get == 0,
                !second.completed.get,
                second.received.nonEmpty
            ) ?? s"first=${first.received.size} frames, second=${second.received.size} frames"
        },
        test("a LATE cancellation of the replaced stream is stale news - the successor's play is untouched") {
            val recording = RecordingConsumer()
            val runner = session("cs-late-cancel", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, _) = serviceWith("cs-late-cancel" -> runner)
            val first = CancellableServerObserver()
            val second = CancellableServerObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-late-cancel", includeConsumerStats = true), first)
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-late-cancel", includeConsumerStats = true), second)
            first.fireCancel() // the old tab's stream dies AFTER the new play was wired

            assertTrue(
                first.delegate.completed.get, // said goodbye by the second resume, not left hanging
                !recording.calls.contains("pause"),
                runner.reapableSinceNanos.isEmpty
            ) ?? s"calls=${recording.calls}"
        },
        test("a send built for a REPLACED observer refuses loudly instead of vanishing into an ack") {
            // The in-flight window of a second Play: an old handler closure still holds the old
            // observer while the new one is being wired. Writing to it could silently disappear
            // (grpc-java drops writes to a cancelled call once a cancel handler is installed),
            // and the caller would then ACKNOWLEDGE a message no client received. The send must
            // throw instead, so the caller's failure path hands the message back for redelivery.
            val runner = session("cs-stale-send", targetRunner(listener()))
            val (service, _) = serviceWith("cs-stale-send" -> runner)
            val first = RecordingObserver()
            val second = RecordingObserver()
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-stale-send", includeConsumerStats = true), first)
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-stale-send", includeConsumerStats = true), second)

            val staleRefused = scala.util.Try(runner.sendResponse(first, Seq(consumerPb.Message()), Vector.empty)).isFailure
            runner.sendResponse(second, Seq(consumerPb.Message()), Vector.empty)

            assertTrue(
                staleRefused,
                first.nextAfterCompleted.get == 0, // nothing leaked into the finished stream
                second.received.nonEmpty
            ) ?? s"staleRefused=$staleRefused second=${second.received.size}"
        },
        test("the janitor reaps the never-resumed and the terminal, and leaves the live stream alone") {
            // Three fates in one map: a session created and forgotten (its idle clock started at
            // construction), one whose stream ended terminally, and one somebody is WATCHING.
            val abandoned = session("cs-never-resumed", targetRunner(listener()))
            val failed = session("cs-terminal", targetRunner(listener()))
            val live = session("cs-live", targetRunner(listener()))
            val (service, sessions) = serviceWith("cs-never-resumed" -> abandoned, "cs-terminal" -> failed, "cs-live" -> live)

            failed.failAndComplete(com.google.rpc.status.Status(code = com.google.rpc.code.Code.FAILED_PRECONDITION.value, message = "boom"))
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-live", includeConsumerStats = true), RecordingObserver())

            val reaped = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                reaped.toSet == Set("cs-never-resumed", "cs-terminal"),
                sessions.keySet.asScala.toSet == Set("cs-live"),
                !live.isStreamCompleted
            ) ?? s"reaped=$reaped remaining=${sessions.keySet.asScala}"
        },
        test("a session younger than the TTL is not touched, however idle it is right now") {
            val runner = session("cs-fresh", targetRunner(listener()))
            val (service, sessions) = serviceWith("cs-fresh" -> runner)

            val reaped = service.reapIdleSessions(System.nanoTime()) // now: idle for ~0 of the TTL

            assertTrue(reaped.isEmpty, sessions.containsKey("cs-fresh"), !runner.isStreamCompleted)
        },
        test("DISCONNECTED AND UNWATCHED: reaped after the short grace, not after the hour") {
            // The defect the short leash exists for: the tab is gone (no live stream) and the
            // broker connection is gone too - in the worst case because the topics themselves
            // were force-deleted, where the consumers reconnect-loop and can NEVER recover.
            // Waiting out the full TTL is an hour of retry spam for a session nobody can see.
            val recording = RecordingConsumer()
            recording.connected = false
            val runner = session("cs-dead-weight", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWithGrace("cs-dead-weight" -> runner)

            val t0 = System.nanoTime()
            val firstSighting = service.reapIdleSessions(t0)
            val afterGrace = service.reapIdleSessions(t0 + graceNanos)
            val afterTtl = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                firstSighting.isEmpty, // one sighting is a blip until it is seen to HOLD
                afterGrace == Vector("cs-dead-weight"), // reaped in minutes, not at the TTL
                afterTtl.isEmpty, // long gone by the time the TTL would have said so
                !sessions.containsKey("cs-dead-weight"),
                runner.isStreamCompleted
            ) ?? s"firstSighting=$firstSighting afterGrace=$afterGrace afterTtl=$afterTtl"
        },
        test("PAUSED BUT CONNECTED: the user in a meeting keeps the whole hour, not the short grace") {
            // No live play stream - the ordinary UI pause cancels its stream - but the consumers
            // are still CONNECTED: nothing says this client is gone rather than merely quiet.
            // The full TTL is that user's contract, and the short leash must not shorten it.
            val recording = RecordingConsumer() // connected, like any healthy paused session
            val runner = session("cs-meeting", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWithGrace("cs-meeting" -> runner)

            val t0 = System.nanoTime()
            val withinTtl = Vector(t0, t0 + graceNanos, t0 + 4 * graceNanos).flatMap(service.reapIdleSessions)
            val stillThere = sessions.containsKey("cs-meeting")
            val afterTtl = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                withinTtl.isEmpty, // sweeps at, and well past, the grace: never reaped early
                stillThere,
                afterTtl == Vector("cs-meeting") // the 1-hour TTL still bounds the forever case
            ) ?? s"withinTtl=$withinTtl afterTtl=$afterTtl"
        },
        test("A BROKER BLIP WHILE THE USER WATCHES: the live stream protects the session, however long the disconnect") {
            // Every consumer down - a broker restart, say - but somebody holds the play stream.
            // The no-live-stream condition fails, so disconnection alone must never reap: when
            // the broker returns the consumers reconnect, and the watching user never noticed.
            val recording = RecordingConsumer()
            recording.connected = false
            val runner = session("cs-watched-blip", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWithGrace("cs-watched-blip" -> runner)
            service.resume(consumerPb.ResumeRequest(consumerName = "cs-watched-blip", includeConsumerStats = true), RecordingObserver())

            val t0 = System.nanoTime()
            val sweeps = Vector(t0, t0 + graceNanos, wellPastTtl).flatMap(service.reapIdleSessions)

            assertTrue(
                sweeps.isEmpty,
                sessions.containsKey("cs-watched-blip"),
                !runner.isStreamCompleted
            ) ?? s"sweeps=$sweeps"
        },
        test("ONE CONSUMER STILL CONNECTED: a partially disconnected session is not for the short leash") {
            // Half the partitions lost their broker, half are fine - a session doing real work
            // through a partial outage. EVERY consumer must be gone before the early rule may
            // conclude there is nothing left to lose.
            val dropped = RecordingConsumer()
            dropped.connected = false
            val healthy = RecordingConsumer()
            val runner = session(
                "cs-half-connected",
                targetRunner(listener(), consumers = Map(s"$topicFqn-p0" -> dropped.consumer, s"$topicFqn-p1" -> healthy.consumer))
            )
            val (service, sessions) = serviceWithGrace("cs-half-connected" -> runner)

            val t0 = System.nanoTime()
            val withinTtl = Vector(t0, t0 + graceNanos, t0 + 4 * graceNanos).flatMap(service.reapIdleSessions)
            val afterTtl = service.reapIdleSessions(wellPastTtl)

            assertTrue(
                withinTtl.isEmpty, // never reaped early while one consumer still holds on
                afterTtl == Vector("cs-half-connected") // the TTL remains its only bound
            ) ?? s"withinTtl=$withinTtl afterTtl=$afterTtl"
        },
        test("FLAPPING CONNECTIVITY: a reconnect restarts the window - blips never accumulate into a reap") {
            // The sustained-window requirement, pinned: disconnected at one sweep, back at the
            // next, gone again at the third. Each recovery clears the clock, so only a
            // disconnection that HOLDS across the whole window reaps.
            val recording = RecordingConsumer()
            recording.connected = false
            val runner = session("cs-flapping", targetRunner(listener(), consumers = Map(topicFqn -> recording.consumer)))
            val (service, sessions) = serviceWithGrace("cs-flapping" -> runner)

            val t0 = System.nanoTime()
            val down = service.reapIdleSessions(t0)
            recording.connected = true // the broker came back between sweeps
            val recovered = service.reapIdleSessions(t0 + graceNanos)
            recording.connected = false // and went away again
            val downAgain = service.reapIdleSessions(t0 + 2 * graceNanos)
            val sustained = service.reapIdleSessions(t0 + 3 * graceNanos)

            assertTrue(
                down.isEmpty,
                recovered.isEmpty,
                downAgain.isEmpty, // the sighting before the recovery is FORGOTTEN - a fresh window starts here
                sustained == Vector("cs-flapping"), // held for the window: now it is dead weight
                !sessions.containsKey("cs-flapping")
            ) ?? s"down=$down recovered=$recovered downAgain=$downAgain sustained=$sustained"
        }
    ) @@ TestAspect.sequential
