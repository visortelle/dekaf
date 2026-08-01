package harness

import harness.Eventually.eventually

import java.nio.charset.StandardCharsets.UTF_8
import scala.jdk.CollectionConverters.*

/** Broker-level spec for the batching fixtures - no UI, PulsarAdmin is both the arrange and the
  * assert side.
  *
  * Two things are pinned here, and everything the batched start-from coverage claims rests on them:
  *
  *  1. `fixtures.produceBatched` really does put several messages into ONE broker entry, and
  *     `fixtures.produceUnbatched` really does put exactly one message in each. Without this the
  *     "batched" half of the matrix would be indistinguishable from the unbatched half and would
  *     silently prove nothing - the very blind spot that coverage exists to close.
  *
  *  2. `PulsarAdmin.examineMessage` addresses ENTRIES, not messages, and past the end of the log it
  *     answers with the wrong entry ("earliest") or throws ("latest") rather than saying so. That is
  *     the mechanism by which "skip the first 5 messages" silently skipped fifty while the two
  *     counting Start-From modes were built on it. They no longer are - the seek was rewritten on
  *     2026-07-25 to count delivered MESSAGES - so this is now a pin on the primitive rather than on
  *     the app: it records why entry-addressing cannot implement a message-count contract, so
  *     nobody rebuilds those modes on it.
  */
