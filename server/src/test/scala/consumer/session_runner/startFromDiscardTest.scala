package consumer.session_runner

import zio.test.*

/** The exactness of "Skip first n messages" and "Latest n messages".
  *
  * Regression context: both modes were built on `PulsarAdmin.examineMessage`, which is
  * ENTRY-addressed, not message-addressed - and the Java producer batches by default. VERIFIED
  * against Pulsar 3.2.1: 100 messages sent with a default producer became ONE broker entry, and
  * `examineMessage(topic, "earliest", k)` answered with that same entry for every k from 1 to 101,
  * silently clamping instead of failing. "Skip the first 5" therefore asked for entry 6, got the
  * last entry, and skipped fifty messages - on the most ordinary setup there is, one non-partitioned
  * topic with a default producer. Counting back from "latest" past the start does NOT clamp on 3.2:
  * it fails, and the failure was swallowed into a fallback that seeked to EARLIEST, so "the latest
  * 5" showed every message in the topic.
  *
  * The fix is seek + discard: a seek can only land on an ENTRY boundary (batch-index positions such
  * as `1696:1:25` are rejected by the broker), so the only exact way to land on a MESSAGE is to seek
  * to the entry holding it and drop the messages in front of it.
  *
  * [[resolveLatestN]] is pure - the broker sits behind a `Long => Option[(id, batchSize)]` lookup -
  * so every log shape is driven here with a plain lambda: no broker, and no mock.
  */
