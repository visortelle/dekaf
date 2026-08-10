package harness

import org.apache.pulsar.client.api.SubscriptionInitialPosition

import java.util.concurrent.TimeUnit

/** Broker-level spec for the blind-spot payload-shape fixtures - the same role
  * `BatchingFixtureSpec` plays for `produceBatched`: prove on the REAL broker that each fixture's
  * premise both holds and is self-asserted, so no consumer-session test built on one can silently
  * run against data of the wrong shape. Pure broker specs - no page navigation - so they also run
  * without a Dekaf instance.
  *
  * The shapes, and the defect each keeps reachable:
  *   - CHUNKING (SHAPE-1): one message across many entries - the exact dual of batching. An
  *     entry-addressed walk that miscounts chunked messages is invisible without one on the log.
  *   - PUBLISH-TIME TIES (SHAPE-2): the batched producer's normal output. A merge tie-break, or a
  *     Guaranteed barrier comparing tied heads, is unreachable on tick-separated fixtures.
  *   - SIZED PAYLOADS (SHAPE-3): megabyte values. The merge's held-BYTES watermark can never trip
  *     under 4-byte payloads, whatever the count watermarks do.
  */
class MessageShapeFixtureSpec extends DekafSuite:

  test("SHAPE-1: produceChunked spreads ONE message across several entries, and a chunk-capable consumer reassembles it") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val value = "chunk-" + "x" * (40 * 1024)

    val chunks = fixtures.produceChunked(fqn, value, chunkBytes = 16 * 1024)
    assert(chunks == 3, s"a ${value.length}-byte value at 16 KiB/chunk should be 3 chunks, got $chunks")
    // produceChunked already asserted the entry count; restate the broker fact here so THIS spec,
    // not only the fixture's internal guard, records it.
    assert(fixtures.numberOfEntries(fqn) == chunks, s"expected $chunks entries for one chunked message")

    // A chunk-capable consumer (the session's own consumer is built with maxPendingChunkedMessage)
    // must hand the message back as ONE message, byte-identical - and nothing else.
    val consumer = client
      .newConsumer(org.apache.pulsar.client.api.Schema.STRING)
      .topic(fqn)
      .subscriptionName(fixtures.unique("shape"))
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      .maxPendingChunkedMessage(2)
      .subscribe()
    try
      val m = consumer.receive(15, TimeUnit.SECONDS)
      assert(m != null, "the chunked message was never delivered whole")
      assert(
        m.getValue == value,
        s"reassembled value differs from the produced one: ${m.getValue.length} chars vs ${value.length}"
      )
      consumer.acknowledge(m)
      val extra = consumer.receive(2, TimeUnit.SECONDS)
      assert(extra == null, s"chunks leaked as extra messages: ${Option(extra).map(_.getValue.take(50))}")
    finally
      try consumer.unsubscribe()
      catch case _: Throwable => ()
      consumer.close()
  }

  test("SHAPE-2: produceTiedBatches manufactures REAL publish-time ties - within batches and across topics") {
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"

    val (valuesA, valuesB) = fixtures.produceTiedBatches(fqnA, fqnB, messagesPerBatch = 4)

    // The fixture throws when its premises fail; re-derive them from the broker so this spec
    // states the facts independently of the fixture's own guards.
    val readA = fixtures.readAllMessages(fqnA)
    val readB = fixtures.readAllMessages(fqnB)
    assert(
      readA.map(_.getValue) == valuesA && readB.map(_.getValue) == valuesB,
      s"read-back does not match what was produced: A=${readA.map(_.getValue)} B=${readB.map(_.getValue)}"
    )
    Seq(fqnA -> readA, fqnB -> readB).foreach { case (fqn, read) =>
      read.grouped(4).foreach { batch =>
        assert(
          batch.map(_.getPublishTime).distinct.size == 1,
          s"a batch on $fqn does not share one publish time: ${batch.map(m => m.getValue -> m.getPublishTime)}"
        )
      }
    }
    val ties = readA.map(_.getPublishTime).toSet.intersect(readB.map(_.getPublishTime).toSet)
    assert(ties.nonEmpty, "no cross-topic publish-time tie landed on the broker")
  }

  test("SHAPE-3: produceSized lands count x size unbatched bytes on the broker") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    val values = fixtures.produceSized(fqn, count = 3, payloadBytes = 1024 * 1024)
    assert(values.size == 3 && values.forall(_.length == 1024 * 1024), "the fixture must return the exact values it sent")
    assert(fixtures.numberOfEntries(fqn) == 3, s"3 unbatched messages must be 3 entries, got ${fixtures.numberOfEntries(fqn)}")
    assert(
      admin.topics().getStats(fqn).getStorageSize >= 3L * 1024 * 1024,
      s"the broker holds ${admin.topics().getStats(fqn).getStorageSize} bytes for 3 MiB of payload"
    )
    // Byte-for-byte survival at this size, through the same Reader the start-from oracles use.
    val read = fixtures.readAllMessages(fqn).map(_.getValue)
    assert(read == values, s"sized payloads did not survive the round trip: got ${read.map(_.length)}")
  }
