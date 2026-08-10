package consumer

import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.deserializer.deserializers.UseLatestTopicSchema
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.session_config.{ConsumerSessionConfig, MessageDeliveryOrder}
import _root_.consumer.session_runner.*
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.session_target.consumption_mode.modes.RegularConsumptionMode
import _root_.consumer.session_target.topic_selector.{MultiTopicSelector, TopicSelector}
import _root_.consumer.start_from.EarliestMessage
import _root_.consumer.value_projections.ValueProjectionList
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import zio.test.*

import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.{ConcurrentHashMap, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.jdk.CollectionConverters.*

/** ADMISSION: the caps that keep one browser from turning the server into a load test.
  *
  * The per-target topic cap alone was a fence with two open gates: the UI appends targets without
  * limit, so N targets multiplied the bound away, and nothing bounded how many sessions exist at
  * all - every abandoned tab used to add one forever. Three bounds close that, and each refusal
  * has to say WHY and what to do instead, because the person hitting it is mid-investigation:
  *
  *   - enabled targets per session (checked on the config alone, before any broker work);
  *   - physical streams per session, summed across targets (checked once the selectors resolved);
  *   - active sessions per server (checked at create, where a REPLACEMENT must stay admissible -
  *     the browser re-creates on every configuration change, so refusing it at the cap would
  *     strand the ordinary flow).
  */
object consumerSessionAdmissionTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/admission"

    private def targetConfig: ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = true,
            consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
            messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
            topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = Vector(topicFqn))),
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    private def sessionConfig(targets: Vector[ConsumerSessionTarget]): ConsumerSessionConfig =
        ConsumerSessionConfig(
            startFrom = EarliestMessage(),
            targets = targets,
            messageFilterChain = MessageFilterChain.empty,
            coloringRuleChain = ColoringRuleChain.empty,
            pauseTriggerChain = ConsumerSessionPauseTriggerChain.empty,
            valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
        )

    /** A runner that never touches a broker - what the injected builder hands the service. */
    private def dummyRunner(name: String): ConsumerSessionRunner =
        ConsumerSessionRunner(
            sessionName = name,
            sessionConfig = sessionConfig(Vector.empty),
            sessionContextPool = ConsumerSessionContextPool(),
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map.empty
        )

    private def createRequest(name: String): consumerPb.CreateConsumerRequest =
        consumerPb.CreateConsumerRequest(consumerName = name, consumerSessionConfig = Some(consumerPb.ConsumerSessionConfig()))

    private def create(service: ConsumerServiceImpl, name: String): consumerPb.CreateConsumerResponse =
        Await.result(service.createConsumer(createRequest(name)), Duration(60, SECONDS))

    private def worker(name: String)(body: => Unit): Thread =
        val thread = new Thread((() => body): Runnable, name)
        thread.setDaemon(true)
        thread

    /** Which top-level fields the encoded request actually carries. Setting an enum to zero in
      * memory proves nothing about what an older client puts on the wire; this reads the tags back
      * off the bytes, so "the field is absent" is a statement about the encoding. */
    private def wireFieldNumbers(bytes: Array[Byte]): Set[Int] =
        val in      = com.google.protobuf.CodedInputStream.newInstance(bytes)
        val numbers = Set.newBuilder[Int]
        var tag     = in.readTag()
        while tag != 0 do
            numbers += (tag >>> 3)
            in.skipField(tag)
            tag = in.readTag()
        numbers.result()

    def spec = suite(this.getClass.toString)(
        test("the enabled-target bound sits exactly at the cap, and the refusal names both numbers") {
            val atCap = ConsumerSessionRunner.enabledTargetCountRejectionReason("cs-adm", ConsumerSessionRunner.maxEnabledTargetsPerSession)
            val pastCap = ConsumerSessionRunner.enabledTargetCountRejectionReason("cs-adm", ConsumerSessionRunner.maxEnabledTargetsPerSession + 1)
            assertTrue(
                atCap.isEmpty,
                pastCap.exists(_.contains(s"${ConsumerSessionRunner.maxEnabledTargetsPerSession + 1} enabled targets")),
                pastCap.exists(_.contains(ConsumerSessionRunner.maxEnabledTargetsPerSession.toString))
            ) ?? s"pastCap=$pastCap"
        },
        test("the stream-total bound counts EVERY target's streams - two targets on one topic cost two") {
            val atCap = ConsumerSessionRunner.sessionStreamTotalRejectionReason("cs-adm", Vector(1_000, 1_000))
            val pastCap = ConsumerSessionRunner.sessionStreamTotalRejectionReason("cs-adm", Vector(1_000, 1_000, 1))
            assertTrue(
                atCap.isEmpty,
                pastCap.exists(_.contains("2001 physical topic streams")),
                pastCap.exists(_.contains("1000 + 1000 + 1"))
            ) ?? s"pastCap=$pastCap"
        },
        test("Best effort orders nothing on one stream; Guaranteed builds its replay layer at any width") {
            // FLIPPED PIN (owner decision 2026-08-09, the exact-replay redesign): Guaranteed used
            // to be a no-op on a single stream - one log is already in order. The replay
            // boundary, the auto-pause and the caught-up signal live in the ordering layer, so
            // Guaranteed now builds one at ANY stream count; Best effort keeps the single-stream
            // free pass, and Fastest never builds one.
            assertTrue(
                ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.Guaranteed, 1),
                !ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.BestEffort, 1),
                ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.Guaranteed, 2),
                ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.BestEffort, 2),
                !ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.AsReceived, 2),
                !ConsumerSessionRunner.needsDeliveryOrderLayer(MessageDeliveryOrder.AsReceived, 1)
            )
        },
        test("an absent delivery order resolves to Best effort, the product default, while explicit choices stay explicit") {
            // An ABSENT enum is proto3 zero - every older client and every config saved before the
            // field existed. Owner decision (2026-08-09, direct instruction): the default is Best
            // effort - supersedes the review-findings P1.1 note that said Guaranteed. A session
            // that never named an order merges with bounded lateness and never stalls on a silent
            // stream. Explicit Guaranteed and explicit Fastest are choices and are never rewritten.
            assertTrue(
                MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED) == MessageDeliveryOrder.BestEffort,
                MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_AS_RECEIVED) == MessageDeliveryOrder.AsReceived,
                MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_BEST_EFFORT_BY_PUBLISH_TIME) == MessageDeliveryOrder.BestEffort,
                MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_GUARANTEED) == MessageDeliveryOrder.Guaranteed,
                MessageDeliveryOrder.fromPb(consumerPb.MessageDeliveryOrder.Unrecognized(99)) == MessageDeliveryOrder.BestEffort,
                ConsumerSessionConfig.fromPb(consumerPb.ConsumerSessionConfig()).messageDeliveryOrder == MessageDeliveryOrder.BestEffort,
                sessionConfig(Vector.empty).messageDeliveryOrder == MessageDeliveryOrder.BestEffort
            )
        },
        test("a REQUEST whose delivery-order enum is zero on the wire resolves to Best effort") {
            // The request-side twin of the pre-field managed item: bytes an older client actually
            // sends. Proto3 omits a zero enum entirely, so the field is absent on the wire - and
            // the decoded request must still run the product default.
            val requestBytes = consumerPb.ConsumerSessionConfig()
                .withMessageDeliveryOrder(consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED)
                .toByteArray
            val decoded = consumerPb.ConsumerSessionConfig.parseFrom(requestBytes)

            assertTrue(
                // Field 8 in ConsumerSessionConfig; a protobuf tag is (fieldNumber << 3) | wireType.
                !wireFieldNumbers(requestBytes).contains(8),
                decoded.messageDeliveryOrder == consumerPb.MessageDeliveryOrder.MESSAGE_DELIVERY_ORDER_UNSPECIFIED,
                ConsumerSessionConfig.fromPb(decoded).messageDeliveryOrder == MessageDeliveryOrder.BestEffort
            ) ?? s"wireFields=${wireFieldNumbers(requestBytes)} decoded=${ConsumerSessionConfig.fromPb(decoded).messageDeliveryOrder}"
        },
        test("a config past the target cap is refused BEFORE any broker work - the clients are never touched") {
            // Null clients are the proof: reaching either would blow up with an NPE instead of the
            // admission message. Disabled targets do not count against the cap.
            val overloaded = sessionConfig(
                Vector.fill(ConsumerSessionRunner.maxEnabledTargetsPerSession + 1)(targetConfig)
                    ++ Vector(targetConfig.copy(isEnabled = false))
            )
            val outcome = scala.util.Try(
                ConsumerSessionRunner.make(pulsarClient = null, adminClient = null, sessionName = "cs-adm-wide", sessionConfig = overloaded)
            )
            assertTrue(
                outcome.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                outcome.failed.toOption.exists(_.getMessage.contains(s"${ConsumerSessionRunner.maxEnabledTargetsPerSession + 1} enabled targets"))
            ) ?? s"outcome=$outcome"
        },
        test("the session cap refuses a NEW name, keeps the map clean, and still admits a replacement") {
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val service = ConsumerServiceImpl(
                consumerSessions = sessions,
                makeSession = (name, _) => dummyRunner(name),
                maxActiveSessions = 1
            )

            val first = Await.result(service.createConsumer(createRequest("cs-adm-a")), Duration(10, SECONDS))
            val refused = Await.result(service.createConsumer(createRequest("cs-adm-b")), Duration(10, SECONDS))
            val replaced = Await.result(service.createConsumer(createRequest("cs-adm-a")), Duration(10, SECONDS))

            assertTrue(
                first.getStatus.code == com.google.rpc.code.Code.OK.value,
                refused.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                refused.getStatus.message.contains("limit"),
                !sessions.containsKey("cs-adm-b"),
                replaced.getStatus.code == com.google.rpc.code.Code.OK.value,
                sessions.size == 1
            ) ?? s"first=${first.getStatus} refused=${refused.getStatus} replaced=${replaced.getStatus}"
        },
        test("MANY DISTINCT-NAME CREATES STARTED AT cap - 1 ADMIT EXACTLY ONE: the permit covers the BUILD") {
            // THE admission defect. The count was read under a lock scoped to ONE session name and
            // the expensive build then ran BEFORE the insertion, so every concurrent create of a
            // DIFFERENT name saw the same pre-build size and every one of them passed. At an empty
            // map an arbitrary number could pass a 100-session check, each of them free to
            // subscribe up to 2,000 streams - the documented cap protected nothing at all.
            //
            // Pinned by latches, never by timing: every builder parks on `release`, so all the
            // builds this cap admits are simultaneously in flight when the peak is read, and every
            // racer has settled (refused, or parked in its build) before the peak is read at all.
            val cap = 4
            val racers = 8
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            (1 until cap).foreach(i => sessions.put(s"cs-adm-seed-$i", dummyRunner(s"cs-adm-seed-$i")))

            val settled = CountDownLatch(racers)
            val release = CountDownLatch(1)
            val buildsInFlight = AtomicInteger(0)
            val peakAdmitted = AtomicInteger(0)

            val service = ConsumerServiceImpl(
                consumerSessions = sessions,
                makeSession = (name, _) =>
                    val inFlight = buildsInFlight.incrementAndGet()
                    // INSTALLED PLUS RESERVED, which is what the cap has to bound: a build in
                    // flight already owns the consumers, threads and heap the limit is about.
                    peakAdmitted.updateAndGet(previous => math.max(previous, sessions.size + inFlight))
                    settled.countDown()
                    release.await(60, TimeUnit.SECONDS)
                    buildsInFlight.decrementAndGet()
                    dummyRunner(name),
                maxActiveSessions = cap
            )

            val responses = ConcurrentLinkedQueue[com.google.rpc.status.Status]()
            val threads = (1 to racers).map(i =>
                worker(s"cs-adm-race-$i") {
                    val response = create(service, s"cs-adm-race-$i")
                    responses.add(response.getStatus)
                    // A REFUSED create never reaches the builder, so it settles here instead.
                    if response.getStatus.code != com.google.rpc.code.Code.OK.value then settled.countDown()
                }
            )
            threads.foreach(_.start())
            val everyRacerSettled = settled.await(60, TimeUnit.SECONDS)
            val peakWhileBuilding = peakAdmitted.get
            release.countDown()
            threads.foreach(_.join(60_000))

            val statuses = responses.asScala.toVector
            assertTrue(
                everyRacerSettled,
                peakWhileBuilding <= cap,
                statuses.count(_.code == com.google.rpc.code.Code.OK.value) == 1,
                statuses.count(_.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value) == racers - 1,
                statuses.filter(_.code != com.google.rpc.code.Code.OK.value).forall(_.message.contains("limit")),
                sessions.size == cap,
                service.admittedSessionCount == cap
            ) ?? (s"peakWhileBuilding=$peakWhileBuilding cap=$cap installed=${sessions.size} " +
                s"admitted=${service.admittedSessionCount} statuses=${statuses.map(_.code)}")
        },
        test("A REPLACEMENT AT THE CAP HOLDS ITS PREDECESSOR'S PERMIT for the whole build") {
            // The other half of the same permit: the browser re-creates a session on every
            // configuration change, so a replacement must stay admissible at the cap - and it must
            // not do that by leaving the freed slot lying around for a DIFFERENT name to take
            // while the replacement is still building.
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            sessions.put("cs-adm-replace", dummyRunner("cs-adm-replace"))

            val building = CountDownLatch(1)
            val release = CountDownLatch(1)
            val service = ConsumerServiceImpl(
                consumerSessions = sessions,
                makeSession = (name, _) =>
                    if name == "cs-adm-replace" then
                        building.countDown()
                        release.await(60, TimeUnit.SECONDS)
                    dummyRunner(name),
                maxActiveSessions = 1
            )

            val replacing = worker("cs-adm-replacing")(create(service, "cs-adm-replace"))
            replacing.start()
            val replacementIsBuilding = building.await(60, TimeUnit.SECONDS)

            // The predecessor is gone from the map by now, so the ONLY thing standing between this
            // create and a second session is the permit the replacement is holding across its build.
            val intruder = create(service, "cs-adm-intruder")
            val admittedDuringTheBuild = service.admittedSessionCount

            release.countDown()
            replacing.join(60_000)

            assertTrue(
                replacementIsBuilding,
                intruder.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                intruder.getStatus.message.contains("limit"),
                !sessions.containsKey("cs-adm-intruder"),
                admittedDuringTheBuild == 1,
                sessions.size == 1,
                sessions.containsKey("cs-adm-replace"),
                service.admittedSessionCount == 1
            ) ?? (s"intruder=${intruder.getStatus} admittedDuringTheBuild=$admittedDuringTheBuild " +
                s"installed=${sessions.keySet.asScala.toVector.sorted} admitted=${service.admittedSessionCount}")
        },
        test("a build that FAILS gives its permit back, and so does a delete") {
            // A permit that leaked on the failure path would be worse than no permit at all: the
            // server would refuse sessions it is not running, and only a restart would clear it.
            val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
            val fail = java.util.concurrent.atomic.AtomicBoolean(true)
            val service = ConsumerServiceImpl(
                consumerSessions = sessions,
                makeSession = (name, _) =>
                    if fail.get then throw new RuntimeException("the broker refused every consumer")
                    else dummyRunner(name),
                maxActiveSessions = 1
            )

            val failed = create(service, "cs-adm-doomed")
            val admittedAfterTheFailure = service.admittedSessionCount
            fail.set(false)
            val afterFailure = create(service, "cs-adm-after-failure")
            val deleted = Await.result(
                service.deleteConsumer(consumerPb.DeleteConsumerRequest(consumerName = "cs-adm-after-failure")),
                Duration(60, SECONDS)
            )
            val afterDelete = create(service, "cs-adm-after-delete")

            assertTrue(
                failed.getStatus.code == com.google.rpc.code.Code.FAILED_PRECONDITION.value,
                admittedAfterTheFailure == 0,
                afterFailure.getStatus.code == com.google.rpc.code.Code.OK.value,
                deleted.getStatus.code == com.google.rpc.code.Code.OK.value,
                afterDelete.getStatus.code == com.google.rpc.code.Code.OK.value,
                service.admittedSessionCount == 1
            ) ?? (s"failed=${failed.getStatus} admittedAfterTheFailure=$admittedAfterTheFailure " +
                s"afterFailure=${afterFailure.getStatus} afterDelete=${afterDelete.getStatus}")
        }
    ) @@ TestAspect.sequential
