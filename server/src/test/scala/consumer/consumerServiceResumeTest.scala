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

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import scala.jdk.CollectionConverters.*

/** What `ConsumerServiceImpl.resume` does with the flags on the request it was handed.
  *
  * Regression context: `ResumeRequest.include_consumer_stats` has existed in the proto since the
  * progress API was added, and the browser sets it - but the service read only `is_debug` off the
  * request and passed that alone to the session. Every client therefore received consumer stats,
  * including the MESSAGE-LESS progress frames a skip in flight pushes, whether or not it had said
  * it could handle them.
  *
  * The session map is a constructor parameter so this test can put a real session behind the RPC
  * without a broker: everything the resume path touches is the runner and the observer.
  */
object consumerServiceResumeTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/resume-flags"

    private final class RecordingObserver extends io.grpc.stub.StreamObserver[consumerPb.ResumeResponse]:
        private val responses = java.util.concurrent.ConcurrentLinkedQueue[consumerPb.ResumeResponse]()
        val completed = java.util.concurrent.atomic.AtomicBoolean(false)
        val nextAfterCompleted = java.util.concurrent.atomic.AtomicInteger(0)
        override def onNext(value: consumerPb.ResumeResponse): Unit =
            if completed.get then nextAfterCompleted.incrementAndGet()
            responses.add(value)
            ()
        override def onError(t: Throwable): Unit = ()
        override def onCompleted(): Unit = completed.set(true)
        def received: Vector[consumerPb.ResumeResponse] = responses.asScala.toVector
        def statsFrames: Vector[consumerPb.ConsumerStats] = received.flatMap(_.consumerStats)

    /** A consumer whose `resume()` throws - the late-target failure that used to leave earlier
      * targets' listeners pushing into an observer the catch had already completed. */
    private def resumeThrowingConsumer(): org.apache.pulsar.client.api.Consumer[Array[Byte]] =
        val handler = new java.lang.reflect.InvocationHandler:
            override def invoke(proxy: Object, method: java.lang.reflect.Method, args: Array[Object]): Object =
                method.getName match
                    case "resume"   => throw new IllegalStateException("the broker refused to resume this consumer")
                    case "getTopic" => topicFqn
                    case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                    case "toString" => "proxy-consumer(resume-throws)"
                    case _          => null
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
            consumerListener = consumerListener,
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )

    private def session(consumerListener: ConsumerListener): ConsumerSessionRunner =
        sessionWith(Map(0 -> targetRunner(consumerListener)))

    private def sessionWith(targets: Map[Int, ConsumerSessionTargetRunner]): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = "cs-resume-flags",
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
            targets = targets
        )

    /** A service holding one session that is part-way through a skip of 3. */
    private def serviceWithSkippingSession(): (ConsumerServiceImpl, ConsumerListener) =
        val l = listener()
        l.startFromDiscard = StartFromDiscard.shared(3)
        val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
        sessions.put("cs-resume-flags", session(l))
        (ConsumerServiceImpl(sessions), l)

    def spec = suite(this.getClass.toString)(
        test("include_consumer_stats = false really does suppress the stats") {
            val (service, l) = serviceWithSkippingSession()
            val observer = RecordingObserver()

            service.resume(
                consumerPb.ResumeRequest(consumerName = "cs-resume-flags", includeConsumerStats = false, isDebug = false),
                observer
            )
            (1 to 3).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(observer.statsFrames.isEmpty, observer.received.isEmpty) ??
                s"the request asked for no consumer stats and got ${observer.received.size} frames: ${observer.statsFrames}"
        },
        test("include_consumer_stats = true delivers them") {
            val (service, l) = serviceWithSkippingSession()
            val observer = RecordingObserver()

            service.resume(
                consumerPb.ResumeRequest(consumerName = "cs-resume-flags", includeConsumerStats = true, isDebug = false),
                observer
            )
            (1 to 3).foreach(_ => l.decide(topicFqn, canAcknowledge = true))

            assertTrue(
                observer.statsFrames.flatMap(_.startFromProgress).map(_.messagesToSkip) == Vector(3L, 3L)
            ) ?? s"got ${observer.statsFrames}"
        },
        test("resuming a session that does not exist is still a clean FAILED_PRECONDITION") {
            val service = ConsumerServiceImpl(new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]())
            val observer = RecordingObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "nope", includeConsumerStats = true), observer)

            assertTrue(
                observer.received.size == 1,
                observer.received.head.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value
            )
        },
        test("A RESUME THAT FAILS MID-WIRING ENDS THE STREAM THROUGH THE TERMINAL GATE, exactly once") {
            // Two targets: the first resumes fine and its listener threads may already be pushing;
            // the second throws. The catch used to write a status frame and onCompleted STRAIGHT to
            // the observer - outside the send lock, without setting the terminal flag - so the
            // earlier target's pushes kept landing in a stream that had already ended.
            val healthy = listener()
            val broken = listener()
            val runner = sessionWith(Map(
                0 -> targetRunner(healthy),
                1 -> targetRunner(broken, consumers = Map(topicFqn -> resumeThrowingConsumer()))
            ))
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-resume-flags", runner)
            val service = ConsumerServiceImpl(sessions)
            val observer = RecordingObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-resume-flags", includeConsumerStats = true), observer)
            val framesAfterCatch = observer.received.size

            // A listener thread still in flight pushes now: the terminal flag must silence it.
            runner.sendResponse(observer, Seq(consumerPb.Message()), Vector.empty)

            assertTrue(
                framesAfterCatch == 1,
                observer.received.head.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                observer.completed.get,
                observer.received.size == 1,
                observer.nextAfterCompleted.get == 0
            ) ?? (s"framesAfterCatch=$framesAfterCatch total=${observer.received.size} " +
                s"nextAfterCompleted=${observer.nextAfterCompleted.get} completed=${observer.completed.get}")
        },
        test("RESUMING A SESSION WHOSE STREAM HAS ENDED answers non-OK instead of wiring a dead runner") {
            // The delete/resume race, after the delete has won: the runner is stopped (terminal)
            // but still reachable. Wiring the fresh observer into it hung the play stream silently
            // - the terminal flag swallows every send, so the client waited on a stream that could
            // never speak. It must be answered and completed instead; its remedy is to recreate.
            val runner = session(listener())
            runner.stop()
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-resume-flags", runner)
            val service = ConsumerServiceImpl(sessions)
            val observer = RecordingObserver()

            service.resume(consumerPb.ResumeRequest(consumerName = "cs-resume-flags", includeConsumerStats = true), observer)

            assertTrue(
                observer.received.size == 1,
                observer.received.head.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                observer.completed.get
            ) ?? s"a dead runner answered with frames=${observer.received.size} completed=${observer.completed.get}"
        }
    ) @@ TestAspect.sequential
