package consumer.session_runner

import org.apache.pulsar.client.api.{MessageId, Schema}
import org.apache.pulsar.client.impl.{BatchMessageIdImpl, MessageIdImpl, MessageImpl}
import org.apache.pulsar.common.api.proto.{MarkerType, MessageMetadata}
import zio.test.*

import java.nio.ByteBuffer

/** SERVER-ONLY MARKER ENTRIES - the third shape in which "one entry" is not "one message", after
  * batching (many messages in one entry) and chunking (one message across many entries).
  *
  * A transaction commit or abort, and a replicated-subscription snapshot, are written into the
  * topic's OWN managed ledger as ordinary entries. Established against Pulsar 3.2.1 by reading both
  * sides rather than by guessing:
  *
  *   - `TopicTransactionBuffer.commitTxn`/`abortTxn` build the record with
  *     `Markers.newTxnCommitMarker`/`newTxnAbortMarker` - which set `MessageMetadata.marker_type` -
  *     and append it with `ManagedLedger.asyncAddEntry`, so `getNumberOfEntries` counts it;
  *   - `PersistentTopicsBase.internalExamineMessageAsync` applies NO marker filtering: the entry
  *     goes straight to `generateResponseWithEntry`, which emits `X-Pulsar-marker-type` whenever the
  *     metadata has one, and the admin client's `TopicsImpl.getMessagesFromHttpResponse` parses that
  *     header back onto the `MessageMetadata` it hands to `MessageImpl` - the very object
  *     `getMessageBuilder` returns. So `examineMessage` DOES return markers and they ARE
  *     identifiable;
  *   - `AbstractBaseDispatcher.filterEntriesForConsumer` nulls and releases every entry for which
  *     `Markers.isServerOnlyMarker` holds, so no consumer is ever handed one.
  *
  * Counted by the broker, delivered to nobody: an entry-addressed count that treats a marker as a
  * message holds one message too few for every marker it crosses. Hence SKIP rather than refuse -
  * zero is the exact delivered count for a marker, so the walk stays correct by crossing it, and
  * refusing would take a working mode away from every transactional topic.
  *
  * NOT reachable end to end in the e2e harness: transactions are disabled on the standalone broker
  * the suite runs against, so no marker entry can be produced there. That is why the message-level
  * classification is pinned here with hand-built metadata and the walk arithmetic with a plain
  * lambda.
  */
