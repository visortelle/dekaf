package consumer

import com.google.rpc.code.Code
import com.tools.teal.pulsar.ui.api.v1.consumer.GetTopicPositionsRequest
import consumer.session_runner.{ConsumerListener, ConsumerSessionRunner, ConsumerSessionTargetMessageHandler, TopicCursor, furthestCursors}
import org.apache.pulsar.client.impl.MessageIdImpl
import zio.test.*

import java.util.concurrent.ConcurrentHashMap

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

    private def msgId(ledger: Long, entry: Long) = MessageIdImpl(ledger, entry, -1)

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
            }
        ),
        suite("the listener's read position")(
            test("advances as messages are recorded") {
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a", msgId(1, 5), 1000)
                listener.recordCursor("persistent://t/n/a", msgId(1, 9), 2000)

                assertTrue(listener.cursors("persistent://t/n/a").messageId == msgId(1, 9)) &&
                assertTrue(listener.cursors("persistent://t/n/a").publishTime == 2000)
            },
            test("does NOT walk backwards when an older message is redelivered") {
                // `negativeAcknowledge` and the merge's cap both hand messages back, so an older one
                // legitimately arrives after a newer one has been counted. Letting the cursor follow
                // it would make the view flicker between two positions, neither of them "how far has
                // this read".
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a", msgId(1, 9), 2000)
                listener.recordCursor("persistent://t/n/a", msgId(1, 4), 1500)

                assertTrue(listener.cursors("persistent://t/n/a").messageId == msgId(1, 9))
            },
            test("keeps one position PER TOPIC - a partitioned session must not share one") {
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                listener.recordCursor("persistent://t/n/a-partition-0", msgId(1, 5), 1000)
                listener.recordCursor("persistent://t/n/a-partition-1", msgId(2, 3), 1100)

                assertTrue(listener.cursors.size == 2) &&
                assertTrue(listener.cursors("persistent://t/n/a-partition-0").messageId == msgId(1, 5)) &&
                assertTrue(listener.cursors("persistent://t/n/a-partition-1").messageId == msgId(2, 3))
            },
            test("survives concurrent recording from several listener threads") {
                // One Pulsar listener thread per physical topic writes this while a gRPC thread
                // reads it. The high-water mark must be the true maximum however the two interleave.
                val listener = ConsumerListener(ConsumerSessionTargetMessageHandler(onNext = _ => ()))
                val entries = (1 to 500).toVector

                for _ <- zio.ZIO.foreachParDiscard(entries)(entry =>
                        zio.ZIO.succeed(listener.recordCursor("persistent://t/n/a", msgId(1, entry.toLong), entry.toLong))
                    )
                yield assertTrue(listener.cursors("persistent://t/n/a").messageId == msgId(1, 500))
            }
        ),
        suite("reconciling targets that share a topic")(
            test("keeps the FURTHEST of two targets reading one topic") {
                // Two targets differing only in their filters is an ordinary configuration; each
                // keeps its own listener and so its own position, but the table has one row.
                val behind = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 3), 1000))
                val ahead = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 40), 2000))

                assertTrue(furthestCursors(Vector(behind, ahead))("persistent://t/n/a").messageId == msgId(1, 40)) &&
                // Order of the listeners must not change the answer.
                assertTrue(furthestCursors(Vector(ahead, behind))("persistent://t/n/a").messageId == msgId(1, 40))
            },
            test("orders by MESSAGE ID, not publish time, so a producer clock cannot reorder it") {
                // The further-along message carries the EARLIER publish time here, which a producer
                // whose clock stepped back produces. Log order is the log's own and cannot invert.
                val newerInLog = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 40), 1000))
                val olderInLog = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 3), 9999))

                assertTrue(furthestCursors(Vector(olderInLog, newerInLog))("persistent://t/n/a").messageId == msgId(1, 40))
            },
            test("crossing a LEDGER boundary counts as further along") {
                val earlierLedger = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 900), 1000))
                val laterLedger = Map("persistent://t/n/a" -> TopicCursor(msgId(2, 0), 2000))

                assertTrue(furthestCursors(Vector(earlierLedger, laterLedger))("persistent://t/n/a").messageId == msgId(2, 0))
            },
            test("keeps distinct topics apart rather than collapsing them") {
                val one = Map("persistent://t/n/a" -> TopicCursor(msgId(1, 3), 1000))
                val two = Map("persistent://t/n/b" -> TopicCursor(msgId(1, 7), 1000))

                assertTrue(furthestCursors(Vector(one, two)).size == 2)
            },
            test("a session that has read nothing reports no cursors at all") {
                assertTrue(furthestCursors(Vector(Map.empty)).isEmpty) &&
                assertTrue(furthestCursors(Vector.empty).isEmpty)
            }
        )
    )