object startFromDiscardTest extends ZIOSpecDefault:

    private val oneTopic = "persistent://public/default/one"

    /** A log described from its END: element 0 is the LAST entry, and each element is the number of
      * messages that entry holds. All entries share one publish time, so nothing here depends on the
      * cross-topic ordering - that is `globalStartFromTest`'s job. Returns the lookup
      * [[resolveLatestN]] expects plus a counter of how many lookups it made (the walk must be
      * O(n / batch size), not O(log size)).
      */
    private def logFromLatest(entriesFromLatest: Int*): (String => Long => Option[LogEntry[String]], () => Int) =
        var lookups = 0
        val lookup = (_: String) =>
            (k: Long) =>
                lookups += 1
                Option.when(k >= 1 && k <= entriesFromLatest.size)(LogEntry(s"entry-$k", 1_000L, entriesFromLatest(k.toInt - 1)))
        (lookup, () => lookups)

    /** A broker that CLAMPS instead of failing once the walk runs past the start of the log - the
      * behaviour `examineMessage` shows on the "earliest" side, guarded against here so a Pulsar
      * version that clamps on "latest" too cannot turn the walk into an infinite loop.
      */
    private def clampingLogFromLatest(entriesFromLatest: Int*): (String => Long => Option[LogEntry[String]], () => Int) =
        var lookups = 0
        val lookup = (_: String) =>
            (k: Long) =>
                lookups += 1
                val clamped = k.min(entriesFromLatest.size).max(1)
                Option.when(entriesFromLatest.nonEmpty)(LogEntry(s"entry-$clamped", 1_000L, entriesFromLatest(clamped.toInt - 1)))
        (lookup, () => lookups)

    /** The `entry-$k` labels carry the walk's entry order: `k` counts back from the end, so a larger
      * ordinal is strictly OLDER (the production comparator is `MessageIdImpl.compareTo`). */
    private def olderByEntryOrdinal(a: String, b: String): Boolean = a.split("-").last.toInt > b.split("-").last.toInt

    private def resolveOne(n: Long, lookup: String => Long => Option[LogEntry[String]]): LatestNSeek[String] =
        resolveLatestN(n, Vector(oneTopic), lookup, olderByEntryOrdinal)(oneTopic)

    private val resolveLatestNSuite = suite("resolveLatestN over a single log")(
        test("one batched entry: the last 5 of 100 seek to that entry and discard the 95 in front") {
            // THE regression. Entry-addressing answered "entry 1" and discarded nothing, so all 100
            // messages were shown for a request of 5.
            val (lookup, _) = logFromLatest(100)
            assertTrue(resolveOne(5, lookup) == LatestNSeek.FromEntry("entry-1", 95L))
        },
        test("unbatched log: the last 5 land on the 5th entry from the end with nothing to discard") {
            // The control: with one message per entry, entry-addressing and message-addressing
            // coincide - which is exactly why unbatched fixtures never exposed the defect.
            val (lookup, lookups) = logFromLatest(1, 1, 1, 1, 1, 1, 1, 1, 1, 1)
            assertTrue(resolveOne(5, lookup) == LatestNSeek.FromEntry("entry-5", 0L), lookups() == 5)
        },
        test("uneven batches: the walk stops on the entry that covers the n-th message") {
            // From the end: 2, then 3 -> exactly 5 accounted for on the second entry.
            val (lookup, lookups) = logFromLatest(2, 3, 10, 10)
            assertTrue(resolveOne(5, lookup) == LatestNSeek.FromEntry("entry-2", 0L), lookups() == 2)
        },
        test("uneven batches: the overshoot inside the stopping entry is discarded") {
            // From the end: 2, then 3 -> 5 accounted for, but only 4 were asked for, so drop 1.
            val (lookup, _) = logFromLatest(2, 3, 10)
            assertTrue(resolveOne(4, lookup) == LatestNSeek.FromEntry("entry-2", 1L))
        },
        test("the last 1 of a 10-message batch discards the other 9") {
            val (lookup, _) = logFromLatest(10, 10)
            assertTrue(resolveOne(1, lookup) == LatestNSeek.FromEntry("entry-1", 9L))
        },
        test("a log shorter than n shows all of it") {
            val (lookup, _) = logFromLatest(10, 10, 10)
            assertTrue(resolveOne(100, lookup) == LatestNSeek.Everything)
        },
        test("an empty log maps to EVERYTHING - all it will ever hold is post-inspection live traffic") {
            // Empty when inspected means whatever exists at seek time arrived AFTER the inspection;
            // seeking EARLIEST delivers exactly that. Seeking "latest" at seek time raced those
            // same appends and silently lost them.
            val (lookup, _) = logFromLatest()
            assertTrue(resolveOne(5, lookup) == LatestNSeek.Everything)
        },
        test("a clamping broker is detected within a bounded number of steps, not by the first repeat") {
            // Without a termination guard this walk never ends: the lookup keeps answering with the
            // last entry and the running total keeps growing by 3 forever, so it would eventually
            // "reach" n and seek to the WRONG entry with a nonsense discard.
            //
            // CHANGED EXPECTATION, deliberately: the old guard stopped on the FIRST repeated id, in
            // exactly 3 lookups - but a single concurrent append produces that same first repeat (the
            // moving anchor), so treating it as exhaustion was the whole-backlog bug. A clamp is now
            // told apart by ONE VERIFICATION LOOKUP at the k that produced the last accepted entry -
            // a clamped end never moves, a grown end answers newer - so it is still `Everything`,
            // one lookup later than the old first-repeat guard.
            val (lookup, lookups) = clampingLogFromLatest(3, 3)
            assertTrue(
                resolveOne(100, lookup) == LatestNSeek.Everything,
                lookups() > 3,
                lookups() <= maxLatestNReanchorSteps + 4
            ) ?? s"resolved to Everything after ${lookups()} lookups (bound $maxLatestNReanchorSteps)"
        },
        test("a clamping broker still resolves exactly when the log does hold n messages") {
            val (lookup, _) = clampingLogFromLatest(3, 4, 50)
            assertTrue(resolveOne(5, lookup) == LatestNSeek.FromEntry("entry-2", 2L))
        },
        test("the walk costs O(n / batch size) lookups, not one per message") {
            // 50 messages over batches of 10 is 5 admin calls - and it does not matter that the log
            // behind them is 1000 entries long.
            val (lookup, lookups) = logFromLatest(Vector.fill(1000)(10)*)
            assertTrue(resolveOne(50, lookup) == LatestNSeek.FromEntry("entry-5", 0L), lookups() == 5)
        },
        test("n = 0 shows nothing retained, without asking the broker anything") {
            val (lookup, lookups) = logFromLatest(10, 10)
            assertTrue(resolveOne(0, lookup) == LatestNSeek.Nothing, lookups() == 0)
        }
    )

    private val topicA = "persistent://public/default/a"
    private val topicB = "persistent://public/default/b"

    private val startFromDiscardSuite = suite("StartFromDiscard")(
        test("a shared counter drops exactly n messages of the merged stream, then stops") {
            // "Skip first n" across partitions: the count is exact even though the interleaving is
            // not - which is the whole point of counting the merged stream instead of each log.
            val discard = StartFromDiscard.shared(4)
            val topics = Vector(topicA, topicB, topicA, topicB, topicA, topicB, topicA)
            val dropped = topics.map(discard.claim)
            assertTrue(dropped == Vector(true, true, true, true, false, false, false), discard.remaining == 0)
        },
        test("a shared counter reports what is left and never goes below zero") {
            val discard = StartFromDiscard.shared(2)
            val afterNone = discard.remaining
            discard.claim(topicA)
            val afterOne = discard.remaining
            discard.claim(topicA)
            discard.claim(topicA)
            discard.claim(topicA)
            assertTrue(afterNone == 2L, afterOne == 1L, discard.remaining == 0L)
        },
        test("per-topic counters are independent - one topic's overshoot does not eat another's") {
            // "Latest n" on a partitioned topic: each partition seeks to its own entry and owes its
            // own overshoot.
            val discard = StartFromDiscard.perTopic(Map(topicA -> 2, topicB -> 1))
            val a = Vector(discard.claim(topicA), discard.claim(topicA), discard.claim(topicA))
            val b = Vector(discard.claim(topicB), discard.claim(topicB))
            assertTrue(a == Vector(true, true, false), b == Vector(true, false), discard.remaining == 0)
        },
        test("a topic with no counter is never dropped") {
            val discard = StartFromDiscard.perTopic(Map(topicA -> 5))
            assertTrue(!discard.claim(topicB), discard.remaining == 5L)
        },
        test("the empty discard drops nothing") {
            assertTrue(!StartFromDiscard.none.claim(topicA), StartFromDiscard.none.remaining == 0L)
        },
        test("concurrent claims on a shared counter drop exactly n in total") {
            // One listener per consumer, each on its own Pulsar client io thread, all claiming from
            // the same counter. A read-then-write counter would over-drop here.
            val discard = StartFromDiscard.shared(100)
            val claims = 8
            val perThread = 100
            val dropped = java.util.concurrent.atomic.AtomicLong(0)
            val threads = (1 to claims).map(i =>
                Thread(() => (1 to perThread).foreach(_ => if discard.claim(s"topic-$i") then dropped.incrementAndGet()))
            )
            threads.foreach(_.start())
            threads.foreach(_.join())
            assertTrue(dropped.get == 100L, discard.remaining == 0L)
        },
        test("forTarget hands every target the SAME shared counter") {
            val plan = StartFromDiscardPlan.SharedTotal(3)
            val shared = StartFromDiscard.shared(3)
            val first = StartFromDiscard.forTarget(plan, shared, Vector(topicA))
            val second = StartFromDiscard.forTarget(plan, shared, Vector(topicB))
            first.claim(topicA)
            first.claim(topicA)
            assertTrue(first eq second, second.remaining == 1L)
        },
        test("forTarget gives each target its OWN per-topic counters, scoped to its topics") {
            // Two targets may select the same topic; each has its own consumer, and each has to
            // drop its own overshoot.
            val plan = StartFromDiscardPlan.PerTopic(Map(topicA -> 2L, topicB -> 7L))
            val first = StartFromDiscard.forTarget(plan, StartFromDiscard.none, Vector(topicA))
            val second = StartFromDiscard.forTarget(plan, StartFromDiscard.none, Vector(topicA))
            first.claim(topicA)
            first.claim(topicA)
            assertTrue(
                !(first eq second),
                first.remaining == 0L,
                second.remaining == 2L, // untouched by the other target
                second.claim(topicB) == false // topicB belongs to neither target
            )
        }
    )

    def spec = suite(this.getClass.toString)(resolveLatestNSuite, startFromDiscardSuite)