object markerEntriesTest extends ZIOSpecDefault:

    private val topic = "persistent://public/default/markers"

    private def message(id: MessageId, configure: MessageMetadata => Unit): MessageImpl[Array[Byte]] =
        val md = new MessageMetadata()
        // publish_time is mandatory on MessageMetadata - reading it when unset throws.
        md.setPublishTime(1_700_000_000_000L)
        configure(md)
        val msg = MessageImpl.create[Array[Byte]](md, ByteBuffer.wrap("{}".getBytes("UTF-8")), Schema.BYTES, topic)
        msg.setMessageId(id)
        msg

    private def plainMessage: MessageImpl[Array[Byte]] = message(new MessageIdImpl(1L, 2L, -1), _ => ())

    private def markerMessage(markerType: MarkerType): MessageImpl[Array[Byte]] =
        message(new MessageIdImpl(1L, 2L, -1), _.setMarkerType(markerType.getValue))

    private val classificationSuite = suite("recognising a marker entry in an examineMessage answer")(
        test("a transaction commit marker is recognised and counts as ZERO messages") {
            // The whole point: the entry exists, the broker counts it, and it holds nothing a
            // consumer will ever see.
            val marker = markerMessage(MarkerType.TXN_COMMIT)
            assertTrue(
                isServerOnlyMarkerEntry(marker),
                logEntryOf(topic, marker).messagesInEntry == 0
            )
        },
        test("EVERY marker type Pulsar defines is recognised, not just the transactional ones") {
            // Geo-replication writes REPLICATED_SUBSCRIPTION_* markers with no transaction in
            // sight, so keying off the transaction ids instead of `marker_type` would miss them.
            // Pulsar's own dispatcher filters on `hasMarkerType` alone, and so does this.
            val unrecognised = MarkerType.values.toList.filterNot(t => isServerOnlyMarkerEntry(markerMessage(t)))
            assertTrue(unrecognised.isEmpty) ?? s"marker types read as ordinary messages: ${unrecognised.mkString(", ")}"
        },
        test("an ordinary unbatched message is not a marker and still counts as one message") {
            val plain = plainMessage
            assertTrue(!isServerOnlyMarkerEntry(plain), logEntryOf(topic, plain).messagesInEntry == 1)
        },
        test("a batched entry keeps its own batch size - the marker rule does not touch the batch path") {
            val batched = message(new BatchMessageIdImpl(1L, 2L, 0, 0, 50, null), _ => ())
            assertTrue(!isServerOnlyMarkerEntry(batched), logEntryOf(topic, batched).messagesInEntry == 50)
        },
        test("a marker keeps its entry id and publish time - only its message count is zero") {
            // The walk still has to be able to seek to it and to order it against other topics.
            val marker = markerMessage(MarkerType.TXN_ABORT)
            val entry = logEntryOf(topic, marker)
            assertTrue(
                entry.entryId == new MessageIdImpl(1L, 2L, -1),
                entry.publishTime == 1_700_000_000_000L
            )
        },
        test("a CHUNK piece is still REFUSED, with the explanation that names the mode and the remedy") {
            // The opposite decision to the marker one, and the reason both live in `logEntryOf`: a
            // chunk piece makes entry counts meaningless in BOTH directions, so there is no correct
            // number to substitute the way zero is correct for a marker.
            val chunk = message(new MessageIdImpl(1L, 2L, -1), _.setNumChunksFromMsg(3))
            val refusal = scala.util.Try(logEntryOf(topic, chunk)).failed.toOption
            assertTrue(
                refusal.exists(_.isInstanceOf[StartFromUnresolvableException]),
                refusal.exists(_.getMessage.contains(topic)),
                refusal.exists(_.getMessage.contains("CHUNKED")),
                refusal.exists(_.getMessage.contains("Skip first n messages"))
            ) ?? s"a chunk piece was not refused: $refusal"
        }
    )

    /** The `topic#k` labels carry the walk's entry order: `k` counts back from the end, so a larger
      * ordinal is strictly OLDER (the production comparator is `MessageIdImpl.compareTo`). */
    private def olderByOrdinal(a: String, b: String): Boolean = a.split("#").last.toInt > b.split("#").last.toInt

    /** Resolve `n` over logs described from their END: element 0 is each topic's LAST entry, given as
      * (publish time, messages in that entry). A ZERO message count is exactly what
      * [[entryFromLatest]] reports for a server-only marker. */
    private def walk(n: Long, logs: (String, Seq[(Long, Int)])*): Map[String, LatestNSeek[String]] =
        val byTopic = logs.toMap
        val lookup = (topicFqn: String) =>
            (k: Long) =>
                val entries = byTopic.getOrElse(topicFqn, Seq.empty)
                Option.when(k >= 1 && k <= entries.size) {
                    val (publishTime, messages) = entries(k.toInt - 1)
                    LogEntry(s"$topicFqn#$k", publishTime, messages)
                }
        resolveLatestN(n, byTopic.keys.toVector.sorted, lookup, olderByOrdinal)

    private val marker = 0
    private val a = "persistent://public/default/a"
    private val b = "persistent://public/default/b"

    private val walkSuite = suite("resolveLatestN across marker entries")(
        test("a marker between messages costs the walk a STEP and not a message") {
            // From the end: m5, MARKER, m4, m3, m2, m1. The last 3 MESSAGES are m3, m4, m5, so the
            // anchor is the 4th entry back. Counting the marker as one message (the `max 1` floor
            // this replaced) stopped on the 3rd entry instead and the session held two.
            val cut = walk(3, a -> Seq(9L -> 1, 8L -> marker, 7L -> 1, 6L -> 1, 5L -> 1, 4L -> 1))
            assertTrue(cut(a) == LatestNSeek.FromEntry(s"$a#4", 0L))
        },
        test("consecutive markers are crossed without ending the walk or moving the count") {
            // A burst of aborts is an ordinary shape on a topic under a failing transactional
            // producer; a zero-count entry must not look like exhaustion.
            val cut = walk(2, a -> Seq(9L -> marker, 8L -> marker, 7L -> marker, 6L -> 1, 5L -> 1, 4L -> 1))
            assertTrue(cut(a) == LatestNSeek.FromEntry(s"$a#5", 0L))
        },
        test("markers do not disturb the overshoot discard inside a batched stopping entry") {
            // From the end: a 3-message batch, a MARKER, another 3-message batch. The last 4
            // messages need the second batch, of which 2 are older than the cut and are dropped
            // from that topic's head.
            val cut = walk(4, a -> Seq(9L -> 3, 8L -> marker, 7L -> 3, 6L -> 3))
            assertTrue(cut(a) == LatestNSeek.FromEntry(s"$a#3", 2L))
        },
        test("a log holding ONLY markers anchors at its oldest entry with nothing to discard") {
            // It has no messages to show, and that is the honest answer: seeking to the oldest
            // marker delivers everything published after it, and the broker filters the markers
            // themselves out of the dispatch.
            val cut = walk(3, a -> Seq(9L -> marker, 8L -> marker))
            assertTrue(cut(a) == LatestNSeek.FromEntry(s"$a#2", 0L))
        },
        test("a topic whose inspected TAIL is a marker anchors there with a ZERO head-drop") {
            // B contributes nothing to the cut, so it is anchored at the tail the walk inspected and
            // that entry's own messages are dropped from its head. A marker has none - dropping one
            // anyway would swallow the first REAL message published after it, which is precisely the
            // live traffic anchoring at the inspected tail exists to keep.
            val cut = walk(
                2,
                a -> Seq(100L -> 1, 90L -> 1, 80L -> 1),
                b -> Seq(50L -> marker, 40L -> 1)
            )
            assertTrue(
                cut(a) == LatestNSeek.FromEntry(s"$a#2", 0L),
                cut(b) == LatestNSeek.FromEntry(s"$b#1", 0L)
            )
        },
        test("a non-contributing tail that IS a message still drops its own messages") {
            // The control for the case above: `max 0` must not have turned the head-drop off.
            val cut = walk(
                2,
                a -> Seq(100L -> 1, 90L -> 1, 80L -> 1),
                b -> Seq(50L -> 4, 40L -> 1)
            )
            assertTrue(cut(b) == LatestNSeek.FromEntry(s"$b#1", 4L))
        }
    )

    def spec = suite(this.getClass.toString)(classificationSuite, walkSuite)
