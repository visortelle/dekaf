package consumer.session_runner

import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.impl.MessageIdImpl
import zio.test.*

import java.util.concurrent.TimeUnit
import scala.util.Try

/** Starting from a specific MESSAGE ID, across the physical topics one session covers.
  *
  * Regression context: a session's topic vector is built by concatenating every enabled target's
  * resolved topics, and TWO TARGETS MAY SELECT THE SAME TOPIC - which is a supported configuration
  * (each target has its own consumer, its own filters and its own colouring). The concatenation
  * therefore named one physical topic twice, the duplicate pushed the vector past the
  * single-topic fast path, and the multi-topic lookup read the SAME physical message once per name
  * and threw "Multiple messages found for the same message id" on a perfectly valid session.
  *
  * [[resolveMessageIdAcrossTopics]] is pure - the broker sits behind a `String => Option[M]` lookup
  * - so every shape is driven here with a plain lambda: no broker, and no mock.
  */
object messageIdStartFromTest extends ZIOSpecDefault:

    private val orders = "persistent://public/default/orders"
    private val payments = "persistent://public/default/payments"

    /** A broker holding `messageOf`, plus a count of how many topics were actually asked. */
    private def broker(messageOf: Map[String, String]): (String => Option[String], () => Int) =
        var reads = 0
        val lookup = (topicFqn: String) =>
            reads += 1
            messageOf.get(topicFqn)
        (lookup, () => reads)

    private val messageId = new MessageIdImpl(7L, 3L, 0)

    /** Consumers as the seek planner sees them: just their topic. */
    private def consumersOn(topicFqns: String*): Vector[String] = topicFqns.toVector

    /** A real client aimed at a closed port, so an operational failure is a real one rather than a
      * mock's idea of one. Two-second timeouts keep the suite quick. */
    private def withOfflineClient[A](f: PulsarClient => A): A =
        val client = PulsarClient.builder.serviceUrl("pulsar://127.0.0.1:1").operationTimeout(2, TimeUnit.SECONDS).build
        try f(client)
        finally Try(client.close())

    /** WHERE EACH CONSUMER STARTS once the message has been found.
      *
      * The whole session used to be seeked by the message's PUBLISH TIME as soon as it covered more
      * than one topic - including the topic the id actually belongs to. "Start from this message"
      * therefore became "start from this millisecond" on the very topic the user picked it from, and
      * every earlier message sharing that millisecond (or that producer batch) came with it.
      */
    private val seekSuite = suite("which position each topic is seeked to")(
        test("THE TOPIC THAT OWNS THE ID IS SEEKED TO THE EXACT MESSAGE, not to its millisecond") {
            val seeks = messageIdSeeks(consumersOn(orders, payments), identity, orders, messageId, 1_700_000_000_123L)
            assertTrue(seeks.toMap.apply(orders) == MessageIdSeek.ById(messageId)) ?? s"seeks=$seeks"
        },
        test("every OTHER topic is seeked by publish time - the only cross-topic position there is") {
            val seeks = messageIdSeeks(consumersOn(orders, payments), identity, orders, messageId, 1_700_000_000_123L)
            assertTrue(seeks.toMap.apply(payments) == MessageIdSeek.ByPublishTime(1_700_000_000_123L)) ?? s"seeks=$seeks"
        },
        test("both consumers of a topic reached by two targets get the exact id") {
            // Each enabled target has its own consumer on the topic, and both own the message.
            val seeks = messageIdSeeks(Vector("a" -> orders, "b" -> orders, "c" -> payments), _._2, orders, messageId, 500L)
            assertTrue(
                seeks.count((_, seek) => seek == MessageIdSeek.ById(messageId)) == 2,
                seeks.count((_, seek) => seek == MessageIdSeek.ByPublishTime(500L)) == 1
            ) ?? s"seeks=$seeks"
        },
        test("a single-topic session is seeked by id and never by time") {
            val seeks = messageIdSeeks(consumersOn(orders), identity, orders, messageId, 500L)
            assertTrue(seeks.forall((_, seek) => seek == MessageIdSeek.ById(messageId)))
        }
    )

    /** "NOT FOUND" IS A DIAGNOSIS OF THE USER'S INPUT, so it must not be what the server says when
      * the fault is its own. Every operational failure used to collapse into the same `None` as a
      * genuine absence.
      */
    private val honestySuite = suite("a lookup that could not be made is not a lookup that found nothing")(
        test("A MESSAGE ID THAT CANNOT BE PARSED is rejected as invalid, not reported as 'not found'") {
            val result = withOfflineClient(client => Try(getMessageById(client, orders, Array[Byte](1, 2, 3))))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                result.failed.toOption.exists(err => !err.getMessage.toLowerCase.contains("not found"))
            ) ?? s"result=$result"
        },
        test("A BROKER THAT CANNOT BE REACHED FAILS THE LOOKUP instead of answering 'not found'") {
            // Reported as absence, this told the user their message id was wrong - and on a
            // multi-topic session it let an unreachable topic be silently skipped, so the session
            // was positioned from whichever topics happened to answer.
            val realId = new MessageIdImpl(1L, 0L, -1).toByteArray
            val result = withOfflineClient(client => Try(getMessageById(client, orders, realId)))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                result.failed.toOption.exists(_.getMessage.contains(orders))
            ) ?? s"result=$result"
        }
    )

    private val dedupSuite = suite("looking the id up across a session's topics")(
        test("TWO TARGETS ON THE SAME TOPIC resolve one message, not a duplicate of it") {
            // THE regression. The same physical topic named twice is one message, and asking the
            // broker for it twice is both wrong and wasteful.
            val (lookup, reads) = broker(Map(orders -> "m1"))
            val got = Try(resolveMessageIdAcrossTopics(Vector(orders, orders), lookup))
            assertTrue(got.toOption.flatten == Some("m1"), reads() == 1) ??
                s"the same topic reached by two targets must resolve once, got $got after ${reads()} lookups"
        },
        test("three targets on one topic and one on another still resolve the single hit") {
            val (lookup, reads) = broker(Map(orders -> "m1"))
            val got = Try(resolveMessageIdAcrossTopics(Vector(orders, payments, orders, orders), lookup))
            assertTrue(got.toOption.flatten == Some("m1"), reads() == 2) ?? s"got $got after ${reads()} lookups"
        },
        test("a message id that no topic holds resolves to nothing") {
            val (lookup, _) = broker(Map.empty)
            assertTrue(resolveMessageIdAcrossTopics(Vector(orders, payments), lookup).isEmpty)
        },
        test("one topic holding it resolves to that message") {
            val (lookup, _) = broker(Map(payments -> "m2"))
            assertTrue(resolveMessageIdAcrossTopics(Vector(orders, payments), lookup) == Some("m2"))
        },
        test("two GENUINELY DIFFERENT topics answering is still ambiguous and still refused") {
            // The dedup must not paper over the real ambiguity it was added around: a message id is
            // only unique within one topic, so two distinct topics answering means the session
            // cannot know which message the user meant.
            val (lookup, _) = broker(Map(orders -> "m1", payments -> "m2"))
            val got = Try(resolveMessageIdAcrossTopics(Vector(orders, payments), lookup))
            assertTrue(
                got.isFailure,
                got.failed.toOption.exists(_.getMessage.contains("Multiple messages"))
            ) ?? s"two different topics holding the id must be refused, got $got"
        },
        test("no topics at all resolve to nothing without asking the broker") {
            val (lookup, reads) = broker(Map(orders -> "m1"))
            assertTrue(resolveMessageIdAcrossTopics(Vector.empty, lookup).isEmpty, reads() == 0)
        }
    )

    def spec = suite(this.getClass.toString)(dedupSuite, seekSuite, honestySuite)