class BatchingFixtureSpec extends DekafSuite:

  private def valueOf(m: org.apache.pulsar.client.api.Message[Array[Byte]]): String =
    new String(m.getData, UTF_8)

  /** `numberOfEntries` is read back through the admin API; give it a beat to catch up with writes
    * we already hold producer acks for. */
  private def awaitEntries(fqn: String, atLeast: Long): Long =
    eventually(timeoutMs = 10000, intervalMs = 200) {
      val n = fixtures.numberOfEntries(fqn)
      assert(n >= atLeast, s"only $n entrie(s) visible on $fqn yet (want >= $atLeast)")
      n
    }

  test("BATCH-1: produceBatched packs many messages into few entries; produceUnbatched does not") {
    val (t, ns, _) = fixtures.freshTopicParts()

    // --- batched: 100 messages, 50 per batch -> 2 entries -------------------------------------
    val batchedFqn = fixtures.createTopic(t, ns)
    val values = (1 to 100).map(i => f"m-$i%03d")
    fixtures.produceBatched(batchedFqn, values, messagesPerBatch = 50)

    val batchedEntries = awaitEntries(batchedFqn, 1)
    assert(batchedEntries == 2, s"100 messages at 50/batch should be 2 broker entries, got $batchedEntries")
    // The messages themselves must all be there - "few entries" must not mean "lost messages".
    val read = fixtures.readAllMessages(batchedFqn).map(_.getValue)
    assert(read == values.toVector, s"batched produce lost or reordered messages: got ${read.size} - $read")

    // --- unbatched: one entry per message ------------------------------------------------------
    val unbatchedFqn = fixtures.createTopic(t, ns)
    fixtures.produceUnbatched(unbatchedFqn, values)
    val unbatchedEntries = awaitEntries(unbatchedFqn, 100)
    assert(unbatchedEntries == 100, s"unbatched produce should be 1 entry per message, got $unbatchedEntries for 100")

    // --- and the shape every pre-existing fixture produced --------------------------------------
    // `produceStrings` leaves the client default (batching ON) but sends with a BLOCKING send, which
    // closes a one-message batch every time. That is why the suite could never see an entry-vs-
    // message confusion before: every fixture in it produced entry-per-message data.
    val legacyFqn = fixtures.createTopic(t, ns)
    fixtures.produceStrings(legacyFqn, 100)
    val legacyEntries = awaitEntries(legacyFqn, 100)
    assert(legacyEntries == 100, s"blocking send should still be 1 entry per message, got $legacyEntries")
  }

  test("BATCH-2: examineMessage is ENTRY-addressed; past the end it clamps (earliest) or fails (latest)") {
    val (t, ns, _) = fixtures.freshTopicParts()
    val fqn = fixtures.createTopic(t, ns)
    val values = (1 to 100).map(i => f"m-$i%03d")
    fixtures.produceBatched(fqn, values, messagesPerBatch = 50) // -> entry 1 = m-001.., entry 2 = m-051..
    assert(awaitEntries(fqn, 2) == 2)

    def examine(position: String, n: Long): String =
      valueOf(admin.topics().examineMessage(fqn, position, n))

    // Position 1 and 2 are the two ENTRIES - each answers with the FIRST message of that entry, not
    // with the 1st and 2nd messages of the topic.
    assert(examine("earliest", 1) == "m-001", s"entry 1 answered ${examine("earliest", 1)}")
    assert(examine("earliest", 2) == "m-051", s"entry 2 answered ${examine("earliest", 2)} - if this is m-002, examineMessage is message-addressed")

    // Everything past the last entry answers with the last entry instead of failing. This is the
    // whole defect mechanism for "skip first n": the mode asks for position n+1, gets entry 2, and
    // silently skips 50 messages.
    for n <- Seq(3L, 50L, 100L) do
      assert(
        examine("earliest", n) == "m-051",
        s"examineMessage(earliest, $n) answered ${examine("earliest", n)}; expected the last entry's first message (m-051). " +
          "Message-addressing would have answered m-003/m-050/m-100."
      )

    // Counting back from the end is entry-addressed too...
    assert(examine("latest", 1) == "m-051", s"latest,1 answered ${examine("latest", 1)}")
    assert(examine("latest", 2) == "m-001", s"latest,2 answered ${examine("latest", 2)}")

    // ...but past the end it does NOT clamp - it fails outright (ManagedLedgerException surfaced as
    // an admin 500). Note the asymmetry with "earliest" above: a caller that only tested one
    // direction would conclude examineMessage either always clamps or always fails, and both
    // conclusions are wrong.
    //
    // This asymmetry is load-bearing in BOTH directions of the rewrite. It is why the old "Latest n
    // messages" seek fell back to EARLIEST and showed every message there is: it caught the failure
    // and could not tell "past the start of the log" from "the broker refused". And it is what the
    // current `resolveLatestN` MERGED backward walk uses as its per-topic end-of-log signal - one
    // cursor per topic steps back entry by entry while the merge accumulates message counts to n,
    // and a cursor only leaves the merge when this failure (classified by `isEmptyLogAnswer`, so a
    // genuine broker error still aborts instead) says its log has no older entry. Nothing may be
    // built on "earliest" instead: that side clamps silently.
    for n <- Seq(3L, 50L, 100L) do
      val thrown = intercept[org.apache.pulsar.client.admin.PulsarAdminException] {
        admin.topics().examineMessage(fqn, "latest", n) // must NOT return a message
      }
      assert(
        Option(thrown.getMessage).exists(_.contains("Incorrect parameter input")),
        s"examineMessage(latest, $n) failed for an unexpected reason: ${thrown.getMessage}"
      )
  }

  test("BATCH-4: on a partitioned topic only the partitions holding data can answer examineMessage") {
    // Why a per-partition search cannot be made to answer a global "n-th message" question: a
    // partition holding no data cannot answer at all, so any algorithm that polls every partition
    // sees candidates only from the ones that happen to hold data. This also pins that a partition
    // of a partitioned topic is entry-addressed exactly like any other topic.
    val kind = fixtures.TopicKind.PersistentPartitioned
    val (t, ns, _, fqn) = fixtures.freshTopicPartsOfKind(kind)
    val values = (1 to 12).map(i => f"m-$i%02d")
    fixtures.produceBatched(s"$fqn-partition-0", values, 4) // -> 3 entries, all on partition 0

    // Materialize every partition the way a session subscribing to the parent does.
    val consumer = client.newConsumer().topic(fqn).subscriptionName("batch-4-probe").subscribe()
    try
      val partitions = admin.topics().getList(s"$t/$ns").asScala.toList.sorted
      assert(partitions.size == 3, s"expected 3 materialized partitions, got $partitions")

      val loaded = partitions.filter(_.endsWith("-partition-0"))
      val empty = partitions.filterNot(_.endsWith("-partition-0"))

      // The loaded partition answers entry-wise, and clamps past the end just like BATCH-2.
      assert(valueOf(admin.topics().examineMessage(loaded.head, "earliest", 6)) == "m-09")

      // The empty ones cannot answer at all - so a multi-partition search only ever sees candidates
      // from partitions that happen to hold data.
      empty.foreach { p =>
        val thrown = intercept[org.apache.pulsar.client.admin.PulsarAdminException] {
          admin.topics().examineMessage(p, "earliest", 6)
        }
        assert(
          Option(thrown.getMessage).exists(_.contains("total message is zero")),
          s"$p failed for an unexpected reason: ${thrown.getMessage}"
        )
      }
    finally consumer.close()
  }

  test("BATCH-3: on unbatched data examineMessage positions coincide with message numbers") {
    // The control for BATCH-2: with one message per entry, entry-addressing and message-addressing
    // are the same thing - which is exactly why unbatched fixtures could never expose the defect.
    val (t, ns, _) = fixtures.freshTopicParts()
    val fqn = fixtures.createTopic(t, ns)
    val values = (1 to 10).map(i => f"m-$i%03d")
    fixtures.produceUnbatched(fqn, values)
    assert(awaitEntries(fqn, 10) == 10)

    for n <- 1 to 10 do
      val got = valueOf(admin.topics().examineMessage(fqn, "earliest", n.toLong))
      assert(got == f"m-$n%03d", s"examineMessage(earliest, $n) answered $got")
  }
