package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

/** WIDTH: two hundred delivery streams through one session - the scale the merge's O(1) emission
  * gate, the per-session prefetch budget and the guaranteed replay barrier were built for,
  * exercised against a real broker end to end.
  *
  * A 200-partition topic IS 200 delivery streams: the runner subscribes and merges per partition,
  * so partitions and distinct topics are the same width to everything downstream of target
  * resolution (a 200-topic selector differs only in admin-side resolution cost, which the
  * admission caps bound separately).
  *
  * The two tests are the two modes' CONTRASTING contracts at width, on identically shaped data:
  *
  *   - BEST-EFFORT completes a finite backlog on its own and keeps FOLLOWING - bounded residence
  *     releases the tails, and the session stays running for whatever arrives next.
  *   - GUARANTEED is an exact replay (owner decision 2026-08-09): the whole recorded backlog
  *     delivers - a partition running dry holds nothing back, because history needs no proof
  *     from the future - and the session then AUTO-PAUSES at the boundary with the caught-up
  *     banner. New words arrive as the NEXT chunk, replayed exactly by an explicit Resume.
  *
  * That contrast is the whole reason both modes exist: one mode follows live traffic at a bounded
  * lateness cost, the other replays immutable history exactly and hands the user the boundary.
  */
class CsWideTopologySpec extends DekafSuite:

  private val partitions = 200
  private val backlog = 20_000

  private val bestEffortLabel = "Best effort"
  private val guaranteedLabel = "Guaranteed"

  /** A fresh 200-partition topic with `backlog` messages spread round-robin PER MESSAGE, so every
    * partition holds an equal share (batched bulk produce would leave most of a wide topic empty,
    * and 200 NON-empty streams is the width the replay barrier has to finish across). */
  private def widePartitionedTopic(): (String, String, String, String) =
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = s"wide-${System.currentTimeMillis()}"
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.admin.topics().createPartitionedTopic(fqn, partitions)
    fixtures.produceStringsFastRoundRobin(fqn, backlog)
    (t, ns, topic, fqn)

  test("CS-WT-1: BEST-EFFORT at 200 partitions - a 20,000-message backlog completes on its own") {
    val (t, ns, topic, _) = widePartitionedTopic()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(backlog, timeoutMs = 180000)

    assert(cs.loadedCount == backlog, s"every message must arrive, got ${cs.loadedCount}")
    assert(cs.state == "running", s"the session must still be healthy, got '${cs.state}'")
    cs.stop()
  }

  test("CS-WT-2: GUARANTEED at 200 partitions - the whole recorded backlog replays exactly, auto-pauses at the boundary, and Resume replays the delta") {
    val (t, ns, topic, fqn) = widePartitionedTopic()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.play()

    // Phase 1: the WHOLE recorded range. The old contract settled short of the backlog (a
    // drained partition held the rest hostage); the replay contract delivers every one of the
    // 20,000 - the barrier at width holds nothing back - and then the session AUTO-PAUSES at the
    // boundary with the caught-up banner, on the ordinary paused state.
    cs.awaitLoaded(backlog, timeoutMs = 180000)
    assertThat(page.getByTestId("cs-replay-caught-up"))
      .isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(20000))
    cs.assertState("paused", timeoutMs = 10000)
    Thread.sleep(2000) // the boundary must be a fixpoint, not a moment the counter passed through
    assert(cs.loadedCount == backlog, s"the replay must stop exactly at the boundary, got ${cs.loadedCount}")
    // Round-robin production is time-ordered within every partition, so exactness at width has
    // nothing to confess: no source inversions, no late deliveries, and no seam flags.
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()

    // Phase 2: one closing word per partition INTO the pause, ticked so publish times strictly
    // increase past the whole backlog - 200 words recorded past the boundary, none of which may
    // deliver into the closed chunk.
    val closer = fixtures.client
      .newProducer(org.apache.pulsar.client.api.Schema.STRING)
      .topic(fqn)
      .enableBatching(false)
      .create()
    try
      (0 until partitions).foreach { i =>
        closer.send(f"close-$i%03d")
        Thread.sleep(2)
      }
    finally closer.close()

    Thread.sleep(2000) // ample time to be wrong before asserting the boundary held
    assert(cs.loadedCount == backlog, s"pause-window words belong to the next chunk, got ${cs.loadedCount}")

    // Phase 3: Resume extends the boundary - all 200 closing words replay exactly once, one per
    // stream, and the banner returns at the new boundary.
    page.getByTestId("cs-replay-resume").click()
    cs.awaitLoaded(backlog + partitions, timeoutMs = 60000)
    assertThat(page.getByTestId("cs-replay-caught-up"))
      .isVisible(new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(20000))
    cs.assertState("paused", timeoutMs = 10000)
    Thread.sleep(2000)
    assert(cs.loadedCount == backlog + partitions, s"the delta must replay exactly once, got ${cs.loadedCount}")
    cs.stop()
  }
