package consumer.session_runner

import zio.test.*

import scala.util.Try

/** "Start approximately this far through the DATA a topic still holds"
  * ([[ApproximateDataPosition]]).
  *
  * The message/entry-proportional half of a two-mode split: this one answers "how many of the
  * messages are behind me", while [[ApproximateTimePosition]] answers "how much of the time range is
  * behind me". Everything below predates that split and is unchanged by it - the semantics are
  * exactly as they were, only the name moved.
  *
  * The mode exists because Pulsar can address a position by ENTRY ordinal in constant time at any
  * topic size, while a MESSAGE ordinal has no index at all and has to be counted. Resolving against
  * entries is also WHY the position is only approximate - an entry is a whole batch of messages. So
  * the position is resolved against entries, and [[resolveApproximateDataPosition]] is the whole
  * rounding contract:
  * given the fraction the user asked for and the number of entries the broker reports, which entry
  * does the consumer seek to.
  *
  * PURE by construction - `numberOfEntries` is a plain argument, so every log size, both endpoints,
  * the empty log and every rejected input are driven here without a broker.
  *
  * The expected ordinals below are not derived from the implementation: they were VERIFIED against a
  * live Pulsar 3.2.1 (100 unbatched messages, one per entry, so entry ordinal == message ordinal).
  * `examineMessage(topic, "earliest", k)` answered m-k for every k, and a consumer built the way
  * `buildConsumer` builds one - `.startMessageIdInclusive()` - seeked to that entry and delivered
  * m-k FIRST.
  */
