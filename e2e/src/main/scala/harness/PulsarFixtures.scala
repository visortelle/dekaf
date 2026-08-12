package harness

import net.datafaker.Faker
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Message as PulsarMessage, MessageId as PulsarMessageId, PulsarClient, Schema}
import org.apache.pulsar.common.policies.data.{ClusterData, ResourceGroup, TenantInfo}

import java.util.concurrent.TimeUnit
import scala.collection.mutable
import scala.jdk.CollectionConverters.*

/** Per-suite Pulsar admin + client, unique-name minting, and a teardown registry.
  * `PulsarAdmin` is the oracle for every mutation; `PulsarClient` generates test messages
  * (schema'd / keyed / delayed) - the JVM clients are why we stayed all-JVM. */
class PulsarFixtures:
  private val faker = new Faker()

  val admin: PulsarAdmin =
    PulsarAdmin.builder().serviceHttpUrl(Config.pulsarAdminUrl).build()

  PulsarFixtures.sweepStaleClusters(admin)

  // Opened lazily - only tests that produce messages pay the connection cost.
  private var clientOpt: Option[PulsarClient] = None
  def client: PulsarClient =
    clientOpt.getOrElse:
      val c = PulsarClient.builder().serviceUrl(Config.pulsarServiceUrl).build()
      clientOpt = Some(c)
      c

  private val createdTenants = mutable.ListBuffer.empty[String]
  private val createdClusters = mutable.ListBuffer.empty[String]
  private val createdResourceGroups = mutable.ListBuffer.empty[String]
  private val extraCleanups = mutable.ListBuffer.empty[() => Unit]
  // Cleanup is best-effort per test (teardown must never fail the OWNING test), but failures leak
  // resources that can contaminate later tests - so they accumulate here and the suite surfaces
  // them at the end (see DekafSuite.afterAll) instead of vanishing into stderr.
  private val cleanupFailures = mutable.ListBuffer.empty[String]
  def cleanupFailuresSnapshot: List[String] = cleanupFailures.synchronized(cleanupFailures.toList)

  def unique(prefix: String): String =
    s"$prefix-${System.currentTimeMillis()}-${faker.number().numberBetween(1000L, 9999L)}"

  /** Register a tenant created through the UI (not via `createTenant`) for teardown. */
  def trackTenant(name: String): Unit = createdTenants += name

  /** Register an arbitrary best-effort cleanup action (e.g. delete a resource group). */
  def onCleanup(f: () => Unit): Unit = extraCleanups += f

  /** The real serving cluster - never a test-registered `cluster-*` peer. Plain `get(0)` is
    * order-unstable once a geo-rep test registers a second cluster, which would drop the serving
    * cluster from a tenant's allowed set and break namespace creation. */
  def firstCluster: String =
    val all = admin.clusters().getClusters.asScala
    all.find(!_.startsWith("cluster-")).getOrElse(all.head)

  /** Create an isolated tenant (registered for teardown) and return its name. `extraClusters` widens
    * the tenant's allowed-clusters beyond the local one - needed to exercise geo-replication, whose
    * replication set must be a subset of the tenant's allowed clusters. */
  def createTenant(extraClusters: String*): String =
    val tenant = unique("t")
    admin.tenants().createTenant(
      tenant,
      TenantInfo.builder()
        .adminRoles(Set("admin").asJava)
        .allowedClusters((firstCluster +: extraClusters).toSet.asJava)
        .build()
    )
    createdTenants += tenant
    tenant

  /** Register a second cluster so multi-cluster UI paths (geo-replication) can be driven. The
    * service URL is deliberately UNROUTABLE (`.invalid` TLD, RFC 2606): pointing it at the live
    * broker's own admin URL would make any topic produced into a geo-replicated namespace spin up a
    * real replicator against an alias of the same broker (loop or ever-growing cursor backlog).
    * With an inert URL a replicator merely fails to connect; tests should still avoid producing into
    * geo-replicated namespaces. Deleted in teardown AFTER namespaces that reference it. */
  def createCluster(): String =
    val name = unique("cluster")
    admin.clusters().createCluster(name, ClusterData.builder().serviceUrl("http://geo-peer.invalid:8080").build())
    createdClusters += name
    name

  /** Create a resource group (registered for teardown) so the Compute-Resources policy tab has one to pick. */
  def createResourceGroup(): String =
    val name = unique("rg")
    admin.resourcegroups().createResourceGroup(name, new ResourceGroup())
    createdResourceGroups += name
    name

  def createNamespace(tenant: String): String =
    val ns = unique("ns")
    admin.namespaces().createNamespace(s"$tenant/$ns")
    ns

  /** Create a non-partitioned persistent topic and return its FQN. */
  def createTopic(tenant: String, namespace: String): String =
    val topic = unique("topic")
    val fqn = s"persistent://$tenant/$namespace/$topic"
    admin.topics().createNonPartitionedTopic(fqn)
    fqn

  /** One quadrant of the topic matrix the consumer session must handle.
    *
    * NOTE ON NON-PERSISTENT: a non-persistent topic keeps nothing on disk - messages published
    * while no consumer is attached are dropped forever. So the "pre-produce, then start from
    * Earliest" shape is meaningless there; only produce-AFTER-play can be asserted. `retains`
    * encodes that so specs can branch on capability instead of hard-coding topic names.
    */
  case class TopicKind(persistent: Boolean, partitions: Int):
    def scheme: String = if persistent then "persistent" else "non-persistent"
    def isPartitioned: Boolean = partitions > 0
    def retains: Boolean = persistent
    def label: String =
      s"${if persistent then "persistent" else "non-persistent"}/${if isPartitioned then s"partitioned($partitions)" else "non-partitioned"}"

  object TopicKind:
    val PersistentNonPartitioned = TopicKind(persistent = true, partitions = 0)
    val PersistentPartitioned = TopicKind(persistent = true, partitions = 3)
    val NonPersistentNonPartitioned = TopicKind(persistent = false, partitions = 0)
    val NonPersistentPartitioned = TopicKind(persistent = false, partitions = 3)
    /** The full matrix the consumer session is expected to support. */
    val all: List[TopicKind] =
      List(PersistentNonPartitioned, PersistentPartitioned, NonPersistentNonPartitioned, NonPersistentPartitioned)

  /** Create a topic of the given kind in an existing namespace; returns its FQN. */
  def createTopicOfKind(tenant: String, namespace: String, kind: TopicKind): String =
    val topic = unique("topic")
    val fqn = s"${kind.scheme}://$tenant/$namespace/$topic"
    if kind.isPartitioned then admin.topics().createPartitionedTopic(fqn, kind.partitions)
    else admin.topics().createNonPartitionedTopic(fqn)
    fqn

  /** Fresh tenant → namespace → topic of the given kind; returns (tenant, namespace, shortTopic, fqn). */
  def freshTopicPartsOfKind(kind: TopicKind): (String, String, String, String) =
    val t = createTenant()
    val ns = createNamespace(t)
    val fqn = createTopicOfKind(t, ns, kind)
    (t, ns, fqn.substring(fqn.lastIndexOf('/') + 1), fqn)

  /** Convenience: fresh tenant → namespace → topic, returns the topic FQN. */
  def freshTopic(): String =
    val t = createTenant()
    val ns = createNamespace(t)
    createTopic(t, ns)

  /** Fresh tenant → namespace → non-partitioned topic; returns (tenant, namespace, shortTopic). */
  def freshTopicParts(): (String, String, String) =
    val t = createTenant()
    val ns = createNamespace(t)
    val topic = unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    (t, ns, topic)

  /** Produce `n` simple string messages to a topic FQN, and return exactly what was produced.
    *
    * `prefix` is what makes a payload an IDENTITY rather than scenery. The default `msg` repeats
    * across every topic and every call, so `msg-7` on topic A, `msg-7` on topic B and a redelivered
    * `msg-7` are one indistinguishable string: an exact-set oracle built on them cannot tell a
    * message that came from the wrong stream, or arrived twice, from the right one - only a COUNT
    * can be asserted, and a count is satisfied by one loss plus one duplicate. Give each topic (and
    * each produce phase) its own prefix and the set becomes assertable. */
  def produceStrings(topicFqn: String, n: Int, prefix: String = "msg"): Vector[String] =
    val values = (1 to n).map(i => s"$prefix-$i").toVector
    val producer = client.newProducer(Schema.STRING).topic(topicFqn).create()
    try values.foreach(producer.send)
    finally producer.close()
    values

  /** Produce `values` one at a time, ROUND-ROBIN across `topicFqns`, batching disabled, with a
    * clock tick between sends: publish time is millisecond-granular and stamped by the producer,
    * so two sends inside one tick would TIE and fall back to the topic-name tie-break - which
    * need not match production order. The tick wait is what makes publish times strictly
    * increasing across the WHOLE set, which is what the cross-topic ordering oracles rest on. */
  def produceRoundRobin(topicFqns: Seq[String], values: Seq[String]): Unit =
    val producers = topicFqns.map(fqn => client.newProducer(Schema.STRING).topic(fqn).enableBatching(false).create())
    try
      values.zipWithIndex.foreach { (v, i) =>
        producers(i % producers.size).send(v)
        Thread.sleep(2)
      }
    finally producers.foreach(p => scala.util.Try(p.close()))

  /** Bulk produce with ASYNC sends (batched entries, ~100x faster than the blocking loop) - for
    * tests that need tens of thousands of messages as scenery, not as per-entry fixtures. Returns
    * exactly what was produced; see [[produceStrings]] for why `prefix` matters. */
  def produceStringsFast(topicFqn: String, n: Int, prefix: String = "msg"): Vector[String] =
    val values = (1 to n).map(i => s"$prefix-$i").toVector
    val producer = client.newProducer(Schema.STRING).topic(topicFqn).create()
    try
      values.foreach(producer.sendAsync)
      producer.flush()
    finally producer.close()
    values

  /** Bulk produce like `produceStringsFast`, but UNBATCHED so the default router rotates PER
    * MESSAGE: on a partitioned topic every partition receives an equal share. With batching on,
    * the router rotates per BATCH, and a pipelined bulk produce lands in so few batches that most
    * partitions of a WIDE topic get nothing at all - useless for tests about width. Unbatched
    * async sends fill the producer's pending queue, so this blocks on it rather than throw. */
  def produceStringsFastRoundRobin(topicFqn: String, n: Int): Unit =
    val producer = client.newProducer(Schema.STRING).topic(topicFqn).enableBatching(false).blockIfQueueFull(true).create()
    try
      (1 to n).foreach(i => producer.sendAsync(s"msg-$i"))
      producer.flush()
    finally producer.close()

  /** Force-delete a topic out from under its consumers: everything it held, recorded ends
    * included, silently stops being deliverable - the retention/trim race the start-from give-up
    * window exists for, made absolute and reproducible. (Auto-creation may resurrect the NAME as
    * an empty topic; the old ledger never comes back, which is the point.) */
  def forceDeleteTopic(topicFqn: String): Unit =
    admin.topics.delete(topicFqn, true)

  // ---------------------------------------------------------------------------------------------
  // Batching
  //
  // A Pulsar broker addresses its log by ENTRY, not by message, and the Java producer batches by
  // default - so an ordinary application writes many messages per entry. Everything the suite
  // produced before this section went out one-message-per-entry (a blocking `send` per message
  // closes each batch immediately), which meant no test could ever observe an entry-vs-message
  // confusion. `PulsarAdmin.examineMessage` - what the "skip first n" / "latest n" start-from modes
  // are built on - counts ENTRIES, so that gap hid a real defect. These helpers make both shapes
  // explicit and provable.
  // ---------------------------------------------------------------------------------------------

  /** Broker-side entry count of a NON-partitioned topic (a `-partition-K` FQN counts as one).
    * This is the number `examineMessage` indexes into, so `numberOfEntries < messages produced` is
    * exactly the condition under which entry-addressing and message-addressing diverge.
    * Persistent topics only - a non-persistent topic has no managed ledger and 405s. */
  def numberOfEntries(nonPartitionedTopicFqn: String): Long =
    admin.topics().getInternalStats(nonPartitionedTopicFqn).numberOfEntries

  /** How many partitions a topic has, or 0 when it is not partitioned. */
  def partitionCount(topicFqn: String): Int =
    admin.topics().getPartitionedTopicMetadata(topicFqn).partitions

  /** Total broker entries behind a topic FQN, summed across partitions when it names a partitioned
    * topic - the parent of a partitioned topic has no managed ledger of its own, so asking it for
    * internal stats 404s. Partitions that are not materialized yet contribute nothing. */
  def totalEntries(topicFqn: String): Long =
    partitionCount(topicFqn) match
      case 0 => numberOfEntries(topicFqn)
      case n =>
        (0 until n).map { i =>
          try numberOfEntries(s"$topicFqn-partition-$i")
          catch case _: Throwable => 0L
        }.sum

  /** The broker entries added to `topicFqn` since `before`, once the admin counter has SETTLED - two
    * reads a short quiescence gap apart that agree.
    *
    * Every producer ack is already held (and flushed) when this is called, so the writes are durable
    * and the counter can only LAG, never grow anew: this is not readiness polling, it is measuring
    * the admin counter catch up. The gap matters on a PARTITIONED topic, where the entries land
    * across partitions and the counter climbs in STEPS - a single non-zero reading can catch it
    * mid-climb and UNDERCOUNT, and an undercount sits below `values.size` even for genuinely
    * unbatched output, which is exactly the fixture the batching guard exists to reject. */
  private def settledEntryDelta(topicFqn: String, before: Long): Long =
    Eventually.eventually(timeoutMs = 15000, intervalMs = 250) {
      val d1 = totalEntries(topicFqn) - before
      assert(d1 >= 1L, s"no entries visible yet on $topicFqn")
      Thread.sleep(400) // quiescence gap, NOT a readiness wait: every ack is held, so the counter only lags
      val d2 = totalEntries(topicFqn) - before
      assert(d1 == d2, s"the broker entry counter is still rising on $topicFqn: $d1 then $d2 - reading it mid-climb would undercount")
      d2
    }

  /** Produce `values` with batching DISABLED: one message per broker entry, guaranteed.
    * The baseline half of every batched/unbatched pair. */
  def produceUnbatched(topicFqn: String, values: Seq[String]): Unit =
    val producer = client.newProducer(Schema.STRING).topic(topicFqn).enableBatching(false).create()
    try values.foreach(producer.send)
    finally producer.close()

  /** Produce `values` so that consecutive groups of `messagesPerBatch` genuinely SHARE one broker
    * entry - what the Java client does by default in any real application.
    *
    * The three settings are all load-bearing: `enableBatching` alone changes nothing if each
    * message is sent with a blocking `send` (that flushes a one-message batch every time), so the
    * sends must be async and only then flushed; and the publish delay has to be long enough that
    * `batchingMaxMessages` - not a timer - is what closes a batch, otherwise a slow box silently
    * degrades to singletons.
    *
    * On a persistent topic the outcome is VERIFIED against `numberOfEntries` and an unbatched
    * result THROWS. That guard is the point: a "batched" fixture that quietly produced one-message
    * entries would recreate the exact blind spot batched coverage exists to close, and every test
    * built on it would keep passing while proving nothing. */
  def produceBatched(topicFqn: String, values: Seq[String], messagesPerBatch: Int): Unit =
    require(messagesPerBatch >= 2, s"messagesPerBatch must be >= 2 to batch anything, got $messagesPerBatch")
    val verifiable = topicFqn.startsWith("persistent://") // a non-persistent topic has no ledger to count
    val isPartitioned = verifiable && partitionCount(topicFqn) > 0
    val before = if verifiable then totalEntries(topicFqn) else -1L
    val producer = client
      .newProducer(Schema.STRING)
      .topic(topicFqn)
      .enableBatching(true)
      .batchingMaxMessages(messagesPerBatch)
      .batchingMaxBytes(4 * 1024 * 1024)          // never the binding limit for these short payloads
      .batchingMaxPublishDelay(60, TimeUnit.SECONDS) // never the binding limit either: size or flush closes a batch
      .create()
    try
      val acks = values.map(v => producer.sendAsync(v))
      producer.flush()                                              // closes the trailing partial batch
      acks.foreach(_.get(60, TimeUnit.SECONDS))                     // and every send really landed
    finally producer.close()
    if verifiable then
      val expected = math.ceil(values.size.toDouble / messagesPerBatch).toLong
      // The managed-ledger counter is read back through the admin API, so allow it a moment to
      // reflect the writes we already hold producer acks for. On a single log the final count is
      // known (`expected`), so waiting for exactly that and no more is both sufficient and precise.
      // On a PARTITIONED topic the final count is router-dependent and unknown, so the counter must
      // be read once it has SETTLED - a `>= 1` reading can catch it mid-climb and undercount, and an
      // undercount would pass the batching guard below on genuinely unbatched output.
      val added =
        if isPartitioned then settledEntryDelta(topicFqn, before)
        else
          Eventually.eventually(timeoutMs = 10000, intervalMs = 200) {
            val d = totalEntries(topicFqn) - before
            assert(d >= expected, s"only $d entries visible yet for ${values.size} messages on $topicFqn")
            d
          }
      // THE guard: if the messages did not actually share entries there is no point running any
      // batched test on top, because it would be indistinguishable from the unbatched one.
      assert(
        added < values.size,
        s"produceBatched did NOT batch: ${values.size} messages at $messagesPerBatch per batch became " +
          s"$added broker entries on $topicFqn - one per message. An unbatched 'batched' fixture proves " +
          "nothing; fix the producer settings, do not relax this."
      )
      // On a single log the split is fully determined. A partitioned topic batches per partition and
      // the router decides where each batch lands, so only the inequality above is guaranteed there.
      if !isPartitioned then
        assert(added == expected, s"expected exactly $expected entries for ${values.size} messages at $messagesPerBatch per batch, got $added")

  /** Produce one broker entry for each explicitly supplied batch, preserving deliberately uneven
    * batch sizes. Restricted to persistent non-partitioned topics because only there is the exact
    * entry delta deterministic and directly verifiable.
    *
    * Flushing after every group is load-bearing: it closes a short group before the next one can
    * join it. The final entry-count assertion makes a changed client batching policy fail at the
    * fixture boundary instead of weakening every entry-position test built on this arrangement. */
  def produceBatches(topicFqn: String, batches: Seq[Seq[String]]): Unit =
    require(batches.nonEmpty, "batches must not be empty")
    require(batches.forall(_.nonEmpty), "each explicit batch must contain at least one message")
    require(topicFqn.startsWith("persistent://"), s"explicit batches require a persistent topic: $topicFqn")
    require(partitionCount(topicFqn) == 0, s"explicit batches require a non-partitioned topic: $topicFqn")

    val before = numberOfEntries(topicFqn)
    val producer = client
      .newProducer(Schema.STRING)
      .topic(topicFqn)
      .enableBatching(true)
      .batchingMaxMessages(batches.map(_.size).max)
      .batchingMaxBytes(4 * 1024 * 1024)
      .batchingMaxPublishDelay(60, TimeUnit.SECONDS)
      .create()
    try
      batches.foreach { batch =>
        val acks = batch.map(value => producer.sendAsync(value))
        producer.flush()
        acks.foreach(_.get(60, TimeUnit.SECONDS))
      }
    finally producer.close()

    val expected = batches.size.toLong
    Eventually.eventually(timeoutMs = 10000, intervalMs = 200) {
      val added = numberOfEntries(topicFqn) - before
      assert(added == expected, s"expected $expected explicit batches to add $expected entries on $topicFqn, got $added")
    }

  // ---------------------------------------------------------------------------------------------
  // Blind-spot payload shapes: ties, chunking, sized payloads
  //
  // The batching section above exists because every fixture used to produce the ONE shape in which
  // a real defect class was invisible. These three helpers close the remaining shapes the same way,
  // and follow the same rule: each ASSERTS its own premise against the broker and throws when the
  // data did not land in the shape its tests need - a fixture that silently degrades recreates the
  // blind spot it exists to close. `harness.MessageShapeFixtureSpec` pins the broker facts under
  // each (pure broker specs - they run without a Dekaf instance).
  // ---------------------------------------------------------------------------------------------

  /** Produce batch pairs to TWO topics until at least one attempt's batches genuinely SHARE a
    * publish timestamp across the topics, and return everything produced as (valuesA, valuesB).
    *
    * WHY: the Java producer batches by default and every message in a batch carries the batch
    * container's single publish time - so in production, publish-time ties are the norm, both
    * within a stream and across streams. Every other ordering fixture here tick-separates its
    * sends precisely so ties can NEVER occur, which leaves the merge's tie-break (and the
    * Guaranteed barrier's behavior on tied heads) unreachable.
    *
    * Each attempt interleaves async sends message-by-message so the two batches fill in lockstep
    * and close within the same producer-clock millisecond in the common case; whether they REALLY
    * tied is then read back from the broker, and more pairs are appended until one did. Premises
    * asserted before returning, everything from the broker:
    *   - each attempt added exactly ONE entry per topic (the batches really batched);
    *   - every batch's messages share exactly one publish time;
    *   - at least one attempt's A-batch and B-batch share the SAME publish time (the cross-stream
    *     tie), or this THROWS after `maxAttempts` rather than let a tie-free arrangement pass for
    *     a tied one. */
  def produceTiedBatches(fqnA: String, fqnB: String, messagesPerBatch: Int, maxAttempts: Int = 8): (Vector[String], Vector[String]) =
    require(messagesPerBatch >= 2, s"messagesPerBatch must be >= 2 to batch anything, got $messagesPerBatch")
    Seq(fqnA, fqnB).foreach { fqn =>
      require(fqn.startsWith("persistent://"), s"tied batches need a verifiable ledger: $fqn")
      require(partitionCount(fqn) == 0, s"tied batches need a single log per topic: $fqn")
    }
    def newBatchingProducer(fqn: String) = client
      .newProducer(Schema.STRING)
      .topic(fqn)
      .enableBatching(true)
      .batchingMaxMessages(messagesPerBatch)
      .batchingMaxBytes(4 * 1024 * 1024)
      .batchingMaxPublishDelay(60, TimeUnit.SECONDS)
      .create()
    val beforeA = numberOfEntries(fqnA)
    val beforeB = numberOfEntries(fqnB)
    val sentA = Vector.newBuilder[String]
    val sentB = Vector.newBuilder[String]
    var attempts = 0
    var tied = false
    val producerA = newBatchingProducer(fqnA)
    val producerB = newBatchingProducer(fqnB)
    try
      while !tied && attempts < maxAttempts do
        attempts += 1
        val va = (1 to messagesPerBatch).map(i => s"tie-a$attempts-$i")
        val vb = (1 to messagesPerBatch).map(i => s"tie-b$attempts-$i")
        // Interleaved per MESSAGE: both batches close (size-triggered) on back-to-back calls.
        val acks = (0 until messagesPerBatch).flatMap(i => Seq(producerA.sendAsync(va(i)), producerB.sendAsync(vb(i))))
        producerA.flush()
        producerB.flush()
        acks.foreach(_.get(60, TimeUnit.SECONDS))
        sentA ++= va
        sentB ++= vb
        // Did THIS attempt's two batches land on one shared millisecond? (An accidental tie
        // between different attempts would not put tied heads in front of the merge reliably.)
        val timesA = readAllMessages(fqnA).map(_.getPublishTime)
        val timesB = readAllMessages(fqnB).map(_.getPublishTime)
        tied = timesA.takeRight(messagesPerBatch).toSet.intersect(timesB.takeRight(messagesPerBatch).toSet).nonEmpty
    finally
      scala.util.Try(producerA.close())
      scala.util.Try(producerB.close())
    assert(
      tied,
      s"produceTiedBatches could not manufacture a cross-topic publish-time tie in $attempts attempt(s) - " +
        "a ties test running on tie-free data proves nothing; raise maxAttempts, do not relax this."
    )
    // The batching guard, exact: one entry per attempt per topic.
    Eventually.eventually(timeoutMs = 15000, intervalMs = 250) {
      val addedA = numberOfEntries(fqnA) - beforeA
      val addedB = numberOfEntries(fqnB) - beforeB
      assert(
        addedA == attempts && addedB == attempts,
        s"tied batches did NOT batch: $attempts attempt(s) became $addedA entries on $fqnA and $addedB on $fqnB - expected exactly one each"
      )
    }
    // Within-batch premise: a batch is ONE publish time, for every batch produced.
    Seq(fqnA -> sentA.result(), fqnB -> sentB.result()).foreach { case (fqn, sent) =>
      val read = readAllMessages(fqn)
      assert(read.map(_.getValue) == sent, s"read-back of $fqn does not match produce order: ${read.map(_.getValue)}")
      read.grouped(messagesPerBatch).foreach { batch =>
        assert(
          batch.map(_.getPublishTime).distinct.size == 1,
          s"a batch on $fqn does not share one publish time: ${batch.map(m => m.getValue -> m.getPublishTime)}"
        )
      }
    }
    (sentA.result(), sentB.result())

  /** Produce ONE message whose payload the client splits across several broker entries - Pulsar
    * CHUNKING, the exact dual of batching (batching: many messages, one entry; chunking: one
    * message, many entries). Returns the entry (chunk) count.
    *
    * The chunk size is pinned SMALL so the payload stays test-sized instead of having to exceed
    * the broker's 5 MB frame; chunking requires batching off. Persistent non-partitioned only,
    * and the premise is ASSERTED: the send must have added exactly ceil(bytes / chunkBytes) > 1
    * entries. A fixture that quietly sent one entry would recreate the exact blind spot chunked
    * coverage exists to close - an entry-addressed walk that miscounts chunked messages. */
  def produceChunked(nonPartitionedTopicFqn: String, value: String, chunkBytes: Int = 64 * 1024): Int =
    require(nonPartitionedTopicFqn.startsWith("persistent://"), s"chunk verification needs a ledger: $nonPartitionedTopicFqn")
    require(partitionCount(nonPartitionedTopicFqn) == 0, s"chunk verification needs a single log: $nonPartitionedTopicFqn")
    val payloadBytes = value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length
    val expectedChunks = math.ceil(payloadBytes.toDouble / chunkBytes).toInt
    require(expectedChunks >= 2, s"a $payloadBytes-byte value fits one $chunkBytes-byte chunk - nothing would be chunked")
    val before = numberOfEntries(nonPartitionedTopicFqn)
    val producer = client
      .newProducer(Schema.STRING)
      .topic(nonPartitionedTopicFqn)
      .enableBatching(false) // chunking and batching are mutually exclusive on the producer
      .enableChunking(true)
      .chunkMaxMessageSize(chunkBytes)
      .create()
    try producer.send(value)
    finally producer.close()
    Eventually.eventually(timeoutMs = 15000, intervalMs = 250) {
      val added = numberOfEntries(nonPartitionedTopicFqn) - before
      assert(
        added == expectedChunks,
        s"produceChunked did NOT chunk as arranged: a $payloadBytes-byte message at $chunkBytes bytes/chunk " +
          s"became $added entries on $nonPartitionedTopicFqn, expected $expectedChunks. An unchunked 'chunked' " +
          "fixture proves nothing; fix the producer settings, do not relax this."
      )
    }
    expectedChunks

  /** Produce `count` messages of exactly `payloadBytes` ASCII bytes each (a short readable prefix,
    * x-padded), UNBATCHED so each is its own entry, with async sends so hundreds of MiB do not pay
    * a blocking round trip per message. Persistent non-partitioned only. Premises ASSERTED:
    * exactly `count` entries were added, and the topic's storage grew by at least
    * count x payloadBytes - a fixture that silently produced small (or batched) messages would
    * leave the merge's held-BYTES watermark unreachable and any test built on it vacuous. */
  def produceSized(nonPartitionedTopicFqn: String, count: Int, payloadBytes: Int): Vector[String] =
    require(nonPartitionedTopicFqn.startsWith("persistent://"), s"sized-payload verification needs a ledger: $nonPartitionedTopicFqn")
    require(partitionCount(nonPartitionedTopicFqn) == 0, s"sized-payload verification needs a single log: $nonPartitionedTopicFqn")
    require(payloadBytes >= 16, s"payloadBytes must fit the value prefix, got $payloadBytes")
    val before = numberOfEntries(nonPartitionedTopicFqn)
    val beforeStorage = admin.topics().getStats(nonPartitionedTopicFqn).getStorageSize
    val values = (1 to count).map { i =>
      val prefix = f"big-$i%05d-"
      prefix + "x" * (payloadBytes - prefix.length)
    }.toVector
    val producer = client
      .newProducer(Schema.STRING)
      .topic(nonPartitionedTopicFqn)
      .enableBatching(false)
      .blockIfQueueFull(true) // async sends throttle against the client memory limit instead of failing
      .create()
    try
      val acks = values.map(producer.sendAsync)
      producer.flush()
      acks.foreach(_.get(120, TimeUnit.SECONDS))
    finally producer.close()
    Eventually.eventually(timeoutMs = 30000, intervalMs = 500) {
      val added = numberOfEntries(nonPartitionedTopicFqn) - before
      assert(added == count, s"produceSized: expected $count unbatched entries on $nonPartitionedTopicFqn, got $added")
    }
    val storageAdded = admin.topics().getStats(nonPartitionedTopicFqn).getStorageSize - beforeStorage
    assert(
      storageAdded >= count.toLong * payloadBytes,
      s"produceSized: the broker holds only $storageAdded bytes for $count x $payloadBytes-byte messages on " +
        s"$nonPartitionedTopicFqn - the payloads did not land at the size the byte-watermark tests need"
    )
    values

  /** Messages the broker has DISPATCHED to the single subscription of a non-partitioned topic.
    * The topic must carry exactly ONE subscription (a fresh topic consumed only by the session
    * under test), so the number is attributable without knowing Dekaf's internal subscription
    * name. This is the oracle a flow-control pause leaves behind: a paused consumer stops asking
    * for more, so the counter PLATEAUS while backlog remains. */
  def subscriptionDispatchCount(nonPartitionedTopicFqn: String): Long =
    val subs = admin.topics().getStats(nonPartitionedTopicFqn).getSubscriptions.asScala
    assert(subs.size == 1, s"expected exactly one subscription on $nonPartitionedTopicFqn, got ${subs.keys.toList}")
    subs.values.head.getMsgOutCounter

  /** Register a JSON schema (an Avro-record JSON definition) on a topic through the admin API,
    * and assert the registry really holds it - the premise any schema-decode test rests on. */
  def registerJsonSchema(topicFqn: String, avroRecordJson: String): Unit =
    val payload = new org.apache.pulsar.common.protocol.schema.PostSchemaPayload(
      "JSON",
      avroRecordJson,
      java.util.Collections.emptyMap[String, String]()
    )
    admin.schemas().createSchema(topicFqn, payload)
    Eventually.eventually(timeoutMs = 10000, intervalMs = 200) {
      val stored = admin.schemas().getSchemaInfo(topicFqn)
      assert(
        stored != null && stored.getType == org.apache.pulsar.common.schema.SchemaType.JSON,
        s"the registered JSON schema did not land on $topicFqn: $stored"
      )
    }

  /** Every message currently retained on a NON-partitioned topic, oldest first, read with a
    * non-durable Reader (no cursor left behind). The oracle for the id- and time-addressed
    * start-from modes: only the broker knows the real message ids and publish times. */
  def readAllMessages(nonPartitionedTopicFqn: String): Vector[PulsarMessage[String]] =
    val reader = client
      .newReader(Schema.STRING)
      .topic(nonPartitionedTopicFqn)
      .startMessageId(PulsarMessageId.earliest)
      .create()
    try
      val buf = Vector.newBuilder[PulsarMessage[String]]
      while reader.hasMessageAvailable do
        val m = reader.readNext(10, TimeUnit.SECONDS)
        if m != null then buf += m
      buf.result()
    finally reader.close()

  /** A message id in the space-separated hex the Start-From "Message with specific ID" input takes
    * (`hexStringToByteArray` in ui/components/conversions), e.g. "08 c3 03 10 cd 04 20 00 30 01". */
  def messageIdHex(messageId: PulsarMessageId): String =
    messageId.toByteArray.map(b => f"${b & 0xff}%02x").mkString(" ")

  /** Best-effort teardown of everything this fixture created. Runs after each test.
    * Failures are logged (not thrown - teardown must not fail a test) so leaks aren't silent.
    * Two deliberate softenings (both bit on CI):
    *   - not-found on a delete = SUCCESS: the resource is already gone, usually deleted by the
    *     test itself (the tenant/RG deletion specs) - that's the goal state, not a leak;
    *   - one retry after a short pause: broker-side races (topic GC on namespace force-delete)
    *     surface as transient 500s on a loaded box and clear on the second attempt. */
  def cleanup(): Unit =
    def alreadyGone(t: Throwable): Boolean =
      t.isInstanceOf[org.apache.pulsar.client.admin.PulsarAdminException.NotFoundException] ||
        Option(t.getMessage).exists(_.toLowerCase.contains("not found"))
    def attempt(what: String)(op: => Unit): Unit =
      try op
      catch
        case t: Throwable if alreadyGone(t) => ()
        case _: Throwable =>
          Thread.sleep(1500)
          try op
          catch
            case t: Throwable if alreadyGone(t) => ()
            case t: Throwable =>
              val msg = s"$what failed: ${t.getMessage}"
              System.err.println(s"[cleanup] $msg")
              cleanupFailures.synchronized(cleanupFailures += msg)
    extraCleanups.reverse.foreach(f => attempt("onCleanup action")(f()))
    extraCleanups.clear()
    // A namespace whose replication references a cluster we're about to delete can't be deleted; drop
    // its replication back to the local cluster first. Only geo-rep tests register extra clusters.
    val resetReplication = createdClusters.nonEmpty
    createdTenants.foreach: tenant =>
      val namespaces =
        try admin.namespaces().getNamespaces(tenant).asScala.toList
        catch case _: Throwable => Nil // tenant already gone (deleted by the test) - nothing to do
      namespaces.foreach: ns =>
        attempt(s"deleteNamespace($ns)"):
          if resetReplication then
            try admin.namespaces().setNamespaceReplicationClusters(ns, Set(firstCluster).asJava)
            catch case _: Throwable => () // best-effort - the ns may have no replication set
          admin.namespaces().deleteNamespace(ns, true)
      attempt(s"deleteTenant($tenant)")(admin.tenants().deleteTenant(tenant))
    createdTenants.clear()
    createdResourceGroups.foreach: rg =>
      attempt(s"deleteResourceGroup($rg)")(admin.resourcegroups().deleteResourceGroup(rg))
    createdResourceGroups.clear()
    // Clusters last - after every namespace that referenced them is gone.
    createdClusters.foreach: c =>
      attempt(s"deleteCluster($c)")(admin.clusters().deleteCluster(c))
    createdClusters.clear()

  /** Close clients at suite end. */
  def close(): Unit =
    try admin.close()
    finally clientOpt.foreach(_.close())

object PulsarFixtures:
  private val staleClustersSwept = new java.util.concurrent.atomic.AtomicBoolean(false)
  private val StaleClusterName = """cluster-(\d+)-\d+""".r

  /** Once per JVM: best-effort delete of `cluster-<millis>-<n>` peers older than an hour, left by
    * crashed runs whose cleanup never ran. Tests are immune to them (`firstCluster` filters the
    * prefix) but the shared broker's cluster list - and the geo-replication UI dropdown - would
    * otherwise grow forever. In-use clusters (still referenced by a leaked tenant) fail to delete
    * and are silently skipped; the concurrently-running run that owns a fresh one is protected by
    * the one-hour age gate. */
  private def sweepStaleClusters(admin: PulsarAdmin): Unit =
    if staleClustersSwept.compareAndSet(false, true) then
      try
        val cutoff = System.currentTimeMillis() - 60 * 60 * 1000
        admin.clusters().getClusters.asScala.foreach {
          case name @ StaleClusterName(millis) if millis.toLong < cutoff =>
            try admin.clusters().deleteCluster(name) catch case _: Throwable => ()
          case _ => ()
        }
      catch case _: Throwable => () // the sweep must never fail a run
