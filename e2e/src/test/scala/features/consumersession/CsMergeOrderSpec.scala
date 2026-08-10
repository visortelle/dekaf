package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import scala.jdk.CollectionConverters.*

/** Delivery ordering across topics and partitions.
  *
  * WHAT ONLY AN END-TO-END TEST CAN SEE HERE. The server suite pins the floor rule against
  * injected clocks; the jest suite pins the config round-trip. Neither can tell whether two real
  * consumers racing two real backlogs actually reach the browser as ONE stream in publish-time
  * order - that is a property of the whole pipeline (broker read speed, listener threads, the
  * merge, the gRPC stream, the table).
  *
  * THE ORACLE IS DELIVERY ORDER, NOT DISPLAY ORDER. The table sorts by publish time on its own,
  * which would mask everything; each row's index cell carries its session-order ordinal, so the
  * (ordinal, value) pairs reconstruct the order messages actually ARRIVED in.
  *
  * The fixture produces values round-robin across the topics with batching off and synchronous
  * sends, so publish times strictly increase across the whole set: the expected merged order IS
  * the production order.
  */
class CsMergeOrderSpec extends DekafSuite:

  private def vis(timeoutMs: Double) = new com.microsoft.playwright.assertions.LocatorAssertions.IsVisibleOptions().setTimeout(timeoutMs)

  private val bestEffortLabel = "Best effort"
  private val guaranteedLabel = "Guaranteed"
  private val fastestLabel = "Fastest"

  /** Values in the order the session DELIVERED them (row index-cell ordinal, ascending).
    *
    * The table is VIRTUALIZED: only a viewport's worth of rows is mounted at any moment, and how
    * many that is moves with every layout change - a fixed hasCount on mounted rows broke the
    * moment the tools pane grew. So the scrape pauses the session first (instant now, and it
    * stops the running-state auto-scroll from fighting the walk), scrolls the virtuoso pane from
    * the top, and harvests (ordinal, value) pairs until every expected ordinal has been seen.
    */
  private def deliveredValues(expected: Int): List[String] =
    if page.getByTestId("cs-session").getAttribute("data-cs-state") == "running" then
      val cs = ConsumerSessionPage(page)
      cs.pauseFromToolbar()
      cs.assertState("paused", timeoutMs = 5000)

    val byOrdinal = scala.collection.mutable.Map.empty[Int, String]
    // ONE evaluate per pass, not per-cell Locator reads: virtuoso mounts a spacer row without
    // cells, and a Locator innerText on a cell that is not there auto-waits its full default
    // timeout - one spacer froze the whole walk. The page-side snapshot also cannot go stale
    // mid-read. The scroller is looked up INSIDE the message table: the tools pane's tabs render
    // their own virtuoso, and a document-wide lookup scrolled whichever came first in the DOM.
    def harvestAndStep(): Unit =
      val json = page
        .evaluate(
          """() => {
            |  const pairs = Array.from(document.querySelectorAll("[data-testid='cs-table'] tbody tr"))
            |    .map(r => [
            |      r.querySelector("[data-testid='cs-message']")?.innerText?.trim() ?? null,
            |      r.querySelector("[data-testid='cs-cell-value']")?.innerText?.trim() ?? null
            |    ])
            |    .filter(p => p[0] !== null && p[1] !== null);
            |  const s = document.querySelector("[data-testid='cs-table'] [data-virtuoso-scroller]");
            |  if (s) {
            |    if (s.scrollTop + s.clientHeight >= s.scrollHeight - 2) s.scrollTop = 0;
            |    else s.scrollTop = s.scrollTop + s.clientHeight * 0.8;
            |  }
            |  return JSON.stringify(pairs);
            |}""".stripMargin
        )
        .toString
      // Minimal parse of [["1","\"m-00\""], ...]: strip the outer brackets, split the pairs.
      "\\[\"(\\d+)\",\"(.*?)\"\\]".r
        .findAllMatchIn(json.replace("\\\"", "\u0000"))
        .foreach { m =>
          val value = m.group(2).replace("\u0000", "").stripPrefix("\"").stripSuffix("\"")
          byOrdinal.update(m.group(1).toInt, value)
        }

    val deadline = System.currentTimeMillis() + 30000
    while byOrdinal.size < expected && System.currentTimeMillis() < deadline do
      harvestAndStep()
      Thread.sleep(150)

    assert(byOrdinal.size == expected, s"collected ${byOrdinal.size} of $expected rows: ordinals ${byOrdinal.keys.toList.sorted}")
    byOrdinal.toList.sortBy(_._1).map(_._2)

  private def twoToppedUpTopics(values: Seq[String]): (String, String, (String, String, String)) =
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    if values.nonEmpty then fixtures.produceRoundRobin(Seq(fqnA, fqnB), values)
    (fqnA, fqnB, (tA, nsA, topicA))

  test("CS-MO-0: a new consumer session defaults to Best effort ordering by publish time") {
    // Owner decision (2026-08-09, direct instruction): the default is Best effort - supersedes
    // the review-findings P1.1 note that said Guaranteed. The default merges with bounded
    // lateness and never stalls on a silent stream; Guaranteed stays an explicit choice - an
    // EXACT REPLAY that delivers everything recorded up to Play and then auto-pauses caught-up
    // (`cs-replay-caught-up`). CsDeliveryModesSpec pins what each mode means across every
    // liveness state, and CS-MO-G1/G2 pin the replay's order and chunk rule on the merge shapes.
    // This test pins only WHAT the default is; every other ordering spec selects its mode
    // explicitly through the control, so this is the single line a future default change should
    // touch.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)

    cs.openForTopic(t, ns, topic)

    assertThat(page.getByTestId("cs-delivery-order")).hasValue("best-effort")
    assertThat(page.getByTestId("cs-delivery-order-key")).hasValue("publish-time")
  }

  test("CS-MO-0B: Guaranteed on a single non-persistent stream is an INSTANT caught-up - nothing recorded means nothing to replay") {
    // Guaranteed refuses MULTI-stream non-persistent sessions (CS-DM-D4G); a SINGLE
    // non-persistent stream is legal - and under the exact-replay contract its recorded range is
    // empty by definition, so Play answers with the instant caught-up pause (observed 2026-08-09:
    // the old "runs live and delivers" expectation failed with the session already 'paused').
    // Pinned through the control rather than inherited: whatever the session default is (today
    // it is Best effort, CS-MO-0), this cell is about the explicit selection.
    val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.NonPersistentNonPartitioned)
    val cs = ConsumerSessionPage(page)

    cs.openForTopic(t, ns, topic, persistency = "non-persistent")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.play()
    assertThat(page.getByTestId("cs-replay-caught-up"))
      .isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)
    assert(cs.loadedCount == 0, s"an empty replay delivers nothing, got ${cs.loadedCount}")

    // A word published into the pause is GONE - a non-persistent topic keeps no history for any
    // later chunk to replay - and the paused view says exactly that.
    fixtures.produceRoundRobin(Seq(fqn), Seq("live"))
    page.waitForTimeout(2000) // ample time to be wrong, then assert nothing arrived
    assert(cs.loadedCount == 0, s"a paused session on a non-persistent topic must deliver nothing, got ${cs.loadedCount}")
    assertThat(page.getByTestId("cs-paused-non-persistent-note")).isVisible()
  }

  test("CS-MO-1: a two-topic history replay is DELIVERED in global publish-time order") {
    // The discriminating case: two backlogs read by two racing consumers. Without the merge the
    // delivery order is whatever the readers' interleaving happens to be - with 7+7 messages the
    // chance of it landing exactly alternating is nil - so this asserts the merge, not luck.
    val values = (0 until 14).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(values.size)

    val delivered = deliveredValues(values.size)
    assert(delivered == values.toList, s"delivered order was $delivered, expected ${values.toList}")
    // The mode announces itself: the toolbar chip is on for a best-effort-ordered session, and an
    // ordered run confesses no late deliveries.
    assertThat(page.getByTestId("cs-order-chip")).isVisible()
    assertThat(page.getByTestId("cs-order-late")).not().isVisible()
  }

  test("CS-MO-2: the live tail comes out ordered too - the reorder grace at work") {
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(Seq.empty)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Latest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.assertState("running")

    val values = (0 until 8).map(i => f"live-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), values)
    cs.awaitLoaded(values.size)

    val delivered = deliveredValues(values.size)
    assert(delivered == values.toList, s"delivered order was $delivered, expected ${values.toList}")
  }

  test("CS-MO-3: skip-n WITH merge keeps the cut exact and the remainder ordered") {
    // The two promises composed end to end: exactly the globally-first 12 are dropped, and what
    // survives arrives merged - the same session, both counted and ordered.
    val values = (0 until 20).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("12")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(8)

    val delivered = deliveredValues(8)
    assert(delivered == values.drop(12).toList, s"delivered $delivered, expected ${values.drop(12).toList}")
    assert(cs.loadedCount == 8, s"the cut must deliver exactly 8, got ${cs.loadedCount}")
  }

  test("CS-MO-4: Fastest delivers every message once without engaging the merge") {
    // The control: no order is asserted - arrival interleaving is the broker's business - only
    // that every message arrives exactly once with the merge NOT engaged.
    val values = (0 until 14).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(fastestLabel)
    cs.play()
    cs.awaitLoaded(values.size)

    val delivered = deliveredValues(values.size)
    assert(delivered.sorted == values.toList, s"every message must arrive exactly once, got $delivered")
    // No chip for Fastest: the ordering layer is off, so nothing announces it.
    assertThat(page.getByTestId("cs-order-chip")).not().isVisible()
  }

  test("CS-MO-5: LATEST-N with merge - the metadata-resolved cut composes with ordered delivery") {
    // Latest-n never touches the streaming merge for its cut (it is resolved from entry metadata
    // before anything is delivered); the merge orders whatever the anchors then stream. The two
    // must compose: exactly the globally-last 8, and in publish-time order.
    val values = (0 until 20).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("8")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(8)

    val delivered = deliveredValues(8)
    assert(delivered == values.drop(12).toList, s"delivered $delivered, expected ${values.drop(12).toList}")
  }

  test("CS-MO-6: a MIXED persistent/non-persistent session merges too - live-only streams join at the tail") {
    // A non-persistent topic retains nothing, so it can only ever speak from now on; the merge
    // must treat it as one more stream with no history, not wedge waiting for a backlog that
    // cannot exist. Old history first, then the live batch, ordered.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB, fqnB) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.NonPersistentNonPartitioned)
    val backlog = (0 until 6).map(i => f"old-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA), backlog)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.assertState("running")

    val live = (0 until 6).map(i => f"live-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), live)
    cs.awaitLoaded(backlog.size + live.size)

    val delivered = deliveredValues(backlog.size + live.size)
    assert(
      delivered == (backlog ++ live).toList,
      s"delivered $delivered, expected ${(backlog ++ live).toList}"
    )
  }

  test("CS-MO-G1: GUARANTEED replays two topics COMPLETELY in exact key order, then auto-pauses caught up") {
    val values = (0 until 14).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.play()
    // The exact replay delivers EVERYTHING recorded up to Play - the globally-last message
    // included, which the old contract held forever (observed 2026-08-09: 14 arrived where 13
    // were expected) - and then auto-pauses at the boundary with the caught-up banner.
    cs.awaitLoaded(values.size)
    assertThat(page.getByTestId("cs-replay-caught-up")).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)

    val delivered = deliveredValues(values.size)
    assert(delivered == values.toList, s"delivered $delivered, expected ${values.toList}")
    assertThat(page.getByTestId("cs-order-chip")).isVisible()
    assert(
      page.getByTestId("cs-order-chip").textContent().contains("Replaying history - exact order"),
      "the chip must name the replay"
    )
    cs.stop()
  }

  test("CS-MO-G2: GUARANTEED is an exact replay - words after Play wait for the NEXT chunk, and Resume replays the delta") {
    val seeds = (0 until 4).map(i => f"seed-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(seeds)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.play()
    // The whole recorded range replays (observed 2026-08-09: 4 arrived where the old hold
    // expected 3), then the boundary pause.
    cs.awaitLoaded(seeds.size)
    assertThat(page.getByTestId("cs-replay-caught-up")).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)

    // A speaks PAST the boundary: recorded for the next chunk, delivered into this one never -
    // give the pipeline ample time to be wrong, then assert it was not.
    fixtures.produceRoundRobin(Seq(fqnA), (0 until 3).map(i => f"a-only-$i%02d"))
    page.waitForTimeout(3000)
    assert(cs.loadedCount == seeds.size, s"nothing past the boundary may enter this chunk, got ${cs.loadedCount} loaded")

    // Resume extends the boundary to now and replays the delta - exactly the three new words,
    // in key order behind the seeds.
    page.getByTestId("cs-replay-resume").click()
    cs.awaitLoaded(seeds.size + 3)
    assertThat(page.getByTestId("cs-replay-caught-up")).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)
    val delivered = deliveredValues(seeds.size + 3)
    val expected = (seeds ++ (0 until 3).map(i => f"a-only-$i%02d")).toList
    assert(delivered == expected, s"delivered $delivered, expected $expected")
    cs.stop()
  }

  test("CS-MO-T1: GUARANTEED over BATCHED data with real publish-time TIES follows the documented tiebreak - the replay completes, then pauses caught up") {
    // Production data is batched, and every message in a batch shares ONE publish timestamp - so
    // publish-time ties are the norm out there, while every other ordering arrangement in this
    // suite tick-separates its sends precisely so that ties can never occur. This is the one cell
    // where they exist on both axes at once: WITHIN each stream (a batch is one publish time) and
    // ACROSS the two streams (the fixture retries until an A-batch and a B-batch land on the same
    // millisecond, and throws rather than run tie-free).
    //
    // The contract is the documented total order, MessageOrderKey:
    // (order time, topic FQN, ledger id, entry id, batch index) - publish time first, then topic,
    // then position within the log. Within one topic that collapses to append order, so the
    // expectation is the two append-ordered read-backs merged by (publish time, topic FQN) with a
    // stable sort - entirely broker-derived, never produce-order guessing. The replay contract
    // delivers the WHOLE recorded set in that order (observed 2026-08-09: all 16 arrived where
    // the old held-tail expectation said 12) and then auto-pauses at the boundary.
    //
    // What fails here [bite-checked against the running app]:
    //   - a replay barrier that cannot emit while two stream heads SHARE a timestamp (the
    //     "< vs <=" stall): delivery stops short of the expectation and the await times out;
    //   - a tiebreak that is not the documented one, or that is non-deterministic: the delivered
    //     sequence differs from the computed order;
    //   - a leak past the replay boundary or a duplicate: deliveredValues collects MORE rows than
    //     expected and its exact-count assertion fails.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    val (valuesA, valuesB) = fixtures.produceTiedBatches(fqnA, fqnB, messagesPerBatch = 4)

    // The broker-derived expectation: everything, merged by (publish time, topic FQN).
    val merged =
      (fixtures.readAllMessages(fqnA).map(m => (m.getPublishTime, fqnA, m.getValue)) ++
        fixtures.readAllMessages(fqnB).map(m => (m.getPublishTime, fqnB, m.getValue)))
        .sortBy { case (time, fqn, _) => (time, fqn) } // stable: same-key entries keep append order
    assert(merged.size == valuesA.size + valuesB.size, s"read-back lost messages: ${merged.map(_._3)}")

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.setOrderTime("Publish time")
    cs.play()
    cs.awaitLoaded(merged.size)
    assertThat(page.getByTestId("cs-replay-caught-up")).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)

    val delivered = deliveredValues(merged.size)
    val expectedDelivered = merged.map(_._3).toList
    assert(delivered == expectedDelivered, s"delivered order was $delivered, expected $expectedDelivered")
    assertThat(page.getByTestId("cs-order-chip")).isVisible()
    cs.stop()
  }

  test("CS-MO-K1: ordering by EVENT TIME follows the application's clock, not the producers'") {
    // Event times ASCEND within each stream (the merge preserves per-stream append order by
    // contract - it never re-sorts inside a log) but INTERLEAVE differently from publish order:
    // A carries the odd event times, B the even ones, and A always publishes first. Publish-time
    // or arrival ordering would deliver e-01 first; event-time ordering must deliver e-00.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    val eventBase = 1_700_000_000_000L
    val produced = Vector(1, 0, 3, 2, 5, 4).map(i => (f"e-$i%02d", eventBase + i * 1000L))
    val producerA = fixtures.client.newProducer(org.apache.pulsar.client.api.Schema.STRING).topic(fqnA).enableBatching(false).create()
    val producerB = fixtures.client.newProducer(org.apache.pulsar.client.api.Schema.STRING).topic(fqnB).enableBatching(false).create()
    try
      produced.zipWithIndex.foreach { case ((v, eventTime), i) =>
        val producer = if i % 2 == 0 then producerA else producerB
        producer.newMessage().value(v).eventTime(eventTime).send()
        Thread.sleep(2)
      }
    finally
      producerA.close()
      producerB.close()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.setOrderTime("Event time")
    cs.play()
    cs.awaitLoaded(produced.size)

    val delivered = deliveredValues(produced.size)
    val expected = (0 until 6).map(i => f"e-$i%02d").toList // ascending EVENT time
    assert(delivered == expected, s"delivered $delivered, expected event-time order $expected")
    assert(page.getByTestId("cs-order-chip").textContent().contains("Event time"), "the chip must name the time")
  }

  test("CS-MO-K2: BROKER publish time on a broker without entry metadata is refused with the remediation") {
    // The no-admin-steps contract: Dekaf never requires broker configuration - it detects the
    // gap and names exactly what an administrator WOULD change, and where.
    val values = (0 until 4).map(i => f"m-$i%02d")
    val (fqnA, fqnB, (t, ns, topic)) = twoToppedUpTopics(values)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.setOrderTime("Broker publish time")
    cs.play()

    assertThat(page.getByText("Broker publish time is unavailable").first()).isVisible(vis(15000))
    assert(cs.loadedCount == 0, s"a refused session must deliver nothing, got ${cs.loadedCount}")
  }

  test("CS-MO-8: a SINGLE-STREAM session builds no ordering layer - and the chip does not pretend it did") {
    // The config may ask for best-effort order, but one resolved delivery stream is already in
    // order: the server builds no layer, pays no reorder latency, and says so on the wire. A
    // chip claiming a window that does not exist would be exactly the kind of latency folklore
    // this feature must not create.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 5)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(5)

    assertThat(page.getByTestId("cs-order-chip")).not().isVisible()
  }

  test("CS-MO-7: LOAD - 20 partitions, 40,000 messages through the merge, delivered completely and on time") {
    // The throughput half of the wide-session story on a real broker: a partitioned topic is 20
    // delivery streams racing through one continuous merge. The oracle is completion within the
    // timeout - a wedged or quadratic merge fails this by never finishing - plus the mode's chip.
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = s"load-${System.currentTimeMillis()}"
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.admin.topics().createPartitionedTopic(fqn, 20)
    fixtures.produceStringsFast(fqn, 40000)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(bestEffortLabel)
    cs.play()
    cs.awaitLoaded(40000, timeoutMs = 120000)

    assert(cs.loadedCount == 40000, s"every message must arrive, got ${cs.loadedCount}")
    assertThat(page.getByTestId("cs-order-chip")).isVisible()
    assert(cs.state == "running", s"the session must still be healthy, got '${cs.state}'")
    cs.stop()
  }