object approximateDataPositionTest extends ZIOSpecDefault:

    import ApproximateDataSeek.*

    private def rejected(fraction: Double, numberOfEntries: Long = 100): Option[String] =
        Try(resolveApproximateDataPosition(fraction, numberOfEntries)).failed.toOption.map(_.getMessage)

    private val endpointsSuite = suite("endpoints")(
        test("0.0 is the earliest retained message, not entry 1 by ordinal") {
            // Both would deliver the same first message, but only MessageId.earliest keeps working
            // when the entry count the ordinal was computed from is already stale.
            assertTrue(resolveApproximateDataPosition(0.0, 100) == Earliest)
        },
        test("1.0 is the latest position, exactly as the 'Latest message' mode") {
            // VERIFIED: a seek to MessageId.latest delivered nothing from a 100-message topic - the
            // session shows only what is published from now on. 1.0 must mean that, not "the last
            // entry".
            assertTrue(resolveApproximateDataPosition(1.0, 100) == Latest)
        },
        test("the endpoints are exact whatever the log size, including a log of one entry") {
            assertTrue(
                resolveApproximateDataPosition(0.0, 1) == Earliest,
                resolveApproximateDataPosition(1.0, 1) == Latest,
                resolveApproximateDataPosition(0.0, 1_000_000_000L) == Earliest,
                resolveApproximateDataPosition(1.0, 1_000_000_000L) == Latest
            )
        },
        test("negative zero is still the earliest end") {
            assertTrue(resolveApproximateDataPosition(-0.0, 100) == Earliest)
        }
    )

    private val roundingSuite = suite("rounding")(
        test("100 entries: the fractions resolve to the entries the live broker delivered") {
            // The oracle table. On the probe topic entry k held message m-k, and each of these
            // seeks delivered exactly that message first.
            assertTrue(
                resolveApproximateDataPosition(0.01, 100) == Entry(2), //  m-2
                resolveApproximateDataPosition(0.1, 100) == Entry(11), //  m-11
                resolveApproximateDataPosition(0.25, 100) == Entry(26), // m-26
                resolveApproximateDataPosition(0.5, 100) == Entry(51), //  m-51
                resolveApproximateDataPosition(0.75, 100) == Entry(76), // m-76
                resolveApproximateDataPosition(0.9, 100) == Entry(91), //  m-91
                resolveApproximateDataPosition(0.99, 100) == Entry(100) // m-100
            )
        },
        test("the rule is: leave floor(fraction * entries) entries behind") {
            // Stated as a property rather than as the formula: what is skipped never overshoots the
            // fraction asked for, and is never a whole entry short of it.
            val entries = 997L
            val violations = (1 to 999).map(_ / 1000.0).flatMap { fraction =>
                resolveApproximateDataPosition(fraction, entries) match
                    case Entry(ordinal) =>
                        val skipped = (ordinal - 1).toDouble
                        val exact = fraction * entries
                        Option.when(skipped > exact || exact - skipped >= 1.0)(s"$fraction -> entry $ordinal")
                    case other => Some(s"$fraction -> $other")
            }
            assertTrue(violations.isEmpty) ?? s"fractions that did not land within one entry of their proportion: $violations"
        },
        test("a larger fraction never lands earlier in the log") {
            val entries = 250L
            val ordinals = (0 to 1000).map(_ / 1000.0).map { fraction =>
                resolveApproximateDataPosition(fraction, entries) match
                    case Earliest       => 0L
                    case Entry(ordinal) => ordinal
                    case Latest         => Long.MaxValue
            }
            assertTrue(ordinals == ordinals.sorted) ?? "the resolved position must be monotonic in the fraction"
        },
        test("the ordinal is 1-based and never runs past the end of the log") {
            // examineMessage CLAMPS past the end instead of failing, so an ordinal of entries + 1
            // would silently land on the last entry and look like it worked.
            assertTrue(
                resolveApproximateDataPosition(0.9999999, 10) == Entry(10),
                resolveApproximateDataPosition(0.5, 1) == Entry(1),
                resolveApproximateDataPosition(0.0000001, 10) == Entry(1)
            )
        },
        test("a huge log resolves without overflowing") {
            assertTrue(resolveApproximateDataPosition(0.5, 4_000_000_000L) == Entry(2_000_000_001L))
        }
    )

    private val emptyLogSuite = suite("empty log")(
        test("a topic with no retained entries starts from the beginning") {
            // VERIFIED: examineMessage on an empty topic FAILS ("Could not examine messages due to
            // the total message is zero"), so an ordinal must never be asked for here. Seeking to
            // earliest is what "EarliestMessage" does on an empty topic - the session shows what
            // gets published from now on.
            assertTrue(
                resolveApproximateDataPosition(0.5, 0) == Earliest,
                resolveApproximateDataPosition(0.0, 0) == Earliest
            )
        },
        test("1.0 on an empty topic still means latest") {
            assertTrue(resolveApproximateDataPosition(1.0, 0) == Latest)
        },
        test("a negative entry count cannot produce an ordinal") {
            assertTrue(resolveApproximateDataPosition(0.5, -1) == Earliest)
        }
    )

    private val rejectionSuite = suite("rejected fractions")(
        test("NaN is rejected - every comparison against it is false, so it would slip through a range check") {
            val message = rejected(Double.NaN)
            assertTrue(message.exists(_.contains("NaN"))) ?? s"NaN must be rejected with a clear message, got: $message"
        },
        test("a fraction below 0 or above 1 is rejected and the message names the value") {
            val below = rejected(-0.5)
            val above = rejected(1.5)
            assertTrue(
                below.exists(m => m.contains("-0.5") && m.contains("0.0") && m.contains("1.0")),
                above.exists(m => m.contains("1.5") && m.contains("0.0") && m.contains("1.0"))
            ) ?? s"out-of-range fractions must be rejected clearly, got: $below / $above"
        },
        test("infinities are rejected") {
            assertTrue(
                rejected(Double.PositiveInfinity).isDefined,
                rejected(Double.NegativeInfinity).isDefined
            )
        },
        test("a fraction just inside the range is accepted") {
            assertTrue(
                rejected(0.0).isEmpty,
                rejected(1.0).isEmpty,
                rejected(0.9999999999).isEmpty
            )
        }
    )

    def spec = suite(this.getClass.toString)(endpointsSuite, roundingSuite, emptyLogSuite, rejectionSuite)
