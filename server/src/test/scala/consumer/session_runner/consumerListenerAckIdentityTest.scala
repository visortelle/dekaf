package consumer.session_runner

import org.apache.pulsar.client.api.{Consumer, Message as PulsarMessage, Schema}
import org.apache.pulsar.client.impl.{BatchMessageIdImpl, MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.MessageMetadata
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.nio.ByteBuffer
import java.util.concurrent.{CompletableFuture, ConcurrentLinkedQueue, CountDownLatch, TimeUnit}
import scala.jdk.CollectionConverters.*

/** MESSAGE IDENTITY UNDER FAILED PAPERWORK - the two ways a bare `MessageId` lies.
  *
  * The listener remembers a failed acknowledgment so the broker's redelivery can be finalized as
  * paperwork instead of re-decided. That memory used to be keyed by the message id ALONE, and a
  * bare id is not an identity here:
  *
  *   - measured against a real broker, EVERY non-persistent message arrives as ledger 0, entry 0
  *     - so one failed non-persistent ack marked the topic's NEXT unrelated message as
  *     "paperwork": acknowledged, never shown. And nothing is ever redelivered on a
  *     non-persistent topic (nothing is stored), so the marker could never be consumed honestly;
  *   - one listener serves every topic consumer of its target, and ids do not carry the topic.
  *
  * The registry is now keyed by (topic, id) and skipped entirely for non-persistent topics, whose
  * failed acks are FINAL and inconsequential.
  *
  * The same suite pins the other explicit lifecycle fact: a delivery the listener SAW fail is
  * recorded, and that record - nothing else - licenses the merge to deliver the broker's copy.
  */
object consumerListenerAckIdentityTest extends ZIOSpecDefault:

    private val consumerName = "cs-ack-identity-0"
    private val persistentA = "persistent://public/default/ack-id-a"
    private val persistentB = "persistent://public/default/ack-id-b"
    private val nonPersistent = "non-persistent://public/default/ack-id-np"

    private final class RecordingConsumer(topicFqn: String, failFirstAck: Boolean = false):
        val acknowledged = ConcurrentLinkedQueue[String]()
        val handedBack = ConcurrentLinkedQueue[String]()
        private val failedOnce = java.util.concurrent.atomic.AtomicBoolean(false)

        val consumer: Consumer[Array[Byte]] =
            val handler = new InvocationHandler:
                override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                    method.getName match
                        case "getTopic"        => topicFqn
                        case "getConsumerName" => consumerName
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

    private def message(topicFqn: String, key: String, publishTime: Long, ledgerId: Long, entryId: Long): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new MessageIdImpl(ledgerId, entryId, -1))
        msg

    /** A member of a batched entry: same (ledger, entry) as its siblings, distinguished only by
      * the batch index - the id shape a batched producer gives every message it sends.
      *
      * The BATCH SIZE is set, exactly as `ConsumerImpl` sets it on every id it hands a listener.
      * It is what says whether the session has seen the whole entry yet, and therefore whether the
      * broker can still redeliver it. */
    private def batchMessage(
        topicFqn: String,
        key: String,
        publishTime: Long,
        ledgerId: Long,
        entryId: Long,
        batchIndex: Int,
        batchSize: Int = 4
    ): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        md.setPublishTime(publishTime)
        md.setPartitionKey(key)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap(s"""{"k":"$key"}""".getBytes("UTF-8")), Schema.BYTES, topicFqn)
        msg.setMessageId(new BatchMessageIdImpl(ledgerId, entryId, -1, batchIndex, batchSize, null))
        msg

    /** One physical stream of a WIDE target: its own topic, its own consumer, sharing the target's
      * single listener - which is exactly the production shape, and the shape the per-target
      * decided-member registry has to cover. */
    private def wideStreamTopic(i: Int): String = s"persistent://public/default/ack-id-wide-$i"

    /** Run `body` over `streams` on `threadCount` real threads, released together and JOINED before
      * returning. The join is the phase boundary: everything this call does happens strictly before
      * whatever the caller does next, so a pause landing between two phases slices every stream's
      * entry at exactly the same member - no sleeps, no repetition until something lands. */
    private def acrossStreams(streams: Int, threadCount: Int)(body: Int => Unit): Unit =
        val start = CountDownLatch(1)
        val workers = (0 until threadCount).map(slot =>
            val thread = new Thread(
                (() => {
                    start.await(60, TimeUnit.SECONDS)
                    (0 until streams).filter(_ % threadCount == slot).foreach(body)
                }): Runnable,
                s"cs-ack-wide-$slot"
            )
            thread.setDaemon(true)
            thread
        )
        workers.foreach(_.start())
        start.countDown()
        workers.foreach(_.join(120_000))

    private def listenerRecording(delivered: ConcurrentLinkedQueue[String], throwOnFirst: Set[String] = Set.empty): ConsumerListener =
        val thrown = java.util.concurrent.ConcurrentHashMap.newKeySet[String]()
        val handler = ConsumerSessionTargetMessageHandler(onNext = msg =>
            if throwOnFirst.contains(msg.getKey) && thrown.add(msg.getKey) then
                throw new io.grpc.StatusRuntimeException(io.grpc.Status.CANCELLED)
            delivered.add(msg.getKey)
            ()
        )
        val l = ConsumerListener(handler)
        l.startAcceptingNewMessages()
        l

    def spec = suite(this.getClass.toString)(
        test("a NON-PERSISTENT failed ack is FINAL - the next (0,0) message is delivered, not swallowed as paperwork") {
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered)
            val np = RecordingConsumer(nonPersistent, failFirstAck = true)

            // m1 delivers; its ack fails. Nothing is stored on a non-persistent topic, so there
            // is nothing to retry - and no marker may be left behind.
            l.received(np.consumer, message(nonPersistent, "m1", 100, 0, 0))
            val markersAfterFailure = l.awaitingAckRetryCount
            // m2 is an UNRELATED message that happens to carry the same (0,0) id every
            // non-persistent message carries. It used to be acknowledged as m1's paperwork.
            l.received(np.consumer, message(nonPersistent, "m2", 200, 0, 0))

            assertTrue(
                markersAfterFailure == 0,
                delivered.asScala.toVector == Vector("m1", "m2"),
                np.handedBack.asScala.toVector.isEmpty // and no pointless nack for the failed ack
            ) ?? s"delivered=${delivered.asScala.toVector} markers=$markersAfterFailure"
        },
        test("ack-retry markers are TOPIC-QUALIFIED - a same-id message on a sibling topic is untouched") {
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered)
            val consumerA = RecordingConsumer(persistentA, failFirstAck = true)
            val consumerB = RecordingConsumer(persistentB)

            l.received(consumerA.consumer, message(persistentA, "a1", 100, 7, 5)) // delivered; ack fails -> marker (A, 7:5)
            val markersAfterFailure = l.awaitingAckRetryCount
            l.received(consumerB.consumer, message(persistentB, "b1", 150, 7, 5)) // same id, OTHER topic: ordinary delivery
            val markersAfterSibling = l.awaitingAckRetryCount
            l.received(consumerA.consumer, message(persistentA, "a1", 100, 7, 5)) // the real redelivery: paperwork only

            assertTrue(
                markersAfterFailure == 1,
                markersAfterSibling == 1, // the sibling neither consumed nor grew the marker
                l.awaitingAckRetryCount == 0,
                delivered.asScala.toVector == Vector("a1", "b1"), // a1 once, b1 once, the redelivery never
                consumerA.acknowledged.asScala.count(_ == "a1") == 1 // the redelivery's finalizing ack
            ) ?? s"delivered=${delivered.asScala.toVector} markers=${l.awaitingAckRetryCount}"
        },
        test("A PAUSE-SLICED BATCH ENTRY: decided members are paperwork on the whole-entry redelivery, never re-shown") {
            // The books-balance bug the 50k pause-loop e2e caught: a batched producer packs many
            // messages into one broker entry, and per-member acks are client-local bits. Pause
            // mid-entry and the gate delivers members 0..1, refuses 2..3 - so the broker
            // redelivers the WHOLE entry with a fresh ack set, already-shown members included.
            // They used to be re-decided (re-shown, ~half a batch of duplicates per hot pause);
            // now their standing decision makes the copies pure paperwork.
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered)
            val c = RecordingConsumer(persistentA)

            l.received(c.consumer, batchMessage(persistentA, "m0", 100, 7, 5, 0))
            l.received(c.consumer, batchMessage(persistentA, "m1", 101, 7, 5, 1))
            l.stopAcceptingNewMessages() // the pause lands mid-entry
            l.received(c.consumer, batchMessage(persistentA, "m2", 102, 7, 5, 2))
            l.received(c.consumer, batchMessage(persistentA, "m3", 103, 7, 5, 3))
            val refusedAtGate = c.handedBack.asScala.toVector
            l.startAcceptingNewMessages() // resume; the broker redelivers the entry entire
            (0 to 3).foreach(i => l.received(c.consumer, batchMessage(persistentA, s"m$i", 100L + i, 7, 5, i)))

            assertTrue(
                refusedAtGate == Vector("m2", "m3"),
                delivered.asScala.toVector == Vector("m0", "m1", "m2", "m3"), // each shown EXACTLY once
                c.acknowledged.asScala.count(_ == "m0") == 2, // the original ack + the copy's paperwork
                c.acknowledged.asScala.count(_ == "m1") == 2,
                c.acknowledged.asScala.count(_ == "m2") == 1,
                c.acknowledged.asScala.count(_ == "m3") == 1,
                l.decidedBatchEntryCount == 1
            ) ?? s"delivered=${delivered.asScala.toVector} acked=${c.acknowledged.asScala.toVector} refused=$refusedAtGate"
        },
        test("A SLICED ENTRY ON EVERY STREAM OF A WIDE TARGET survives to its redelivery, however old it is") {
            // The registry evicted by INSERTION ORDER at 512 entries while ONE target may hold
            // 1,000 physical streams. A hot pause slices one outstanding entry per stream, so the
            // earliest ~488 records were thrown away before their redelivery ever arrived - and the
            // whole-entry redelivery then re-showed members this session had already delivered (or,
            // in the counted modes, spent a second unit of the user's budget on them). Retention is
            // a LIFECYCLE fact, not an age: an entry whose redelivery is still owed cannot be
            // evicted at any size.
            val streams = 600 // past the 512-entry registry, inside one target's 1,000-stream cap
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered)
            val consumers = Vector.tabulate(streams)(i => RecordingConsumer(wideStreamTopic(i)))

            // PHASE 1, gate open: members 0 and 1 of every stream's entry are delivered and decided.
            acrossStreams(streams, threadCount = 8)(i =>
                (0 to 1).foreach(member =>
                    l.received(consumers(i).consumer, batchMessage(wideStreamTopic(i), s"s$i-m$member", 100L + member, 7, 5, member))
                )
            )
            val decidedAfterDelivery = l.decidedBatchEntryCount

            // PHASE 2: the pause lands mid-entry on every stream at once - one sliced entry each.
            l.stopAcceptingNewMessages()
            acrossStreams(streams, threadCount = 8)(i =>
                (2 to 3).foreach(member =>
                    l.received(consumers(i).consumer, batchMessage(wideStreamTopic(i), s"s$i-m$member", 100L + member, 7, 5, member))
                )
            )
            val retainedWhileSliced = l.decidedBatchEntryCount

            // PHASE 3: resume, and the broker redelivers the OLDEST sliced entry entire.
            l.startAcceptingNewMessages()
            (0 to 3).foreach(member =>
                l.received(consumers(0).consumer, batchMessage(wideStreamTopic(0), s"s0-m$member", 100L + member, 7, 5, member))
            )

            val oldestDelivered = delivered.asScala.toVector.filter(_.startsWith("s0-"))
            val oldestAcknowledged = consumers(0).acknowledged.asScala.toVector
            assertTrue(
                decidedAfterDelivery == streams,
                retainedWhileSliced == streams, // NOT capped at 512: every sliced entry is still owed a redelivery
                consumers(0).handedBack.asScala.toVector == Vector("s0-m2", "s0-m3"),
                oldestDelivered == Vector("s0-m0", "s0-m1", "s0-m2", "s0-m3"), // each shown EXACTLY once
                oldestAcknowledged.count(_ == "s0-m0") == 2, // the original ack plus the copy's paperwork
                oldestAcknowledged.count(_ == "s0-m1") == 2,
                oldestAcknowledged.count(_ == "s0-m2") == 1,
                oldestAcknowledged.count(_ == "s0-m3") == 1
            ) ?? (s"decidedAfterDelivery=$decidedAfterDelivery retainedWhileSliced=$retainedWhileSliced " +
                s"oldestDelivered=$oldestDelivered oldestAcked=$oldestAcknowledged " +
                s"handedBack=${consumers(0).handedBack.asScala.toVector}")
        },
        test("AND IS RECLAIMED once that redelivery completes - retention is a lifecycle, not a bigger number") {
            // The other half, and the reason this is not simply a larger constant: an entry the
            // broker has retired can never come back, so its record is dead weight and must go.
            // Only entries still owed a redelivery are exempt from the cap, so the registry cannot
            // grow past (settled cap + one sliced entry per admitted stream).
            val streams = 600
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered)
            val consumers = Vector.tabulate(streams)(i => RecordingConsumer(wideStreamTopic(i)))

            acrossStreams(streams, threadCount = 8)(i =>
                (0 to 1).foreach(member =>
                    l.received(consumers(i).consumer, batchMessage(wideStreamTopic(i), s"s$i-m$member", 100L + member, 7, 5, member))
                )
            )
            l.stopAcceptingNewMessages()
            acrossStreams(streams, threadCount = 8)(i =>
                (2 to 3).foreach(member =>
                    l.received(consumers(i).consumer, batchMessage(wideStreamTopic(i), s"s$i-m$member", 100L + member, 7, 5, member))
                )
            )
            val retainedWhileSliced = l.decidedBatchEntryCount

            // Every sliced entry is now redelivered whole and completed, so nothing is owed.
            l.startAcceptingNewMessages()
            acrossStreams(streams, threadCount = 8)(i =>
                (0 to 3).foreach(member =>
                    l.received(consumers(i).consumer, batchMessage(wideStreamTopic(i), s"s$i-m$member", 100L + member, 7, 5, member))
                )
            )

            // Ordinary traffic afterwards: fresh entries on one stream, each of which may reclaim
            // the settled records ahead of it.
            (0 until 40).foreach(entry =>
                (0 to 3).foreach(member =>
                    l.received(consumers(0).consumer, batchMessage(wideStreamTopic(0), s"fresh-$entry-$member", 500L + entry, 9, entry.toLong, member))
                )
            )

            assertTrue(
                retainedWhileSliced == streams,
                l.decidedBatchEntryCount <= 512 // reclaimed back inside the cap once nothing is owed
            ) ?? s"retainedWhileSliced=$retainedWhileSliced afterSettling=${l.decidedBatchEntryCount}"
        },
        test("A FAILED DELIVERY IS AN EXPLICIT TRANSITION: recorded on the nack, claimed by the retry, delivered once") {
            // The whole path the merge's duplicate arm rests on, driven through the REAL
            // received() pipeline: handler throws once (exactly as a cancelled gRPC call does),
            // the listener records the failure and hands the message back, and the broker's
            // redelivery - watermarked as a copy - is delivered because of that record alone.
            val delivered = ConcurrentLinkedQueue[String]()
            val l = listenerRecording(delivered, throwOnFirst = Set("a1"))
            val consumerA = RecordingConsumer(persistentA)
            val consumerB = RecordingConsumer(persistentB)
            l.startFromOrdering = StartFromOrdering.make[HeldMessage](
                StartFromOrderingPlan.Ordered(
                    // Best effort carries EMPTY recorded ends - the continuous rules need none.
                    Vector(
                        StartFromStream(startFromStreamId(consumerName, persistentA), EntryPosition.empty),
                        StartFromStream(startFromStreamId(consumerName, persistentB), EntryPosition.empty)
                    ),
                    consumer.session_config.MessageDeliveryOrder.BestEffort
                )
            )

            l.received(consumerA.consumer, message(persistentA, "a1", 100, 1, 0))
            l.received(consumerB.consumer, message(persistentB, "b1", 150, 1, 0)) // both heads: a1 emits - and its send throws
            val failuresRecorded = l.failedDeliveryCount
            l.received(consumerA.consumer, message(persistentA, "a1", 100, 1, 0)) // the broker's redelivery = the retry

            assertTrue(
                failuresRecorded == 1,
                l.failedDeliveryCount == 0, // claimed by the retry
                consumerA.handedBack.asScala.toVector == Vector("a1"), // the failed attempt, handed back
                delivered.asScala.toVector.count(_ == "a1") == 1, // shown exactly once
                consumerA.acknowledged.asScala.count(_ == "a1") == 1
            ) ?? s"delivered=${delivered.asScala.toVector} failures=${l.failedDeliveryCount} handedBack=${consumerA.handedBack.asScala.toVector}"
        }
    ) @@ TestAspect.sequential
