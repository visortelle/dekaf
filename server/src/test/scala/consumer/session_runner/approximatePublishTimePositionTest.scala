package consumer.session_runner

import zio.test.*

import scala.collection.mutable
import scala.util.Try
import java.util.concurrent.atomic.AtomicInteger

/** "Start approximately this far through the PUBLISH-TIME RANGE this topic covers" ([[ApproximatePublishTimePosition]]).
  *
  * The contract is per logical topic: `earliest` is the minimum observed first-entry publish time
  * over its partitions, `latest` the maximum observed last-entry publish time, and the cutoff is
  * `earliest + fraction * (latest - earliest)`. Every partition is seeked to that one instant.
  * Min/max rather than a per-partition quantile is what makes the endpoints exact by construction,
  * the mapping monotonic, and the answer independent of how many partitions the topic has.
  *
  * PURE by construction: the broker sits behind the `timeSpanOf` lookup, so every arrangement below -
  * balanced partitions, uneven ones, an idle one, an empty topic, a topic that occupies a single
  * instant, both endpoints - is driven with a plain function and no broker. The live-broker
  * counterpart is `CsStartFromOutcomesSpec` CS-SF-16..19.
  */
object approximatePublishTimePositionTest extends ZIOSpecDefault:

    import ApproximatePublishTimeSeek.*

    /** A topic whose partitions are named `p0`, `p1`, ... with the spans given. */
    private def topic(spans: (String, (Long, Long))*): (Vector[String], String => Option[TopicPublishTimeSpan]) =
        val byName = spans.toMap
        (spans.map(_._1).toVector, name => byName.get(name).map((first, last) => TopicPublishTimeSpan(first, last)))

    private def resolve(fraction: Double, spans: (String, (Long, Long))*): ApproximatePublishTimeSeek =
        val (partitions, lookup) = topic(spans*)
        resolveApproximatePublishTimePosition(fraction, partitions, lookup)

    private def rejected(fraction: Double): Option[String] =
        Try(resolve(fraction, "p0" -> (1000L, 2000L))).failed.toOption.map(_.getMessage)

    /** One partition covering 1000..2000ms - the simplest possible arrangement. */
    private val single = Seq("p0" -> (1000L, 2000L))

    private val endpointsSuite = suite("endpoints")(
        test("0.0 is the earliest retained message, not the earliest TIMESTAMP") {
            // Both would deliver the same first message when the recorded time is still accurate,
            // but only MessageId.earliest keeps working when it is not - and a timestamp seek
            // computed from a stale reading would silently skip the head of the log.
            assertTrue(resolve(0.0, single*) == Earliest)
        },
        test("1.0 seeks to the observed last-entry publish-time boundary") {
            // NOT "past the end", which is what 1.0 means in the entry mode. The publish-time mode's high
            // endpoint is a timestamp seek and can include every message sharing that millisecond.
            assertTrue(resolve(1.0, single*) == Timestamp(2000L))
        },
        test("the endpoints are exact - never derived by interpolating to the ends") {
            // Interpolation would reach the same two numbers by arithmetic on doubles. Pinned as
            // its own case because the whole point of an endpoint is that it cannot be off by one.
            val spread = Seq("p0" -> (1_700_000_000_123L, 1_700_000_086_400_000L))
            assertTrue(
                resolve(0.0, spread*) == Earliest,
                resolve(1.0, spread*) == Timestamp(1_700_000_086_400_000L)
            )
        },
        test("1.0 uses the largest observed last-entry time across the topic's partitions") {
            assertTrue(resolve(1.0, "p0" -> (1000L, 5000L), "p1" -> (2000L, 9000L)) == Timestamp(9000L))
        },
        test("0.0 answers without asking the broker anything at all") {
            // The earliest end needs no time range, so it must not pay for one: two admin calls per
            // partition is the cost this endpoint gets to skip.
            val asked = mutable.ListBuffer.empty[String]
            val seek = resolveApproximatePublishTimePosition(
                0.0,
                Vector("p0", "p1", "p2"),
                name =>
                    asked += name
                    Some(TopicPublishTimeSpan(1000L, 2000L))
            )
            assertTrue(seek == Earliest, asked.isEmpty) ?? s"0.0 looked up $asked"
        }
    )

    private val interpolationSuite = suite("the cutoff between the endpoints")(
        test("half way through a single partition's range is half way through its time") {
            assertTrue(resolve(0.5, "p0" -> (1000L, 2000L)) == Timestamp(1500L))
        },
        test("balanced partitions covering the same range resolve to that range's midpoint") {
            // Every partition is seeked to the SAME instant - the position is a property of the
            // logical topic, not of whichever partition a message happens to live on.
            assertTrue(resolve(0.5, "p0" -> (1000L, 2000L), "p1" -> (1000L, 2000L)) == Timestamp(1500L))
        },
        test("partitions with different spans are combined as min(first) .. max(last)") {
            // p0 covers 1000..3000 and p1 covers 2000..5000, so the topic covers 1000..5000 and 25%
            // of it is 2000 - inside p1's very first message and a third of the way into p0.
            assertTrue(
                resolve(0.25, "p0" -> (1000L, 3000L), "p1" -> (2000L, 5000L)) == Timestamp(2000L),
                resolve(0.5, "p0" -> (1000L, 3000L), "p1" -> (2000L, 5000L)) == Timestamp(3000L)
            )
        },
        test("an IDLE partition does not drag the position backwards") {
            // p1 stopped receiving at 1100 while p0 ran on to 9000. A per-partition quantile would
            // give p1 a cutoff near its own middle and hand back messages from the far past; taking
            // the topic's own min/max puts both partitions at the same instant, and the idle one
            // simply has nothing at or after it. This is a limitation the entry mode has to live with
            // and this mode is defined to avoid.
            assertTrue(resolve(0.5, "p0" -> (1000L, 9000L), "p1" -> (1000L, 1100L)) == Timestamp(5000L))
        },
        test("the answer does not depend on how many partitions the topic has") {
            // The same overall range, split three ways and then six ways: identical cutoff. A
            // formula that averaged per-partition positions would move here.
            val threeWays = Seq("p0" -> (0L, 300L), "p1" -> (100L, 600L), "p2" -> (200L, 900L))
            val sixWays = Seq(
                "p0" -> (0L, 100L),
                "p1" -> (100L, 200L),
                "p2" -> (200L, 400L),
                "p3" -> (300L, 600L),
                "p4" -> (400L, 700L),
                "p5" -> (500L, 900L)
            )
            assertTrue(resolve(0.4, threeWays*) == resolve(0.4, sixWays*), resolve(0.4, threeWays*) == Timestamp(360L))
        },
        test("the cutoff is rounded DOWN, so it never lands past the proportion asked for") {
            // 1/3 of 10ms is 3.33ms. Rounding down keeps the mapping monotonic and keeps the
            // delivered set from starting later than the instant the user pointed at.
            assertTrue(
                resolve(1.0 / 3.0, "p0" -> (0L, 10L)) == Timestamp(3L),
                resolve(2.0 / 3.0, "p0" -> (0L, 10L)) == Timestamp(6L)
            )
        },
        test("a larger fraction never resolves to an earlier instant") {
            val cutoffs = (0 to 1000).map(_ / 1000.0).map { fraction =>
                resolve(fraction, "p0" -> (1_700_000_000_000L, 1_700_002_592_000L)) match
                    case Earliest           => Long.MinValue
                    case Timestamp(atMs) => atMs
            }
            assertTrue(cutoffs == cutoffs.sorted) ?? "the resolved instant must be monotonic in the fraction"
        },
        test("a 30-day range resolves without losing milliseconds to double arithmetic") {
            // Epoch millis are ~1.7e12 and a month is ~2.6e9 - both far inside a double's exact
            // integer range, but the multiplication has to be done on the SPAN rather than on the
            // absolute instants for that to hold.
            val start = 1_700_000_000_000L
            val thirtyDays = 30L * 24 * 60 * 60 * 1000
            assertTrue(
                resolve(0.5, "p0" -> (start, start + thirtyDays)) == Timestamp(start + thirtyDays / 2),
                resolve(0.1, "p0" -> (start, start + thirtyDays)) == Timestamp(start + thirtyDays / 10)
            )
        },
        test("message density does not change the publish-time interpolation") {
            // The motivating topic: a month of retention in which almost everything arrived in the
            // final hour. 50% of the TIME RANGE is 15 days back, whatever the message density is -
            // that is the whole reason this mode exists next to the entry-position mode.
            val start = 1_700_000_000_000L
            val thirtyDays = 30L * 24 * 60 * 60 * 1000
            val fifteenDays = thirtyDays / 2
            assertTrue(resolve(0.5, "p0" -> (start, start + thirtyDays)) == Timestamp(start + fifteenDays))
        }
    )

    private val degenerateSuite = suite("topics with no time range to speak of")(
        test("a topic no partition can answer for starts from the beginning") {
            // Empty: `examineMessage` FAILS on a topic with no entries rather than answering, so
            // there is no range at all. Seeking to earliest is what "Earliest message" does on an
            // empty topic - the session shows whatever is published from now on.
            val (partitions, _) = topic("p0" -> (0L, 0L))
            val nothing = resolveApproximatePublishTimePosition(0.5, partitions, _ => None)
            assertTrue(nothing == Earliest)
        },
        test("an empty topic resolves to the beginning at EVERY fraction, including 1.0") {
            // There is no last-entry boundary to inspect, and on a topic holding nothing "the
            // beginning" and "the end" are the same position: whatever arrives next.
            val fractions = Vector(0.0, 0.25, 0.5, 0.75, 1.0)
            val seeks = fractions.map(f => resolveApproximatePublishTimePosition(f, Vector("p0"), _ => None))
            assertTrue(seeks.forall(_ == Earliest)) ?? s"an empty topic resolved to $seeks"
        },
        test("partitions that hold nothing are skipped, not counted as time zero") {
            // A partitioned topic where only some partitions were written to: an unanswerable
            // partition contributing 0 to the minimum would drag `earliest` back to 1970 and make
            // every interior fraction land before the retained messages.
            val (partitions, lookup) = topic("p0" -> (4000L, 8000L))
            val withEmpties = resolveApproximatePublishTimePosition(0.5, partitions ++ Vector("p1", "p2"), lookup)
            assertTrue(withEmpties == Timestamp(6000L))
        },
        test("a topic that occupies ONE instant starts from the beginning for any interior fraction") {
            // first == last: the range has no interior to interpolate into. Every message shares
            // that instant, so there is no position that separates them and the honest answer is
            // "all of it" - which is what a seek to earliest delivers. No division is involved, so
            // this is a definition rather than a guard against a divide-by-zero.
            assertTrue(
                resolve(0.5, "p0" -> (1500L, 1500L)) == Earliest,
                resolve(0.01, "p0" -> (1500L, 1500L)) == Earliest,
                resolve(0.99, "p0" -> (1500L, 1500L)) == Earliest
            )
        },
        test("a topic that occupies one instant still answers 1.0 with that instant") {
            // The observed last-entry time is 1500 and a seek to 1500 delivers it, so the high endpoint
            // stays exact even with no range. Everything else published in that same millisecond
            // comes too: a timestamp seek is millisecond-granular and cannot separate them.
            assertTrue(resolve(1.0, "p0" -> (1500L, 1500L)) == Timestamp(1500L))
        },
        test("a single message is a topic of one instant, and behaves like one") {
            assertTrue(
                resolve(0.0, "p0" -> (1500L, 1500L)) == Earliest,
                resolve(0.5, "p0" -> (1500L, 1500L)) == Earliest,
                resolve(1.0, "p0" -> (1500L, 1500L)) == Timestamp(1500L)
            )
        },
        test("a range reported backwards by a producer's clock falls back to the beginning") {
            // publishTime is stamped by the PRODUCER, so a clock that jumped backwards mid-topic can
            // report a first later than the last. There is no interior to interpolate, and a cutoff
            // taken from either end could hide messages, so the beginning is the only safe answer.
            assertTrue(resolve(0.5, "p0" -> (9000L, 1000L)) == Earliest)
        }
    )

    private val rejectionSuite = suite("rejected fractions")(
        test("NaN is rejected - every comparison against it is false, so a range check alone lets it through") {
            val message = rejected(Double.NaN)
            assertTrue(message.exists(_.contains("NaN"))) ?? s"NaN must be rejected with a clear message, got: $message"
        },
        test("a fraction below 0 or above 1 is rejected and the message names the value") {
            val below = rejected(-0.5)
            val above = rejected(1.5)
            assertTrue(
                below.exists(m => m.contains("Approximate position (% of time)") && m.contains("-0.5") && m.contains("0.0") && m.contains("1.0")),
                above.exists(m => m.contains("Approximate position (% of time)") && m.contains("1.5") && m.contains("0.0") && m.contains("1.0"))
            ) ?? s"out-of-range fractions must be rejected clearly, got: $below / $above"
        },
        test("the message says which of the two modes refused it") {
            // Two modes now carry a fraction, and a session can only be fixed if the error names the
            // one that rejected it.
            val message = rejected(1.5)
            assertTrue(message.exists(m => m.contains("time") && !m.contains("data"))) ??
                s"the rejection must name the publish-time mode, got: $message"
        },
        test("infinities are rejected") {
            assertTrue(rejected(Double.PositiveInfinity).isDefined, rejected(Double.NegativeInfinity).isDefined)
        },
        test("a fraction just inside the range is accepted") {
            assertTrue(rejected(0.0).isEmpty, rejected(1.0).isEmpty, rejected(0.9999999999).isEmpty)
        }
    )

    private val groupingSuite = suite("logical-topic grouping and bounded span lookup")(
        test("partitions group under one logical topic while separate topics stay separate") {
            val orders = "persistent://public/default/orders"
            val audit = "persistent://public/default/audit"
            val grouped = groupPhysicalTopicsByLogicalTopic(
                Vector(s"$orders-partition-0", audit, s"$orders-partition-1", s"$orders-partition-0", audit)
            )
            assertTrue(
                grouped == Vector(
                    orders -> Vector(s"$orders-partition-0", s"$orders-partition-1"),
                    audit -> Vector(audit)
                )
            )
        },
        test("0% groups topics but performs zero publish-time span lookups") {
            val calls = AtomicInteger(0)
            val orders = "persistent://public/default/orders"
            val seeks = resolveApproximatePublishTimeSeeks(
                fraction = 0.0,
                topicFqns = Vector(s"$orders-partition-0", s"$orders-partition-1"),
                timeSpanOf = _ =>
                    calls.incrementAndGet()
                    throw AssertionError("0% looked up a publish-time span")
            )
            assertTrue(calls.get == 0, seeks == Map(orders -> Earliest))
        },
        test("P2.15: SEPARATE topics share ONE cutoff - the session's history window is comparable") {
            // The whole point of a "% of time" position on a multi-topic session: the user asked to
            // start half way through the history they are looking at, and there is only one such
            // history. Interpolating per LOGICAL topic answered a different wall-clock instant for
            // each one, so a 50% session over a one-hour topic and a thirty-day topic began at two
            // moments a fortnight apart and the merged view was a slice of nothing in particular.
            val orders = "persistent://public/default/orders"
            val audit = "persistent://public/default/audit"
            val spans = Map(
                s"$orders-partition-0" -> TopicPublishTimeSpan(1_000L, 2_000L),
                s"$orders-partition-1" -> TopicPublishTimeSpan(1_500L, 3_000L),
                audit -> TopicPublishTimeSpan(10_000L, 20_000L)
            )
            val seeks = resolveApproximatePublishTimeSeeks(
                fraction = 0.5,
                topicFqns = Vector(s"$orders-partition-0", s"$orders-partition-1", audit),
                timeSpanOf = spans.get
            )

            // Pooled across every selected physical topic: 1_000 .. 20_000, so 50% is 10_500.
            assertTrue(
                seeks == Map(orders -> Timestamp(10_500L), audit -> Timestamp(10_500L))
            ) ?? s"seeks=$seeks"
        },
        test("P2.15: 100% is the LATEST boundary seen anywhere in the session, not per topic") {
            val orders = "persistent://public/default/orders"
            val audit = "persistent://public/default/audit"
            val spans = Map(
                orders -> TopicPublishTimeSpan(1_000L, 2_000L),
                audit -> TopicPublishTimeSpan(10_000L, 20_000L)
            )
            val seeks = resolveApproximatePublishTimeSeeks(
                fraction = 1.0,
                topicFqns = Vector(orders, audit),
                timeSpanOf = spans.get
            )
            assertTrue(seeks == Map(orders -> Timestamp(20_000L), audit -> Timestamp(20_000L))) ?? s"seeks=$seeks"
        },
        test("P2.15: a topic the broker could not describe does not narrow the session's range") {
            // `publishTimeSpan` answers None only for a topic that holds nothing. Such a topic
            // contributes no boundary and gets the session's cutoff like everything else.
            val orders = "persistent://public/default/orders"
            val empty = "persistent://public/default/empty"
            val spans = Map(orders -> TopicPublishTimeSpan(1_000L, 3_000L))
            val seeks = resolveApproximatePublishTimeSeeks(
                fraction = 0.5,
                topicFqns = Vector(orders, empty),
                timeSpanOf = spans.get
            )
            assertTrue(seeks == Map(orders -> Timestamp(2_000L), empty -> Timestamp(2_000L))) ?? s"seeks=$seeks"
        },
        test("duplicate target consumers read each physical publish-time span once") {
            val calls = AtomicInteger(0)
            val orders = "persistent://public/default/orders"
            val p0 = s"$orders-partition-0"
            val p1 = s"$orders-partition-1"
            val seeks = resolveApproximatePublishTimeSeeks(
                fraction = 0.5,
                topicFqns = Vector(p0, p0, p1, p0, p1),
                timeSpanOf = topic =>
                    calls.incrementAndGet()
                    Option.when(topic == p0)(TopicPublishTimeSpan(1_000L, 2_000L))
                        .orElse(Some(TopicPublishTimeSpan(1_500L, 3_000L))),
                parallelism = 2
            )
            assertTrue(calls.get == 2, seeks == Map(orders -> Timestamp(2_000L)))
        }
    )

    def spec = suite(this.getClass.toString)(endpointsSuite, interpolationSuite, degenerateSuite, rejectionSuite, groupingSuite)
