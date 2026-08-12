package consumer.session_runner

import _root_.consumer.start_from.{
    ApproximateEntryPosition,
    ApproximatePublishTimePosition,
    ConsumerSessionStartFrom,
    DateTime,
    DateTimeUnit,
    EarliestMessage,
    LatestMessage,
    MessageId,
    NthMessageAfterEarliest,
    NthMessageBeforeLatest,
    RelativeDateTime
}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import zio.test.*

import java.util.concurrent.TimeUnit
import scala.util.Try

/** THE COUNT ON A COUNTING START-FROM IS A NUMBER SOMEBODY TYPED, and it arrives over gRPC as a
  * plain `int64` that any client can fill in with anything.
  *
  * The server used to CLAMP rather than refuse, and a clamp answers a different question without
  * saying so:
  *
  *   - "skip the first -1 messages" was read as EARLIEST - the whole topic;
  *   - "the latest -1 messages" was read as LATEST - nothing retained at all;
  *   - "the latest 3,000,000,000 messages" was truncated to `Int.MaxValue` inside the retain heap.
  *
  * Each of those is a valid position the user did not ask for, delivered with a successful session.
  *
  * THERE IS DELIBERATELY NO UPPER BOUND ON SKIP-N. Skipping n messages is O(n) by nature - Pulsar
  * keeps no message-ordinal index - so any cap would be an arbitrary number rather than a limit of
  * the design, and the progress API exists precisely so a long skip can be watched. The bound on
  * LATEST-N is not a policy choice: its retained set is an in-memory heap of exactly n, indexed by
  * Int, so a larger n cannot be represented at all.
  */
