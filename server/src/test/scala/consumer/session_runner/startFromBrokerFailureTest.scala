package consumer.session_runner

import org.apache.pulsar.client.admin.PulsarAdminException
import org.apache.pulsar.client.api.Consumer
import zio.test.*

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import java.util.concurrent.TimeoutException
import scala.util.Try

/** A BROKER THAT COULD NOT ANSWER IS NOT AN EMPTY TOPIC.
  *
  * Every start-from position that has to be looked up went through `Try(...).toOption`, so a
  * timeout, a 401, a 404 or a broker restarting mid-request produced exactly the same `None` as
  * "this log holds nothing there" - and every caller reads that `None` as an answer:
  *
  *   - `resolveLatestN` reads it as "the log holds fewer than n messages" and seeks to EARLIEST, so
  *     a transient 500 turned "the latest 5 messages" into the entire backlog;
  *   - the approximate-entry seek reads it as "that entry is gone" and falls back to EARLIEST;
  *   - the approximate-time span reads it as "this partition holds nothing" and computes the cutoff
  *     from only the partitions that happened to answer;
  *   - the global merge reads a failed `getLastMessageIds` as "this stream is already drained" and
  *     stops waiting for it, so a whole partition can be left out of a global skip or latest.
  *
  * In every case the session was created successfully and started somewhere the user did not ask
  * for. The two states are kept apart by [[isEmptyLogAnswer]], whose classification is MEASURED -
  * see its scaladoc for the exact status codes and reasons this Pulsar answers with.
  */
