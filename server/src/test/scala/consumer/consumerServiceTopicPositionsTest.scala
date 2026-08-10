package consumer

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
import _root_.pulsar_auth.RequestContext
import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer.{GetTopicPositionsRequest, GetTopicPositionsResponse}
import consumer.session_runner.{
    ConsumerListener,
    ConsumerPauseArbiter,
    ConsumerSessionContextPool,
    ConsumerSessionRunner,
    ConsumerSessionTargetMessageHandler,
    ConsumerSessionTargetRunner,
    ConsumerSessionTargetStats,
    TopicConsumedBounds,
    TopicCursor,
    mergeConsumedBounds,
    topicPositionLookupParallelism
}
import org.apache.pulsar.client.admin.{PulsarAdmin, Topics}
import org.apache.pulsar.client.api.{Consumer, Schema}
import org.apache.pulsar.client.impl.{MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.atomic.{AtomicInteger, AtomicLong, AtomicReference}
import java.util.concurrent.{ConcurrentHashMap, CountDownLatch, TimeUnit}
import scala.concurrent.duration.{Duration, SECONDS}
import scala.concurrent.{Await, Future}

/** The Topic Positions RPC and the cursor bookkeeping behind it.
  *
  * The arithmetic lives in `topicPositionsTest`; what is pinned here is everything that arithmetic
  * cannot see - the answer for a session that does not exist, and how the read position is
  * accumulated across listener threads and across targets that share a topic.
  *
  * NO BROKER. The session lookup happens before the admin client is resolved, so the not-found path
  * runs without a request context; the cursor paths are the listener's own state.
  */
object consumerServiceTopicPositionsTest extends ZIOSpecDefault:

    /** A broker admin whose every lookup is counted, held at a gate, and watched for how many run
      * at once - the three things the Topic Positions poll has to be honest about. */
    private final class CountingAdmin(gate: CountDownLatch):
        val examineCalls = AtomicInteger(0)
        val statsCalls = AtomicInteger(0)
        val inFlight = AtomicInteger(0)
        val peakInFlight = AtomicInteger(0)
        val firstLookupStarted = CountDownLatch(1)

        private def held[A](answer: => A): A =
            val current = inFlight.incrementAndGet()
            peakInFlight.updateAndGet(previous => math.max(previous, current))
            firstLookupStarted.countDown()
            gate.await(120, TimeUnit.SECONDS)
            try answer
            finally inFlight.decrementAndGet()

        private def examined(topicFqn: String): MessageImpl[Array[Byte]] =
            val md = new MessageMetadata()
            md.setPublishTime(1_000L)
            val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap("{}".getBytes("UTF-8")), Schema.BYTES, topicFqn)
            msg.setMessageId(new MessageIdImpl(1L, 1L, -1))
            msg

        private val topicsApi: Topics =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "examineMessage" =>
                            examineCalls.incrementAndGet()
                            held(examined(args(0).asInstanceOf[String]))
                        case "getInternalStats" =>
                            statsCalls.incrementAndGet()
                            held {
                                val stats = new org.apache.pulsar.common.policies.data.PersistentTopicInternalStats()
                                stats.numberOfEntries = 10L
                                stats.currentLedgerEntries = 10L
                                stats
                            }
                        case "toString" => "proxy-topics"
                        case _          => null
            Proxy.newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Topics]), handler).asInstanceOf[Topics]

        val admin: PulsarAdmin =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "topics"   => topicsApi
                        case "toString" => "proxy-admin"
                        case _          => null
            Proxy.newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[PulsarAdmin]), handler).asInstanceOf[PulsarAdmin]

    private def proxyConsumer(topicFqn: String): Consumer[Array[Byte]] =
        val handler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "getTopic"   => topicFqn
                    case "equals"     => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode"   => java.lang.Integer.valueOf(topicFqn.hashCode)
                    case "toString"   => s"proxy-consumer($topicFqn)"
                    case _            => null
        Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
            .asInstanceOf[Consumer[Array[Byte]]]

    /** A session over `topicCount` physical topics - the wide shape a partitioned selector produces
      * and the one the poll's cost is measured in. */
    private def wideSession(sessionName: String, topicCount: Int): ConsumerSessionRunner =
        val consumers = (1 to topicCount).map(i => s"persistent://public/default/$sessionName-partition-$i" -> proxyConsumer(s"$sessionName-$i")).toMap
        val pool = ConsumerSessionContextPool()
        val target = ConsumerSessionTargetRunner(
            targetIndex = 0,
            targetConfig = ConsumerSessionTarget(
                isEnabled = true,
                consumptionMode = ConsumerSessionTargetConsumptionMode(mode = RegularConsumptionMode()),
                messageValueDeserializer = Deserializer(deserializer = UseLatestTopicSchema()),
                topicSelector = TopicSelector(topicSelector = MultiTopicSelector(topicFqns = consumers.keys.toVector)),
                messageFilterChain = MessageFilterChain.empty,
                coloringRuleChain = ColoringRuleChain.empty,
                valueProjectionList = ValueProjectionList(isEnabled = false, projections = Vector.empty)
            ),
            nonPartitionedTopicFqns = consumers.keys.toVector,
            schemasByTopic = Map.empty,
            sessionContextPool = pool,
            consumers = consumers,
            pauseArbiters = consumers.map((fqn, c) => fqn -> ConsumerPauseArbiter(c)),
            consumerListener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ())),
            stats = ConsumerSessionTargetStats(messageProcessed = AtomicLong(0))
        )
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
            sessionContextPool = pool,
            grpcResponseObserver = None,
            schemasByTopic = Map.empty,
            targets = Map(0 -> target)
        )

    /** The admin client arrives through the gRPC request context, which is a thread-local - so a
      * poll has to resolve it on the calling thread whatever it does with it afterwards. */
    private def withAdmin[A](admin: PulsarAdmin)(body: => A): A =
        io.grpc.Context.current().withValue(RequestContext.pulsarAdmin, admin).call(() => body)

    private def worker(name: String)(body: => Unit): Thread =
        val thread = new Thread((() => body): Runnable, name)
        thread.setDaemon(true)
        thread

    private def msgId(ledger: Long, entry: Long) = MessageIdImpl(ledger, entry, -1)
    private def bounds(firstEntry: Long, lastEntry: Long, firstTime: Long = 1000, lastTime: Long = 2000) =
        TopicConsumedBounds(TopicCursor(msgId(1, firstEntry), firstTime), TopicCursor(msgId(1, lastEntry), lastTime))

    def spec = suite("consumerService topic positions")(
        suite("a session that is not running")(
            test("answers FAILED_PRECONDITION rather than failing the call") {
                // The tab polls as soon as it is opened, which is routinely BEFORE the play button.
                // That has to be a status the client can render as "not started yet", not a fault -
                // and it must not need a broker to say so.
                val service = ConsumerServiceImpl(new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]())
                val response = service.getTopicPositions(GetTopicPositionsRequest(consumerName = "never-created"))

                for res <- zio.ZIO.fromFuture(_ => response)
                yield assertTrue(res.status.exists(_.code == Code.FAILED_PRECONDITION.value)) &&
                    assertTrue(res.positions.isEmpty) &&
                    assertTrue(res.status.exists(_.message.contains("never-created")))
            },
            test("P2.6: a session whose stream has ENDED answers the same 'session is gone' status, and scans nothing") {
                // The tab polls a started session once a second and only stops when it is told the
                // session is gone. A runner whose stream has been ended - stopped, replaced, or
                // failed out of a resume - is gone by every meaning the client has for the word, yet
                // it stayed in the map answering OK: the poll went on scanning the broker for a
                // session nobody could ever see again, once a second, for as long as the tab lived.
                val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
                val runner = wideSession("cs-positions-ended", topicCount = 3)
                sessions.put("cs-positions-ended", runner)
                // What ending a stream looks like when a resume fails: terminal, still installed,
                // consumers still held.
                runner.failAndComplete(com.google.rpc.status.Status(code = Code.FAILED_PRECONDITION.value, message = "the resume failed"))

                val gate = CountDownLatch(1)
                gate.countDown()
                val admin = CountingAdmin(gate)
                val service = ConsumerServiceImpl(sessions)
                val response = withAdmin(admin.admin)(service.getTopicPositions(GetTopicPositionsRequest(consumerName = "cs-positions-ended")))

                for res <- zio.ZIO.fromFuture(_ => response)
                yield assertTrue(
                    res.status.exists(_.code == Code.FAILED_PRECONDITION.value),
                    res.positions.isEmpty,
                    res.status.exists(_.message.contains("cs-positions-ended")),
                    admin.examineCalls.get == 0, // nothing was asked of the broker for a dead session
                    admin.statsCalls.get == 0
                ) ?? s"status=${res.status} examines=${admin.examineCalls.get} stats=${admin.statsCalls.get}"
            }
        ),
        suite("what a wide poll costs")(
            test("A POLL IS OFF THE CALLER'S THREAD, BOUNDED, AND COALESCED - a second poll joins the scan in flight") {
                // The tab polls this once a SECOND and a session may hold up to 2,000 physical
                // topics, each costing two examineMessage calls plus getInternalStats. The
                // implementation mapped them synchronously and serially on the gRPC thread before
                // returning an already-completed Future, so one browser could hold a service thread
                // for the whole of a 6,000-call sweep, a client deadline cancelled nothing, and
                // every tick of the poll started ANOTHER full sweep on top of the one still running.
                //
                // Pinned by latches: nothing is asserted about how long anything takes, only that
                // both calls have RETURNED while the scan is provably still inside the broker, and
                // that the whole episode cost exactly one scan's worth of admin calls.
                val topics = 100
                val gate = CountDownLatch(1)
                val admin = CountingAdmin(gate)
                val sessions = new ConcurrentHashMap[ConsumerSessionName, ConsumerSessionRunner]()
                sessions.put("cs-tp-wide", wideSession("cs-tp-wide", topics))
                val service = ConsumerServiceImpl(sessions)
                val request = GetTopicPositionsRequest(consumerName = "cs-tp-wide")

                val firstAnswer = AtomicReference[Future[GetTopicPositionsResponse]]()
                val secondAnswer = AtomicReference[Future[GetTopicPositionsResponse]]()
                val firstReturned = CountDownLatch(1)
                val secondReturned = CountDownLatch(1)

                val firstPoll = worker("cs-tp-poll-1") {
                    firstAnswer.set(withAdmin(admin.admin)(service.getTopicPositions(request)))
                    firstReturned.countDown()
                }
                firstPoll.start()
                val scanReallyStarted = admin.firstLookupStarted.await(120, TimeUnit.SECONDS)

                // The next tick of the same one-second poll, with the first scan still in the broker.
                val secondPoll = worker("cs-tp-poll-2") {
                    secondAnswer.set(withAdmin(admin.admin)(service.getTopicPositions(request)))
                    secondReturned.countDown()
                }
                secondPoll.start()
                val bothReturnedWhileScanning =
                    firstReturned.await(15, TimeUnit.SECONDS) && secondReturned.await(15, TimeUnit.SECONDS)

                gate.countDown()
                firstPoll.join(120_000)
                secondPoll.join(120_000)
                val first = Await.result(firstAnswer.get, Duration(120, SECONDS))
                val second = Await.result(secondAnswer.get, Duration(120, SECONDS))

                assertTrue(
                    scanReallyStarted,
                    bothReturnedWhileScanning, // neither call held its gRPC thread through the sweep
                    admin.examineCalls.get == 2 * topics, // ONE scan: first and last entry per topic
                    admin.statsCalls.get == topics,
                    admin.peakInFlight.get > 1, // genuinely off-thread, not just deferred
                    admin.peakInFlight.get <= topicPositionLookupParallelism, // and bounded while it is
                    first.status.exists(_.code == Code.OK.value),
                    second.status.exists(_.code == Code.OK.value),
                    first.positions.size == topics,
                    second.positions == first.positions // the joined poll gets the scan's answer
                ) ?? (s"bothReturnedWhileScanning=$bothReturnedWhileScanning examine=${admin.examineCalls.get} " +
                    s"(one scan = ${2 * topics}) stats=${admin.statsCalls.get} peak=${admin.peakInFlight.get} " +
                    s"bound=$topicPositionLookupParallelism rows=${first.positions.size}/${second.positions.size}")
            }
        ),
        suite("the listener's read position")(
            test("records both the first and last consumed positions") {
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a", msgId(1, 5), 1000)
                listener.recordCursor("persistent://t/n/a", msgId(1, 9), 2000)

                val recorded = listener.consumedBounds("persistent://t/n/a")
                assertTrue(recorded.first == TopicCursor(msgId(1, 5), 1000)) &&
                assertTrue(recorded.last == TopicCursor(msgId(1, 9), 2000))
            },
            test("an older later observation widens first but does NOT walk last backwards") {
                // `negativeAcknowledge` and the merge's cap both hand messages back, so an older one
                // legitimately arrives after a newer one has been counted. Letting the cursor follow
                // it would make the view flicker between two positions, neither of them "how far has
                // this read".
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a", msgId(1, 9), 2000)
                listener.recordCursor("persistent://t/n/a", msgId(1, 4), 1500)

                val recorded = listener.consumedBounds("persistent://t/n/a")
                assertTrue(recorded.first == TopicCursor(msgId(1, 4), 1500)) &&
                assertTrue(recorded.last == TopicCursor(msgId(1, 9), 2000))
            },
            test("equal message ids keep the first observation and refresh the last one") {
                // Non-persistent Pulsar messages may all expose 0:0. The id cannot distinguish
                // them, but the range must not freeze both timestamps on the first observation.
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                val sameId = msgId(0, 0)
                listener.recordCursor("non-persistent://t/n/a", sameId, 1000)
                listener.recordCursor("non-persistent://t/n/a", sameId, 2000)

                val recorded = listener.consumedBounds("non-persistent://t/n/a")
                assertTrue(recorded.first.publishTime == 1000) &&
                assertTrue(recorded.last.publishTime == 2000)
            },
            test("keeps one position PER TOPIC - a partitioned session must not share one") {
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a-partition-0", msgId(1, 5), 1000)
                listener.recordCursor("persistent://t/n/a-partition-1", msgId(2, 3), 1100)

                assertTrue(listener.consumedBounds.size == 2) &&
                assertTrue(listener.consumedBounds("persistent://t/n/a-partition-0").first.messageId == msgId(1, 5)) &&
                assertTrue(listener.consumedBounds("persistent://t/n/a-partition-1").last.messageId == msgId(2, 3))
            },
            test("survives concurrent recording from several listener threads") {
                // One Pulsar listener thread per physical topic writes this while a gRPC thread
                // reads it. The high-water mark must be the true maximum however the two interleave.
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                val entries = (1 to 500).toVector

                for _ <- zio.ZIO.foreachParDiscard(entries)(entry =>
                        zio.ZIO.succeed(listener.recordCursor("persistent://t/n/a", msgId(1, entry.toLong), entry.toLong))
                    )
                yield
                    val recorded = listener.consumedBounds("persistent://t/n/a")
                    assertTrue(recorded.first.messageId == msgId(1, 1)) &&
                    assertTrue(recorded.last.messageId == msgId(1, 500))
            }
        ),
        suite("reconciling targets that share a topic")(
            test("takes the union of two targets reading one topic") {
                // Two targets differing only in their filters is an ordinary configuration; each
                // keeps its own listener and range, but the table has one row.
                val middle = Map("persistent://t/n/a" -> bounds(3, 20))
                val wider = Map("persistent://t/n/a" -> bounds(1, 40, firstTime = 500, lastTime = 3000))

                assertTrue(mergeConsumedBounds(Vector(middle, wider))("persistent://t/n/a") == wider("persistent://t/n/a")) &&
                // Order of the listeners must not change the answer.
                assertTrue(mergeConsumedBounds(Vector(wider, middle))("persistent://t/n/a") == wider("persistent://t/n/a"))
            },
            test("orders by MESSAGE ID, not publish time, so a producer clock cannot reorder it") {
                // The further-along message carries the EARLIER publish time here, which a producer
                // whose clock stepped back produces. Log order is the log's own and cannot invert.
                val newerInLog = Map("persistent://t/n/a" -> bounds(40, 40, firstTime = 1000, lastTime = 1000))
                val olderInLog = Map("persistent://t/n/a" -> bounds(3, 3, firstTime = 9999, lastTime = 9999))

                val merged = mergeConsumedBounds(Vector(olderInLog, newerInLog))("persistent://t/n/a")
                assertTrue(merged.first.messageId == msgId(1, 3)) &&
                assertTrue(merged.last.messageId == msgId(1, 40))
            },
            test("equal-id target ranges use deterministic timestamp endpoints") {
                val early = TopicConsumedBounds(TopicCursor(msgId(0, 0), 1000), TopicCursor(msgId(0, 0), 1500))
                val late = TopicConsumedBounds(TopicCursor(msgId(0, 0), 1200), TopicCursor(msgId(0, 0), 2000))

                val merged = mergeConsumedBounds(Vector(Map("non-persistent://t/n/a" -> late), Map("non-persistent://t/n/a" -> early)))(
                    "non-persistent://t/n/a"
                )
                assertTrue(merged.first.publishTime == 1000) && assertTrue(merged.last.publishTime == 2000)
            },
            test("crossing a LEDGER boundary counts as further along") {
                val earlierLedger = Map(
                    "persistent://t/n/a" -> TopicConsumedBounds(TopicCursor(msgId(1, 900), 1000), TopicCursor(msgId(1, 900), 1000))
                )
                val laterLedger = Map(
                    "persistent://t/n/a" -> TopicConsumedBounds(TopicCursor(msgId(2, 0), 2000), TopicCursor(msgId(2, 0), 2000))
                )

                val merged = mergeConsumedBounds(Vector(earlierLedger, laterLedger))("persistent://t/n/a")
                assertTrue(merged.first.messageId == msgId(1, 900)) && assertTrue(merged.last.messageId == msgId(2, 0))
            },
            test("keeps distinct topics apart rather than collapsing them") {
                val one = Map("persistent://t/n/a" -> bounds(3, 3))
                val two = Map("persistent://t/n/b" -> bounds(7, 7))

                assertTrue(mergeConsumedBounds(Vector(one, two)).size == 2)
            },
            test("a session that has read nothing reports no bounds at all") {
                assertTrue(mergeConsumedBounds(Vector(Map.empty)).isEmpty) &&
                assertTrue(mergeConsumedBounds(Vector.empty).isEmpty)
            }
        )
    )