object startFromCountValidationTest extends ZIOSpecDefault:

    private def reason(startFrom: ConsumerSessionStartFrom): Option[String] = startFromCountRejectionReason(startFrom)

    private val rejectionSuite = suite("which counts the server refuses")(
        test("a NEGATIVE skip-n is refused, not read as 'start at the beginning'") {
            val refusals = Vector(-1L, -5L, Long.MinValue).map(n => n -> reason(NthMessageAfterEarliest(n = n)))
            assertTrue(refusals.forall((_, why) => why.isDefined)) ?? s"$refusals"
        },
        test("a NEGATIVE latest-n is refused, not read as 'show nothing'") {
            val refusals = Vector(-1L, -5L, Long.MinValue).map(n => n -> reason(NthMessageBeforeLatest(n = n)))
            assertTrue(refusals.forall((_, why) => why.isDefined)) ?? s"$refusals"
        },
        test("the refusal says which control was wrong and what it was set to") {
            // A session can only be fixed if the error names the field. Both counting modes carry an
            // n, so "n must be positive" on its own is not enough.
            val skip = reason(NthMessageAfterEarliest(n = -3)).getOrElse("")
            val latest = reason(NthMessageBeforeLatest(n = -3)).getOrElse("")
            assertTrue(
                skip.contains("-3") && skip.toLowerCase.contains("skip"),
                latest.contains("-3") && latest.toLowerCase.contains("latest"),
                skip != latest
            ) ?? s"skip=$skip latest=$latest"
        },
        test("ZERO is accepted by both - it is a real position, not a mistake") {
            // "skip nothing" is the beginning, and "the latest 0 messages" is the live tail.
            assertTrue(reason(NthMessageAfterEarliest(n = 0)).isEmpty, reason(NthMessageBeforeLatest(n = 0)).isEmpty)
        },
        test("SKIP-N HAS NO UPPER BOUND - not even an enormous one is refused") {
            // Deliberate. Skipping is O(n) whatever the number, the progress API exists to show it
            // happening, and a cap would be an invented limit rather than a real one.
            val enormous = Vector(1_000_000L, Int.MaxValue.toLong + 1, Long.MaxValue)
            val wronglyRefused = enormous.filter(n => reason(NthMessageAfterEarliest(n = n)).isDefined)
            assertTrue(wronglyRefused.isEmpty) ?? s"a cap was introduced on skip-n: $wronglyRefused"
        },
        test("a latest-n above the OPERATIONAL boundary is REFUSED, not truncated") {
            // It used to be silently narrowed to Int.MaxValue, which answers a different request -
            // and Int.MaxValue itself, a leftover of a heap that no longer exists, still admitted a
            // request the server would grind on for hours holding the lifecycle lock: the walk
            // costs one synchronous broker lookup per entry with no progress to show. The boundary
            // is an operational one now, and the refusal points at skip-n, which streams.
            val why = reason(NthMessageBeforeLatest(n = latestNMaxAccepted + 1))
            val enormous = reason(NthMessageBeforeLatest(n = Int.MaxValue.toLong))
            assertTrue(
                why.isDefined,
                why.exists(_.contains(latestNMaxAccepted.toString)),
                enormous.isDefined
            ) ?? s"why=$why enormous=$enormous"
        },
        test("a latest-n of exactly the boundary is still accepted") {
            assertTrue(reason(NthMessageBeforeLatest(n = latestNMaxAccepted)).isEmpty)
        },
        test("every mode that carries no count is untouched") {
            val countless: Vector[ConsumerSessionStartFrom] = Vector(
                EarliestMessage(),
                LatestMessage(),
                DateTime(dateTime = java.time.Instant.EPOCH),
                RelativeDateTime(value = 1, unit = DateTimeUnit.Hour, isRoundedToUnitStart = false),
                MessageId(messageIdBytes = Array.empty),
                ApproximateEntryPosition(fraction = 0.6),
                ApproximatePublishTimePosition(fraction = 0.6)
            )
            val wronglyRefused = countless.filter(mode => reason(mode).isDefined)
            assertTrue(wronglyRefused.isEmpty) ?? s"${wronglyRefused.map(_.getClass.getSimpleName)}"
        }
    )

    /** Real clients aimed at a closed port. An empty consumer set reaches no broker on this path, so
      * an accidental broker call would surface as a connection error rather than as an NPE that
      * makes the assertion pass for the wrong reason. */
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

    private def plan(startFrom: ConsumerSessionStartFrom): Try[StartFromPlan] =
        withOfflineClients((client, admin) =>
            Try(handleStartFrom(
                startFrom = startFrom,
                consumers = Vector.empty,
                adminClient = admin,
                pulsarClient = client,
                nonPartitionedTopicFqns = Vector.empty
            ))
        )

    private val boundarySuite = suite("the refusal happens at the trust boundary")(
        test("a negative skip-n fails the session instead of seeking to earliest") {
            val result = plan(NthMessageAfterEarliest(n = -5))
            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[IllegalArgumentException]),
                result.failed.toOption.exists(_.getMessage.contains("-5"))
            ) ?? s"result=$result"
        },
        test("a negative latest-n fails the session instead of seeking to latest") {
            val result = plan(NthMessageBeforeLatest(n = -5))
            assertTrue(result.isFailure, result.failed.toOption.exists(_.getMessage.contains("-5"))) ?? s"result=$result"
        },
        test("an ordinary count still plans normally") {
            assertTrue(plan(NthMessageAfterEarliest(n = 5)).map(_.discard) == scala.util.Success(StartFromDiscardPlan.SharedTotal(5)))
        }
    )

    /** A log of `entries` unbatched entries, newest first, all with the same publish time. */
    private def oneTopic(entries: Int): String => Long => Option[LogEntry[String]] =
        _ => k => Option.when(k >= 1 && k <= entries)(LogEntry(s"entry-$k", 1_000L, 1))

    /** `entry-$k` counts back from the end, so a larger ordinal is strictly OLDER - the same order
      * `MessageIdImpl.compareTo` gives real entry ids. */
    private def olderByEntryOrdinal(a: String, b: String): Boolean = a.split("-").last.toInt > b.split("-").last.toInt

    private val memorySuite = suite("LATEST-N BUFFERS NOTHING, whatever n is")(
        test("a latest-n session arms no ordering layer, so it can hold nothing at all") {
            // THE structural guarantee. Latest-n used to narrow its answer with a top-n heap of n
            // DELIVERED messages plus an unbounded queue of live traffic beside it, so its memory
            // was a number the user typed and a live message could evict a historical one. The cut
            // is now resolved from entry metadata before a single message is delivered.
            val armed = Vector(1, 2, 5, 50).map(streams => streams -> needsGlobalOrdering(NthMessageBeforeLatest(n = 1_000_000), streams))
            assertTrue(armed.forall((_, needed) => !needed)) ?? s"latest-n asked for a buffering layer: $armed"
        },
        test("the resolved cut is O(topics) in memory - it holds one entry per topic, never n") {
            // 1,000,000 messages asked for over 3 topics resolves to at most 3 answers.
            val cut = resolveLatestN(1_000_000L, Vector("a", "b", "c"), oneTopic(10), olderByEntryOrdinal)
            assertTrue(cut.size == 3) ?? s"cut=$cut"
        },
        test("the walk is O(n / batch size) lookups and never touches a message payload") {
            var lookups = 0
            val entryFromLatest: String => Long => Option[LogEntry[String]] = _ =>
                k =>
                    lookups += 1
                    Option.when(k >= 1 && k <= 1000)(LogEntry(s"entry-$k", 1_000L - k, 10))
            resolveLatestN(50L, Vector("a"), entryFromLatest, olderByEntryOrdinal)
            assertTrue(lookups == 5) ?? s"$lookups lookups for 50 messages over batches of 10"
        }
    )

    /** Target-aware refusals: sessions whose retained-log-derived mode cannot mean what it promises on these
      * targets are refused at creation, with the reason naming what to change. */
    private val targetAwareSuite = suite("target-aware refusals for retained-log-derived modes")(
        test("latest-n is refused when any enabled target reads COMPACTED") {
            val refused = readCompactedStartFromRejectionReason(NthMessageBeforeLatest(n = 3), readCompactedTargetIndexes = Vector(1))
            val fine = readCompactedStartFromRejectionReason(NthMessageBeforeLatest(n = 3), readCompactedTargetIndexes = Vector.empty)
            assertTrue(
                refused.exists(_.contains("compacted")),
                refused.exists(_.contains("1")),
                fine.isEmpty
            ) ?? s"refused=$refused fine=$fine"
        },
        test("both percentage modes are refused because their raw-log positions do not describe a compacted view") {
            val targetIndexes = Vector(4, 1)
            val entry = readCompactedStartFromRejectionReason(ApproximateEntryPosition(0.5), targetIndexes)
            val publishTime = readCompactedStartFromRejectionReason(ApproximatePublishTimePosition(0.5), targetIndexes)
            assertTrue(
                entry.exists(message => message.contains("Approximate position (% of data)") && message.contains("1, 4") && message.contains("raw stored entries")),
                publishTime.exists(message =>
                    message.contains("Approximate position (% of time)") && message.contains("1, 4") && message.contains("raw retained log")
                )
            ) ?? s"entry=$entry publishTime=$publishTime"
        },
        test("latest-0 and delivery-counted skip remain valid on a compacted view") {
            assertTrue(
                readCompactedStartFromRejectionReason(NthMessageBeforeLatest(n = 0), Vector(0)).isEmpty,
                readCompactedStartFromRejectionReason(NthMessageAfterEarliest(n = 5), Vector(0)).isEmpty
            )
        },
        test("without a read-compacted target no mode is refused") {
            assertTrue(
                readCompactedStartFromRejectionReason(ApproximateEntryPosition(0.5), Vector.empty).isEmpty,
                readCompactedStartFromRejectionReason(ApproximatePublishTimePosition(0.5), Vector.empty).isEmpty,
                readCompactedStartFromRejectionReason(NthMessageBeforeLatest(n = 3), Vector.empty).isEmpty
            )
        },
        test("skip-n is refused when two enabled targets share a physical topic, and the reason NAMES it") {
            val shared = "persistent://t/ns/shared-partition-0"
            val refused = skipOverlapRejectionReason(
                NthMessageAfterEarliest(n = 5),
                topicsPerEnabledTarget = Vector(Vector(shared, "persistent://t/ns/a"), Vector(shared))
            )
            assertTrue(
                refused.exists(_.contains(shared)),
                refused.exists(_.contains("same topic"))
            ) ?? s"refused=$refused"
        },
        test("skip-n with DISJOINT targets, one target, or n = 0 is not refused") {
            assertTrue(
                skipOverlapRejectionReason(
                    NthMessageAfterEarliest(n = 5),
                    Vector(Vector("persistent://t/ns/a"), Vector("persistent://t/ns/b"))
                ).isEmpty,
                skipOverlapRejectionReason(NthMessageAfterEarliest(n = 5), Vector(Vector("persistent://t/ns/a"))).isEmpty,
                skipOverlapRejectionReason(
                    NthMessageAfterEarliest(n = 0),
                    Vector(Vector("persistent://t/ns/a"), Vector("persistent://t/ns/a"))
                ).isEmpty,
                // Latest-n keeps its per-view duplicate contract: overlap is not its problem.
                skipOverlapRejectionReason(
                    NthMessageBeforeLatest(n = 5),
                    Vector(Vector("persistent://t/ns/a"), Vector("persistent://t/ns/a"))
                ).isEmpty
            )
        },
        test("a latest-n anchor trimmed between resolving and seeking is refused, not silently shortened") {
            // Entry ids compare as the production comparator does; the topic now retains only
            // entry 5, and the resolved anchor was entry 3 - gone.
            val cut = Map("persistent://t/ns/a" -> LatestNSeek.FromEntry(3L, 0L))
            val trimmed = latestNAnchorRejectionReason[Long](cut, _ => Some(5L), (a, b) => a < b)
            val intact = latestNAnchorRejectionReason[Long](cut, _ => Some(2L), (a, b) => a < b)
            val emptied = latestNAnchorRejectionReason[Long](cut, _ => None, (a, b) => a < b)
            assertTrue(
                trimmed.exists(_.contains("retention removed")),
                intact.isEmpty,
                emptied.isDefined // retains nothing at all: the anchor is gone by definition
            ) ?? s"trimmed=$trimmed intact=$intact emptied=$emptied"
        },
        test("an EXHAUSTED CONTRIBUTOR's trimmed anchor is caught - it is FromEntry now, never Everything") {
            // The escape this closes: a topic whose whole backlog was counted resolved to
            // `Everything`, the re-check only inspected FromEntry, and retention deleting that
            // topic's contribution between resolving and seeking silently shrank the result
            // below the promised n. Exhausted contributors now carry their oldest-entry anchor,
            // so the same trim is refused like any other.
            val cut = Map("persistent://t/ns/exhausted" -> LatestNSeek.FromEntry(1L, 0L))
            val trimmed = latestNAnchorRejectionReason[Long](cut, _ => None, (a, b) => a < b)
            assertTrue(trimmed.exists(_.contains("retention removed")))
        },
        test("EVERYTHING and NOTHING cuts need no anchor - only FromEntry is re-checked") {
            val cut = Map(
                "persistent://t/ns/a" -> LatestNSeek.Everything,
                "persistent://t/ns/b" -> (LatestNSeek.Nothing: LatestNSeek[Long])
            )
            assertTrue(latestNAnchorRejectionReason[Long](cut, _ => None, (a, b) => a < b).isEmpty)
        }
    )

    def spec = suite(this.getClass.toString)(rejectionSuite, boundarySuite, memorySuite, targetAwareSuite)