object startFromBrokerFailureTest extends ZIOSpecDefault:

    private val topicFqn = "persistent://public/default/failing"
    private val otherTopicFqn = "persistent://public/default/failing-other"

    /** The measured 412 an EMPTY topic answers `examinemessage` with. */
    private def emptyTopicError: Throwable =
        PulsarAdminException.PreconditionFailedException(
            new RuntimeException("Could not examine messages due to the total message is zero"),
            "Could not examine messages due to the total message is zero",
            412
        )

    /** The measured 500 a walk that ran PAST THE START of the log answers with. */
    private val pastStartReason =
        "\n --- An unexpected error occurred in the server ---\n\nMessage: Incorrect parameter input error code: -14\n\n" +
            "Stacktrace:\n\norg.apache.bookkeeper.mledger.ManagedLedgerException: Incorrect parameter input error code: -14"

    private def pastStartOfLogError: Throwable =
        PulsarAdminException.ServerSideErrorException(new RuntimeException("past the start"), pastStartReason, pastStartReason, 500)

    /** A 500 that means the broker is unwell, not that the log ran out. */
    private val serverErrorReason = "\n --- An unexpected error occurred in the server ---\n\nMessage: Failed to get managed ledger"

    private def serverError: Throwable =
        PulsarAdminException.ServerSideErrorException(new RuntimeException("boom"), serverErrorReason, serverErrorReason, 500)

    /** MEASURED: a broker that cannot be reached at all reports the SAME statusCode 500 as a walk
      * that ran off the start of the log, with a null `httpError`. It is the one shape that makes
      * classifying on the status code alone unsafe. */
    private def unreachableBrokerError: Throwable =
        PulsarAdminException(
            new java.util.concurrent.CompletionException(new RuntimeException("retries exhausted")),
            "java.util.concurrent.CompletionException: org.apache.pulsar.client.admin.internal.http.AsyncHttpConnector$RetryException: " +
                "Could not complete the operation. Number of retries has been exhausted. Failed reason: connection refused",
            500
        )

    private val classificationSuite = suite("telling an empty log from a broker that could not answer")(
        test("the measured EMPTY-TOPIC answer is an answer") {
            assertTrue(isEmptyLogAnswer(emptyTopicError))
        },
        test("the measured PAST-THE-START answer is an answer") {
            assertTrue(isEmptyLogAnswer(pastStartOfLogError))
        },
        test("an answer buried in a cause chain is still recognised") {
            // The admin client wraps, and so does everything between here and it.
            val wrapped = new RuntimeException("Failed to resolve start position", new RuntimeException("wrapper", pastStartOfLogError))
            assertTrue(isEmptyLogAnswer(wrapped))
        },
        test("an unrelated server error is NOT an empty log") {
            // THE defect: this used to be indistinguishable from an empty topic.
            assertTrue(!isEmptyLogAnswer(serverError))
        },
        test("an UNREACHABLE BROKER is not an empty log, although it reports the same 500") {
            // MEASURED, and the reason the status code alone cannot decide this: a broker that was
            // never reached answers with statusCode 500 exactly as a walk past the start of the log
            // does. Classifying 500 as "nothing there" would have turned every connection failure
            // into a silent seek to earliest.
            assertTrue(!isEmptyLogAnswer(unreachableBrokerError))
        },
        test("a timeout, an authorization failure and a missing topic are NOT empty logs") {
            val timeout = new TimeoutException("Request timed out after 30000 ms")
            val notAuthorized = PulsarAdminException.NotAuthorizedException(new RuntimeException("no"), "Don't have permission", 401)
            val notFound = PulsarAdminException.NotFoundException(new RuntimeException("no"), "Topic not found", 404)
            val misclassified = Vector[Throwable](timeout, notAuthorized, notFound).filter(isEmptyLogAnswer)
            assertTrue(misclassified.isEmpty) ?? s"read as an empty log: ${misclassified.map(_.getMessage)}"
        },
        test("an exception carrying no message at all is NOT an empty log") {
            assertTrue(!isEmptyLogAnswer(new RuntimeException()))
        },
        test("a cause chain that loops terminates instead of hanging") {
            // Bounded on purpose: this runs on the session-creation path, and the JVM permits a
            // cycle of length two even though it refuses direct self-causation.
            val first = new RuntimeException("round")
            val second = new RuntimeException("and round")
            first.initCause(second)
            second.initCause(first)
            assertTrue(!isEmptyLogAnswer(first))
        }
    )

    private val lookupSuite = suite("asking the broker one question")(
        test("an answer comes back as an answer") {
            assertTrue(brokerAnswer("examining an entry", topicFqn)("entry-1") == Some("entry-1"))
        },
        test("'there is nothing there' comes back as None, for both of its shapes") {
            val empty = brokerAnswer[String]("examining an entry", topicFqn)(throw emptyTopicError)
            val pastStart = brokerAnswer[String]("examining an entry", topicFqn)(throw pastStartOfLogError)
            assertTrue(empty.isEmpty, pastStart.isEmpty)
        },
        test("a broker that could not answer FAILS, naming the topic and the question") {
            // A user has to be able to tell "your topic is empty" from "the broker is unwell", and
            // the only place that can be said is here.
            val cause = serverError
            val result = Try(brokerAnswer[String]("examining an entry", topicFqn)(throw cause))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                result.failed.toOption.exists(_.getMessage.contains(topicFqn)),
                result.failed.toOption.exists(_.getMessage.contains("examining an entry")),
                // The cause is kept, so the operator sees the broker's own words in the log.
                result.failed.toOption.flatMap(err => Option(err.getCause)).exists(_ eq cause)
            ) ?? s"result=$result"
        }
    )

    /** The production shape: `resolveLatestN` walking entries back from the end of a log, with the
      * broker behind [[brokerAnswer]] exactly as `entryFromLatest` puts it there. */
    private def walkBackFrom(answers: Long => Any): String => Long => Option[LogEntry[String]] =
        _ => k => brokerAnswer("examining the entry", topicFqn)(answers(k)).map(_ => LogEntry(s"entry-$k", 1_000L, 1))

    /** `entry-$k` counts back from the end, so a larger ordinal is strictly OLDER - the same order
      * `MessageIdImpl.compareTo` gives real entry ids. */
    private def olderByEntryOrdinal(a: String, b: String): Boolean = a.split("-").last.toInt > b.split("-").last.toInt

    private def resolveOne(n: Long, lookup: String => Long => Option[LogEntry[String]]): LatestNSeek[String] =
        resolveLatestN(n, Vector(topicFqn), lookup, olderByEntryOrdinal)(topicFqn)

    private val latestNSuite = suite("latest n: a failed lookup must not become 'the log is exhausted'")(
        test("A TRANSIENT BROKER FAILURE FAILS THE RESOLUTION instead of seeking to earliest") {
            // THE defect. `entryFromLatest` answering None means "this log has no entry there", and
            // the walk reads that as the end of the log - so the caller shows all of it. A 500 on
            // the third entry of a large log therefore turned "the latest 5" into the whole backlog
            // - with the session reporting success.
            val lookup = walkBackFrom(k => if k >= 3 then throw serverError else s"message-$k")
            val result = Try(resolveOne(5, lookup))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException])
            ) ?? s"a broker failure resolved to $result, which the caller reads as 'show the whole log'"
        },
        test("a log genuinely shorter than n still shows all of it") {
            // The control, and the reason the two states cannot simply be merged into a failure:
            // this is an ordinary, correct outcome - anchored at the oldest entry the walk took,
            // so the retention re-check can later prove the anchor still exists.
            val lookup = walkBackFrom(k => if k > 3 then throw pastStartOfLogError else s"message-$k")
            assertTrue(resolveOne(5, lookup) == LatestNSeek.FromEntry("entry-3", 0L))
        },
        test("an empty log maps to EVERYTHING - its whole content at seek time is post-inspection live traffic") {
            // The classifier still answers None (not a failure); the MAPPING is what changed:
            // seeking earliest preserves anything appended between the inspection and the seek,
            // where seek-time "latest" silently lost it.
            val lookup = walkBackFrom(_ => throw emptyTopicError)
            assertTrue(resolveOne(5, lookup) == LatestNSeek.Everything)
        },
        test("a log long enough still resolves exactly") {
            val lookup = walkBackFrom(k => if k > 10 then throw pastStartOfLogError else s"message-$k")
            assertTrue(resolveOne(3, lookup) == LatestNSeek.FromEntry("entry-3", 0L))
        }
    )

    private val timeSpanSuite = suite("approximate publish time: a partition that could not be read must not be dropped from the range")(
        test("A PARTITION THE BROKER COULD NOT READ FAILS THE RESOLUTION") {
            // The range is min(first) .. max(last) across every partition. Silently leaving out the
            // partition that failed produced a confident cutoff over a narrower range - a different
            // position, reported as success.
            val spanOf = (topic: String) =>
                brokerAnswer("reading the publish-time span", topic) {
                    if topic == otherTopicFqn then throw serverError else TopicPublishTimeSpan(1_000L, 2_000L)
                }
            val result = Try(resolveApproximatePublishTimePosition(0.5, Vector(topicFqn, otherTopicFqn), spanOf))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException])
            ) ?? s"the cutoff was computed from only the partitions that answered: $result"
        },
        test("a partition that genuinely holds nothing is still skipped, as it must be") {
            // An empty partition has no retained boundary entry; counting it as time zero would
            // drag the range back to 1970.
            val spanOf = (topic: String) =>
                brokerAnswer("reading the publish-time span", topic) {
                    if topic == otherTopicFqn then throw emptyTopicError else TopicPublishTimeSpan(1_000L, 2_000L)
                }
            assertTrue(
                resolveApproximatePublishTimePosition(0.5, Vector(topicFqn, otherTopicFqn), spanOf) ==
                    ApproximatePublishTimeSeek.Timestamp(1_500L)
            )
        }
    )

    /** A consumer whose `getLastMessageIds` behaves as told. */
    private def consumerOn(topicFqn: String, lastMessageIds: () => java.util.List[org.apache.pulsar.client.api.MessageId]): Consumer[Array[Byte]] =
        val handler = new InvocationHandler:
            override def invoke(proxy: Object, method: Method, args: Array[Object]): Object =
                method.getName match
                    case "getTopic"           => topicFqn
                    case "getConsumerName"    => "cs-failing-0"
                    case "getLastMessageIds"  => lastMessageIds()
                    case "equals"             => java.lang.Boolean.valueOf(proxy eq args(0))
                    case "hashCode"           => java.lang.Integer.valueOf(topicFqn.hashCode)
                    case "toString"           => s"proxy-consumer($topicFqn)"
                    case _                    => null
        Proxy
            .newProxyInstance(getClass.getClassLoader, Array[Class[?]](classOf[Consumer[Array[Byte]]]), handler)
            .asInstanceOf[Consumer[Array[Byte]]]

    private val streamsSuite = suite("global ordering: a stream whose end could not be read must not be called drained")(
        test("A BROKER THAT WILL NOT SAY WHERE A PARTITION ENDS FAILS THE SESSION") {
            // A stream recorded as "empty" is never waited for, so a global skip or latest simply
            // leaves that whole partition out of the merge - it delivers messages that are neither
            // counted nor ordered against the rest.
            val consumer = consumerOn(topicFqn, () => throw serverError)
            val result = Try(startFromStreamsAt(Vector(consumer)))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                result.failed.toOption.exists(_.getMessage.contains(topicFqn))
            ) ?? s"result=$result"
        },
        test("a NON-PERSISTENT topic is still recorded as drained, without asking") {
            // It retains nothing by definition, so there is no end to read and nothing to wait for.
            // Decided from the FQN rather than from whatever the call happens to throw.
            val nonPersistent = "non-persistent://public/default/live-only"
            val consumer = consumerOn(nonPersistent, () => throw new UnsupportedOperationException("must not be asked"))
            val streams = startFromStreamsAt(Vector(consumer))
            assertTrue(streams.map(_.lastAtStart) == Vector(EntryPosition.empty))
        },
        test("a partition that answers is recorded at the end it reported") {
            val consumer = consumerOn(
                topicFqn,
                () => java.util.List.of(new org.apache.pulsar.client.impl.MessageIdImpl(7L, 3L, 0))
            )
            assertTrue(startFromStreamsAt(Vector(consumer)).map(_.lastAtStart) == Vector(EntryPosition(7L, 3L, -1, 1)))
        },
        test("an EMPTY partition answers with MessageId.earliest and is drained from the start") {
            val consumer = consumerOn(topicFqn, () => java.util.List.of(org.apache.pulsar.client.api.MessageId.earliest))
            assertTrue(startFromStreamsAt(Vector(consumer)).map(_.lastAtStart) == Vector(EntryPosition.empty))
        }
    )

    def spec = suite(this.getClass.toString)(classificationSuite, lookupSuite, latestNSuite, timeSpanSuite, streamsSuite)
