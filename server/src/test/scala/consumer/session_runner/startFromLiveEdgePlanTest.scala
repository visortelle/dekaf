package consumer.session_runner

import _root_.consumer.session_config.MessageDeliveryOrder
import _root_.consumer.start_from.{ApproximateEntryPosition, ConsumerSessionStartFrom, EarliestMessage, LatestMessage, NthMessageBeforeLatest}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Consumer, PulsarClient, MessageId as PulsarMessageId}
import org.apache.pulsar.client.impl.MessageIdImpl
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.{ConcurrentLinkedQueue, TimeUnit}
import java.util.concurrent.atomic.AtomicLong
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** THE CREATE-TIME BOUNDARY OF A LIVE-EDGE SEEK IS EMPTY, AND COSTS NO BROKER READ.
  *
  * Under the GUARANTEED exact replay, "everything recorded up to the moment Play was pressed" is
  * bounded by the per-stream ends captured at session build - and a seek that lands AT THE LIVE
  * EDGE (Latest, latest-n = 0, the approximate-entry endpoint at 1.0) leaves nothing recorded
  * behind the cursor, so its boundary is decided EMPTY by the seek itself, without asking the
  * broker for the topic's end at all. These pins drive the real `handleStartFrom` over proxy
  * consumers whose end-reads are counted, with real Pulsar clients aimed at a closed port so an
  * accidental broker call fails the test loudly instead of hanging or passing by accident.
  *
  * The EMPTY boundary is what makes Latest x Guaranteed an instant caught-up on a NON-EMPTY topic:
  * the broker's real end still names the backlog behind the cursor, and reading it as the boundary
  * arms the barrier over a range the consumer can never deliver (e2e CS-DM-R3B). The resume-path
  * half of that contract - the first Play CONSUMES these boundaries instead of re-reading the
  * broker - is pinned in replayBoundaryTest.
  */
object startFromLiveEdgePlanTest extends ZIOSpecDefault:

    private val consumerName = "cs-live-edge-plan-0"
    private def topic(i: Int): String = s"persistent://public/default/cs-live-edge-plan-$i"

    /** A consumer whose SEEKS are recorded and whose end-reads are counted. The broker end it
      * would answer with is a real entry - the non-empty-backlog shape - so a plan that wrongly
      * captured ends for a live-edge seek is caught by the boundary VALUE as well as the count. */
    private final class SeekRecordingConsumer(topicFqn: String):
        val seeks = ConcurrentLinkedQueue[Object]()
        val lastIdsReads = AtomicLong(0)
        @volatile var lastIds: java.util.List[PulsarMessageId] = java.util.List.of(new MessageIdImpl(1L, 7L, -1))

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
                        case "isConnected"     => java.lang.Boolean.TRUE
                        case "seek" =>
                            seeks.add(args(0))
                            null
                        case "pause" => null
                        case "getLastMessageIds" =>
                            lastIdsReads.incrementAndGet()
                            lastIds
                        case "equals"   => java.lang.Boolean.valueOf(proxy eq args(0))
                        case "hashCode" => java.lang.Integer.valueOf(topicFqn.hashCode)
                        case "toString" => s"proxy-consumer($topicFqn)"
                        case _          => null
            Proxy
                .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
                .asInstanceOf[Consumer[Array[Byte]]]

    /** Real clients aimed at a closed port, exactly as startFromCountValidationTest uses them: the
      * live-edge paths must ask the broker NOTHING, so an accidental admin or client call surfaces
      * as a connection error rather than as a mock quietly answering. */
    private def withOfflineClients[A](f: (PulsarClient, PulsarAdmin) => A): A =
        val client = PulsarClient.builder.serviceUrl("pulsar://127.0.0.1:1").operationTimeout(2, TimeUnit.SECONDS).build
        val admin = PulsarAdmin.builder
            .serviceHttpUrl("http://127.0.0.1:1")
            .connectionTimeout(2, TimeUnit.SECONDS)
            .readTimeout(2, TimeUnit.SECONDS)
            .requestTimeout(2, TimeUnit.SECONDS)
            .build
        try f(client, admin)
        finally
            Try(client.close())
            Try(admin.close())

    private def guaranteedPlan(startFrom: ConsumerSessionStartFrom, consumers: Vector[SeekRecordingConsumer]): StartFromPlan =
        withOfflineClients((client, admin) =>
            handleStartFrom(
                startFrom = startFrom,
                consumers = consumers.map(_.consumer),
                adminClient = admin,
                pulsarClient = client,
                nonPartitionedTopicFqns = consumers.map(c => c.consumer.getTopic),
                deliveryOrdering = MessageDeliveryOrder.Guaranteed
            )
        )

    private def orderedStreamsOf(plan: StartFromPlan): Vector[StartFromStream] = plan.ordering match
        case StartFromOrderingPlan.Ordered(streams, MessageDeliveryOrder.Guaranteed) => streams
        case other => throw new AssertionError(s"expected a Guaranteed Ordered plan, got $other")

    private def liveEdgeCase(startFrom: ConsumerSessionStartFrom) =
        val consumers = Vector(SeekRecordingConsumer(topic(0)), SeekRecordingConsumer(topic(1)))
        val streams = orderedStreamsOf(guaranteedPlan(startFrom, consumers))
        assertTrue(
            streams.size == 2,
            // The boundary is decided EMPTY by the seek itself: nothing recorded behind a
            // live-edge cursor, so nothing to replay - the instant-caught-up input.
            streams.forall(_.lastAtStart == EntryPosition.empty),
            // And it costs no broker end-read: the seek already knows.
            consumers.forall(_.lastIdsReads.get == 0L),
            // The seek that produced that knowledge really was to the live edge.
            consumers.forall(_.seeks.asScala.toVector == Vector(PulsarMessageId.latest))
        ) ?? (s"streams=$streams endReads=${consumers.map(_.lastIdsReads.get)} " +
            s"seeks=${consumers.map(_.seeks.asScala.toVector)}")

    def spec = suite(this.getClass.toString)(
        test("LATEST x GUARANTEED: every boundary is empty, no end is read, every consumer sits at the live edge") {
            liveEdgeCase(LatestMessage())
        },
        test("LATEST-N = 0 x GUARANTEED: 'the last 0 messages' is the same live edge - empty boundaries, no end reads") {
            liveEdgeCase(NthMessageBeforeLatest(n = 0))
        },
        test("APPROXIMATE ENTRY AT 1.0 x GUARANTEED: the endpoint fast path is the live edge - empty boundaries, no end reads") {
            liveEdgeCase(ApproximateEntryPosition(fraction = 1.0))
        },
        test("THE CONTRAST: EARLIEST x GUARANTEED captures the real recorded ends, one read per consumer") {
            // A history seek's boundary is the topic's real end - the broker IS asked, exactly
            // once per consumer, and the captured position is the one it answered with. This is
            // what keeps the live-edge pins above honest: the counter can tell the two apart.
            val consumers = Vector(SeekRecordingConsumer(topic(0)), SeekRecordingConsumer(topic(1)))
            val streams = orderedStreamsOf(guaranteedPlan(EarliestMessage(), consumers))
            assertTrue(
                streams.size == 2,
                streams.forall(_.lastAtStart == EntryPosition(1L, 7L, -1, 1)),
                consumers.forall(_.lastIdsReads.get == 1L),
                consumers.forall(_.seeks.asScala.toVector == Vector(PulsarMessageId.earliest))
            ) ?? s"streams=$streams endReads=${consumers.map(_.lastIdsReads.get)}"
        }
    ) @@ TestAspect.sequential
