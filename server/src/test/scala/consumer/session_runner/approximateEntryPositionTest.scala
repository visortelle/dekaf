package consumer.session_runner

import zio.test.*

import java.util.concurrent.atomic.AtomicInteger
import scala.util.Try

/** Entry-fraction rounding, endpoint, validation, deduplication and lookup-budget coverage. An
  * entry may contain a batch, so these tests deliberately make no message-percent claim. */
object approximateEntryPositionTest extends ZIOSpecDefault:

    import ApproximateEntrySeek.*

    private def rejected(fraction: Double, numberOfEntries: Long = 100): Option[String] =
        Try(resolveApproximateEntryPosition(fraction, numberOfEntries)).failed.toOption.map(_.getMessage)

    private val endpointsSuite = suite("endpoints")(
        test("0.0 is the earliest retained message, not entry 1 by ordinal") {
            // Both would deliver the same first message, but only MessageId.earliest keeps working
            // when the entry count the ordinal was computed from is already stale.
            assertTrue(resolveApproximateEntryPosition(0.0, 100) == Earliest)
        },
        test("1.0 is the latest position, exactly as the 'Latest message' mode") {
            // VERIFIED: a seek to MessageId.latest delivered nothing from a 100-message topic - the
            // session shows only what is published from now on. 1.0 must mean that, not "the last
            // entry".
            assertTrue(resolveApproximateEntryPosition(1.0, 100) == Latest)
        },
        test("the endpoints are exact whatever the log size, including a log of one entry") {
            assertTrue(
                resolveApproximateEntryPosition(0.0, 1) == Earliest,
                resolveApproximateEntryPosition(1.0, 1) == Latest,
                resolveApproximateEntryPosition(0.0, 1_000_000_000L) == Earliest,
                resolveApproximateEntryPosition(1.0, 1_000_000_000L) == Latest
            )
        },
        test("negative zero is still the earliest end") {
            assertTrue(resolveApproximateEntryPosition(-0.0, 100) == Earliest)
        }
    )

    private val roundingSuite = suite("rounding")(
        test("100 entries: the fractions resolve to the entries the live broker delivered") {
            // The oracle table. On the probe topic entry k held message m-k, and each of these
            // seeks delivered exactly that message first.
            assertTrue(
                resolveApproximateEntryPosition(0.01, 100) == Entry(2), //  m-2
                resolveApproximateEntryPosition(0.1, 100) == Entry(11), //  m-11
                resolveApproximateEntryPosition(0.25, 100) == Entry(26), // m-26
                resolveApproximateEntryPosition(0.5, 100) == Entry(51), //  m-51
                resolveApproximateEntryPosition(0.75, 100) == Entry(76), // m-76
                resolveApproximateEntryPosition(0.9, 100) == Entry(91), //  m-91
                resolveApproximateEntryPosition(0.99, 100) == Entry(100) // m-100
            )
        },
        test("the rule is: leave floor(fraction * entries) entries behind") {
            // Stated as a property rather than as the formula: what is skipped never overshoots the
            // fraction asked for, and is never a whole entry short of it.
            val entries = 997L
            val violations = (1 to 999).map(_ / 1000.0).flatMap { fraction =>
                resolveApproximateEntryPosition(fraction, entries) match
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
                resolveApproximateEntryPosition(fraction, entries) match
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
                resolveApproximateEntryPosition(0.9999999, 10) == Entry(10),
                resolveApproximateEntryPosition(0.5, 1) == Entry(1),
                resolveApproximateEntryPosition(0.0000001, 10) == Entry(1)
            )
        },
        test("a huge log resolves without overflowing") {
            assertTrue(resolveApproximateEntryPosition(0.5, 4_000_000_000L) == Entry(2_000_000_001L))
        }
    )

    private val emptyLogSuite = suite("empty log")(
        test("a topic with no retained entries starts from the beginning") {
            // VERIFIED: examineMessage on an empty topic FAILS ("Could not examine messages due to
            // the total message is zero"), so an ordinal must never be asked for here. Seeking to
            // earliest is what "EarliestMessage" does on an empty topic - the session shows what
            // gets published from now on.
            assertTrue(
                resolveApproximateEntryPosition(0.5, 0) == Earliest,
                resolveApproximateEntryPosition(0.0, 0) == Earliest
            )
        },
        test("1.0 on an empty topic still means latest") {
            assertTrue(resolveApproximateEntryPosition(1.0, 0) == Latest)
        },
        test("a negative entry count cannot produce an ordinal") {
            assertTrue(resolveApproximateEntryPosition(0.5, -1) == Earliest)
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
                below.exists(m => m.contains("Approximate position (% of data)") && m.contains("-0.5") && m.contains("0.0") && m.contains("1.0")),
                above.exists(m => m.contains("Approximate position (% of data)") && m.contains("1.5") && m.contains("0.0") && m.contains("1.0"))
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

    private val lookupSuite = suite("bounded physical-topic resolution")(
        test("0% and 100% resolve without one broker-derived lookup") {
            val calls = AtomicInteger(0)
            def forbiddenCount(topicFqn: String): Long =
                calls.incrementAndGet()
                throw AssertionError(s"endpoint asked for an entry count on $topicFqn")
            def forbiddenEntry(topicFqn: String)(entryOrdinal: Long): Option[String] =
                calls.incrementAndGet()
                throw AssertionError(s"endpoint examined entry $entryOrdinal on $topicFqn")
            def forbiddenEarliest(topicFqn: String): Option[String] =
                calls.incrementAndGet()
                throw AssertionError(s"endpoint re-read the retained start of $topicFqn")

            val topics = Vector("a", "a", "b")
            val atStart =
                resolveApproximateEntrySeeks(0.0, topics, "earliest", "latest", forbiddenCount, forbiddenEntry, forbiddenEarliest, _ < _)
            val atEnd =
                resolveApproximateEntrySeeks(1.0, topics, "earliest", "latest", forbiddenCount, forbiddenEntry, forbiddenEarliest, _ < _)
            assertTrue(
                calls.get == 0,
                atStart == Map("a" -> "earliest", "b" -> "earliest"),
                atEnd == Map("a" -> "latest", "b" -> "latest")
            )
        },
        test("duplicate target consumers share exactly one resolved entry position per FQN") {
            val countCalls = AtomicInteger(0)
            val examineCalls = AtomicInteger(0)
            val topics = Vector("a", "a", "b", "a", "b")

            val seeks = resolveApproximateEntrySeeks(
                fraction = 0.5,
                topicFqns = topics,
                earliest = "earliest",
                latest = "latest",
                retainedEntryCountOf = _ =>
                    countCalls.incrementAndGet()
                    10L,
                entryFromEarliestOf = topic => ordinal =>
                    examineCalls.incrementAndGet()
                    Some(s"$topic-$ordinal"),
                earliestRetainedEntryOf = topic => Some(s"$topic-1"),
                entryIsOlder = (a, b) => a < b,
                parallelism = 2
            )

            assertTrue(
                seeks == Map("a" -> "a-6", "b" -> "b-6"),
                // Initial count + retention re-check, once for each DISTINCT topic.
                countCalls.get == 4,
                examineCalls.get == 2
            )
        },
        test("P2.3: retention that TRIMS AND APPENDS equally still invalidates the chosen anchor") {
            // The re-check was count-only: read the count, examine the ordinal, read the count
            // again, accept while it is not below the ordinal. A topic that trimmed 5 entries off
            // the front and appended 5 to the tail in that window has exactly the same count and a
            // completely different entry at that ordinal - and the id the examine handed back has
            // been DELETED. The seek then lands wherever the broker puts a trimmed id, and the
            // session silently starts somewhere the user did not ask for.
            val entryOrdinals = AtomicInteger(0)
            val seeks = resolveApproximateEntrySeeks(
                fraction = 0.5,
                topicFqns = Vector("trimming"),
                earliest = "earliest",
                latest = "latest",
                // Unchanged across the whole resolution: 5 trimmed, 5 appended.
                retainedEntryCountOf = _ => 10L,
                entryFromEarliestOf = _ =>
                    ordinal =>
                        entryOrdinals.incrementAndGet()
                        Some(s"entry-$ordinal"),
                // The front of the log is now PAST the anchor the examine returned.
                earliestRetainedEntryOf = _ => Some("entry-9"),
                entryIsOlder = (a, b) => a < b
            )

            assertTrue(
                entryOrdinals.get == 1, // vacuity guard: the anchor really was examined
                seeks == Map("trimming" -> "earliest") // ...and refused, not handed back as the position
            ) ?? s"seeks=$seeks examines=${entryOrdinals.get}"
        },
        test("P2.3: an anchor that is still retained is accepted, re-check and all") {
            val seeks = resolveApproximateEntrySeeks(
                fraction = 0.5,
                topicFqns = Vector("stable"),
                earliest = "earliest",
                latest = "latest",
                retainedEntryCountOf = _ => 10L,
                entryFromEarliestOf = _ => ordinal => Some(s"entry-$ordinal"),
                earliestRetainedEntryOf = _ => Some("entry-1"),
                entryIsOlder = (a, b) => a < b
            )
            assertTrue(seeks == Map("stable" -> "entry-6")) ?? s"seeks=$seeks"
        },
        test("P2.3: a topic that now retains NOTHING has lost its anchor by definition") {
            val seeks = resolveApproximateEntrySeeks(
                fraction = 0.5,
                topicFqns = Vector("emptied"),
                earliest = "earliest",
                latest = "latest",
                retainedEntryCountOf = _ => 10L,
                entryFromEarliestOf = _ => ordinal => Some(s"entry-$ordinal"),
                earliestRetainedEntryOf = _ => None,
                entryIsOlder = (a, b) => a < b
            )
            assertTrue(seeks == Map("emptied" -> "earliest")) ?? s"seeks=$seeks"
        },
        test("2,000 distinct topics stay inside the fixed lookup concurrency") {
            val topics = (1 to 2_000).map(i => s"topic-$i").toVector
            val inFlight = AtomicInteger(0)
            val peakInFlight = AtomicInteger(0)

            val answers = boundedParallelTopicLookup(
                topics,
                operation = "the wide test position",
                lookup = topic =>
                    val current = inFlight.incrementAndGet()
                    peakInFlight.updateAndGet(previous => math.max(previous, current))
                    try
                        Thread.sleep(1)
                        topic
                    finally inFlight.decrementAndGet()
            )

            assertTrue(
                answers.size == 2_000,
                answers.keySet == topics.toSet,
                answers.forall((topic, answer) => topic == answer),
                peakInFlight.get > 1,
                peakInFlight.get <= approximatePositionLookupParallelism,
                inFlight.get == 0
            ) ?? s"answers=${answers.size} peak=${peakInFlight.get} inFlight=${inFlight.get}"
        },
        test("the wall-clock budget refuses and cancels a lookup set that cannot finish") {
            val calls = AtomicInteger(0)
            val topics = (1 to 100).map(i => s"topic-$i").toVector
            val result = Try(
                boundedParallelTopicLookup(
                    topics,
                    operation = "'Approximate position (% of data)'",
                    lookup = _ =>
                        calls.incrementAndGet()
                        Thread.sleep(10_000)
                        "unreachable",
                    budgetMs = 50,
                    parallelism = 1
                )
            )

            assertTrue(
                result.isFailure,
                result.failed.toOption.exists(_.isInstanceOf[StartFromUnresolvableException]),
                result.failed.toOption.exists(_.getMessage.contains("Approximate position (% of data)")),
                result.failed.toOption.exists(_.getMessage.contains("50ms")),
                result.failed.toOption.exists(_.getMessage.contains("100 physical topic")),
                result.failed.toOption.exists(_.getMessage.contains("Earliest message")),
                result.failed.toOption.exists(_.getMessage.contains("Latest message")),
                result.failed.toOption.exists(_.getMessage.contains("Specific time")),
                calls.get < topics.size
            ) ?? s"result=$result calls=${calls.get}"
        },
        test("CONCURRENT RESOLUTIONS SHARE ONE GLOBAL WORKER BUDGET - the per-call bound is not a server bound") {
            // A fresh 16-thread pool was created for EVERY resolution, so the only bound was a
            // local one: six concurrent creates meant six pools, ~96 worker threads and ~96 admin
            // requests in flight, with nothing server-wide saying no. Combined with an admission
            // check that did not cover in-flight builds, a handful of tabs could do that at will.
            //
            // Pinned by a latch rather than by timing: every lookup holds its place until
            // `globalBound + 1` of them are simultaneously inside, so a peak past the bound is a
            // fact the test WAITS for instead of hoping to sample. Nothing is over the bound, the
            // latch never trips, the first wave times out once and opens the gate for the rest.
            val calls = 6
            val topicsPerCall = 200
            val inFlight = AtomicInteger(0)
            val peakInFlight = AtomicInteger(0)
            val workerThreads = java.util.concurrent.ConcurrentHashMap.newKeySet[String]()
            val pastTheBound = java.util.concurrent.CountDownLatch(approximatePositionLookupGlobalParallelism + 1)
            val gateOpen = java.util.concurrent.atomic.AtomicBoolean(false)

            val lookup = (topic: String) =>
                val current = inFlight.incrementAndGet()
                peakInFlight.updateAndGet(previous => math.max(previous, current))
                workerThreads.add(Thread.currentThread.getName)
                pastTheBound.countDown()
                if !gateOpen.get && !pastTheBound.await(2, java.util.concurrent.TimeUnit.SECONDS) then gateOpen.set(true)
                inFlight.decrementAndGet()
                topic

            val threads = (1 to calls).map(call =>
                val thread = new Thread(
                    (() =>
                        boundedParallelTopicLookup(
                            (1 to topicsPerCall).map(i => s"call-$call-topic-$i").toVector,
                            operation = s"the shared-budget test position $call",
                            lookup = lookup,
                            budgetMs = 120_000
                        )
                    ): Runnable,
                    s"cs-shared-budget-$call"
                )
                thread.setDaemon(true)
                thread
            )
            threads.foreach(_.start())
            threads.foreach(_.join(180_000))

            assertTrue(
                threads.forall(!_.isAlive),
                peakInFlight.get > 1, // still genuinely parallel - a serial fallback is not the fix
                peakInFlight.get <= approximatePositionLookupGlobalParallelism,
                workerThreads.size <= approximatePositionLookupGlobalParallelism,
                inFlight.get == 0,
                // The shared budget's own gauge - what a saturation metric reads - never past its bound.
                approximateLookupWorkersInFlight <= approximatePositionLookupGlobalParallelism
            ) ?? (s"peak=${peakInFlight.get} globalBound=$approximatePositionLookupGlobalParallelism " +
                s"distinctWorkerThreads=${workerThreads.size} inFlight=${inFlight.get} " +
                s"sharedGauge=$approximateLookupWorkersInFlight")
        },
        test("a non-positive budget refuses before dispatching any lookup") {
            val calls = AtomicInteger(0)
            val result = Try(
                boundedParallelTopicLookup(
                    Vector("a", "b"),
                    operation = "'Approximate position (% of data)'",
                    lookup = topic =>
                        calls.incrementAndGet()
                        topic,
                    budgetMs = 0
                )
            )
            assertTrue(result.isFailure, calls.get == 0)
        }
    )

    // SEQUENTIAL: the lookup suite measures the SHARED server-wide worker budget, and a sibling
    // test resolving positions at the same time would occupy part of the very budget under test.
    def spec =
        suite(this.getClass.toString)(endpointsSuite, roundingSuite, emptyLogSuite, rejectionSuite, lookupSuite) @@ TestAspect.sequential
