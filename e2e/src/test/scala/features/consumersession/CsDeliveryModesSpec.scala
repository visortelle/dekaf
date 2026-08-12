package features.consumersession

import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import harness.Eventually.eventually

/** THE DELIVERY-ORDER x TOPIC-LIVENESS MATRIX - now aligned with the GUARANTEED EXACT-REPLAY
  * contract (owner decision 2026-08-09; the hold-forever behavior these cells used to pin is
  * gone, and with it the PINS markers that guarded it).
  *
  * Every cell crosses one topic-liveness state with one delivery-order mode, and EVERY test pins
  * its mode EXPLICITLY through the UI control (`cs-delivery-order`, driven by label). No test in
  * this file depends on the session default: the matrix must keep meaning the same thing whichever
  * mode the owner makes the default. (`CsMergeOrderSpec` CS-MO-0 is the one test that pins what
  * the default IS.)
  *
  * The liveness states:
  *   - A  ALL LIVE:   every stream keeps receiving while the session runs.
  *   - B  ALL STATIC: backlog exists, nothing new arrives after Play.
  *   - C  MIXED:      one stream keeps receiving, the other stopped before Play.
  *   - D  EDGES:      empty-from-birth partitions (D1), a static topic that becomes live again
  *                    (D2), a single stream (D3), Guaranteed refusing a non-persistent stream
  *                    (D4), the caught-up pause's one-click switch to Best effort (D5), and
  *                    broker ownership churn via topic unload (D6).
  *   - R  REPLAY:     the replay contract's own cells - the banner's content (R1), the
  *                    resume-extends-the-chunk mechanism (R2), and the Latest x Guaranteed gate
  *                    (R3).
  *
  * The mode contracts asserted, per cell:
  *   - FASTEST: every produced message exactly once (the identity oracle below); NO order
  *     assertion anywhere - Fastest is the absence of the merge, and arrival interleaving is the
  *     broker's business, not a promise.
  *   - BEST EFFORT: every message exactly once, in global publish-time order wherever timestamps
  *     are distinct (every arrangement here ticks its sends apart); STATIC TAILS MUST COMPLETE -
  *     the bounded reorder grace (mergeTopicsGraceMs + one sweep, ~0.75s) releases them.
  *   - GUARANTEED: an EXACT REPLAY. Play captures every stream's recorded end; the session
  *     delivers everything recorded up to that boundary - of what retention still holds - in
  *     strict key order, then AUTO-PAUSES with the caught-up banner (`cs-replay-caught-up`) on
  *     the ordinary paused state. A message published AFTER Play belongs to the NEXT chunk: it is
  *     handed back and its consumer held, never delivered into the current chunk. "Load new messages" extends
  *     the boundary to now and replays the delta exactly; "Switch to Best effort and follow live" is the
  *     designed way OUT of the replay into live following. No live phase, no stall, no held tail:
  *     a drained or empty stream holds nothing back, because history needs no proof from the
  *     future.
  *
  * THE IDENTITY ORACLE is the exact MULTISET, never a count: `ConsumerSessionPage.exportedValues`
  * (the app's own bulk export of every retained row, on a paused session) compared through
  * `DeliveredMessages.assertExactly`, so one loss plus one duplicate cannot cancel out. Where a
  * mode promises order, arrival order is read separately via `allColumnValues` (ordinal-keyed
  * walk of the whole virtualized table).
  *
  * SEAM VIOLATIONS (a producer-clock reversal across a resume seam) need controlled clock skew
  * and are pinned at the unit tier. What IS e2e-checkable, and asserted in every replay/resume
  * cell that pauses at a boundary: ordinary chunked flows raise ZERO seam flags - the session
  * warning mark (`cs-order-warning`, which carries the seam count under Guaranteed since the
  * 2026-08-11 toolbar rework) stays absent and no row carries the marker.
  *
  * WAITS are deterministic: sentinel/count gating (`awaitLoaded` on totals whose last message is
  * the sentinel), the caught-up banner itself as the app's own "the replay reached its boundary"
  * disclosure, and `settledLoaded`'s bounded quiet window (~1.2s, justified in StartFromSupport)
  * ONLY for asserting "nothing more arrives".
  */
class CsDeliveryModesSpec extends StartFromSupport:

  private def vis(timeoutMs: Double) = new LocatorAssertions.IsVisibleOptions().setTimeout(timeoutMs)

  private val fastestLabel = "Fastest"
  private val bestEffortLabel = "Best effort"
  private val guaranteedLabel = "Guaranteed"

  private def waitingChip = page.getByTestId("cs-order-waiting")

  // The replay surface (the landed redesign's own test-ids).
  private def caughtUpBanner = page.getByTestId("cs-replay-caught-up")
  private def bannerExcludedLine = page.getByTestId("cs-replay-caught-up-excluded")
  // Labelled "Load new messages up to now"; the testid keeps the older `resume` wording because
  // that is what the action still IS - a resume that extends the boundary.
  private def loadNewMessages = page.getByTestId("cs-replay-resume")
  private def bannerContinueBestEffort = page.getByTestId("cs-replay-continue-best-effort")
  // Since 2026-08-11 the session-level count rides the warning mark beside the loaded counter.
  private def seamChip = page.getByTestId("cs-order-warning")
  private def seamMarkers = page.getByTestId("cs-out-of-order-marker")

  /** Two fresh single-log topics; every multi-TOPIC cell arranges on this shape because it gives
    * the test an independent producer handle per stream - liveness is then a per-stream choice. */
  private def twoFreshTopics(): (String, String, (String, String, String)) =
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    (s"persistent://$tA/$nsA/$topicA", s"persistent://$tB/$nsB/$topicB", (tA, nsA, topicA))

  private def partitionFqns(parentFqn: String, partitions: Int): Seq[String] =
    (0 until partitions).map(i => s"$parentFqn-partition-$i")

  /** Open a two-topic session with the mode under test pinned through the control. */
  private def openTwoTopicSession(parts: (String, String, String), fqns: Seq[String], mode: String): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(parts._1, parts._2, parts._3)
    cs.setTargetTopicsSpecific(fqns)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(mode)
    cs

  /** Pause (a running session cannot export its whole retained set) and return the identity
    * oracle: the exact multiset of every value the session delivered, from the app's own export.
    * A session the replay boundary already auto-paused is exported as-is. */
  private def pausedExportedSet(cs: ConsumerSessionPage): List[String] =
    if cs.state == "running" then
      cs.pauseFromToolbar()
      cs.assertState("paused", timeoutMs = 10000)
    cs.exportedValues()

  /** Arrival-order oracle: (ordinal, value) pairs off the whole virtualized table. Read on a
    * paused session so the walk does not race the auto-scroll. */
  private def assertArrivalOrder(cs: ConsumerSessionPage, expected: Seq[String], what: String): Unit =
    val delivered = cs.allColumnValues("value")
    assert(delivered == expected.toList, s"$what: delivered order was $delivered\n  expected ${expected.toList}")

  /** "Nothing more arrives": the loaded counter, once quiet (settledLoaded's bounded window),
    * must equal `expected` - with the observed value in the failure so a leak or a shortfall is
    * named, not just detected. */
  private def assertSettledLoaded(cs: ConsumerSessionPage, expected: Int, why: String): Unit =
    val settled = settledLoaded(cs)
    assert(settled == expected, s"$why: the counter settled at $settled, expected $expected")

  /** The replay boundary, observed through the app's own disclosure: exactly `expectedLoaded`
    * messages are on the counter, the caught-up banner is up, and the session sits on the
    * ORDINARY paused state (the auto-pause is the same state the pause button reaches). */
  private def awaitCaughtUp(cs: ConsumerSessionPage, expectedLoaded: Int, timeoutMs: Double = 30000): Unit =
    cs.awaitLoaded(expectedLoaded, timeoutMs)
    assertThat(caughtUpBanner).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)

  /** Ordinary replay/resume flows must raise NO seam flags: the session-level counter chip is the
    * authoritative signal (it rides the stats channel, not the virtualized rows); the mounted-row
    * markers are checked on top. */
  private def assertNoSeamViolations(): Unit =
    assertThat(seamChip).not().isVisible()
    assert(seamMarkers.count() == 0, s"expected no seam-violation row markers, found ${seamMarkers.count()}")

  /** Values of the rows carrying the switch-point divider badge, across the WHOLE virtualized
    * table (the badge sits on the row's sticky publish-time cell, so a viewport read could miss
    * it). Same walk as `allColumnValues`; call on a paused session. */
  private def switchPointRowValues(): List[String] =
    val json = page
      .evaluate(
        """async () => {
          |  const table = document.querySelector("[data-testid='cs-table']");
          |  if (!table) return "[]";
          |  const found = new Map();
          |  const harvest = () => {
          |    for (const r of table.querySelectorAll("tbody tr")) {
          |      const badge = r.querySelector("[data-testid='cs-order-switch-point']");
          |      const ord = r.querySelector("[data-testid='cs-message']");
          |      const cell = r.querySelector("[data-testid='cs-cell-value']");
          |      if (badge && ord && cell) found.set(parseInt(ord.innerText.trim(), 10), cell.innerText.trim());
          |    }
          |  };
          |  harvest();
          |  const s = table.querySelector("[data-virtuoso-scroller]");
          |  const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
          |  if (s && s.scrollHeight > s.clientHeight + 2) {
          |    let target = 0;
          |    let guard = 0;
          |    while (guard < 300) {
          |      guard += 1;
          |      s.scrollTop = target;
          |      await frame();
          |      harvest();
          |      if (target >= s.scrollHeight - s.clientHeight - 2) break;
          |      target = Math.min(target + s.clientHeight * 0.8, s.scrollHeight - s.clientHeight);
          |    }
          |  }
          |  return JSON.stringify(Array.from(found.entries()).sort((a, b) => a[0] - b[0]).map(e => e[1]));
          |}""".stripMargin
      )
      .toString
    val mapper = new com.fasterxml.jackson.databind.ObjectMapper()
    val root = mapper.readTree(json)
    (0 until root.size()).toList
      .map(root.get(_).asText().trim)
      .map(v => if v.length >= 2 && v.startsWith("\"") && v.endsWith("\"") then v.substring(1, v.length - 1) else v)

  // =============================================================================================
  // CELL A - ALL LIVE. Two topics (a live producer handle per stream); both receive during the
  // session. Distinct publish times come from produceRoundRobin's inter-send clock tick, so the
  // global publish-time order IS the production order and the ordered cells can assert a full
  // sequence rather than a set.
  // =============================================================================================

  private val liveSeeds = (0 until 6).map(i => f"m-$i%02d")
  private val liveTail = (0 until 8).map(i => f"l-$i%02d")

  test("CS-DM-AF [ALL LIVE x Fastest]: every message from two live topics arrives exactly once - interleaving unasserted") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveSeeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), fastestLabel)
    cs.play()
    cs.assertState("running")

    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveTail) // both streams live DURING the session
    cs.awaitLoaded(liveSeeds.size + liveTail.size)
    assertSettledLoaded(cs, liveSeeds.size + liveTail.size, "Fastest must deliver exactly once - the counter may not keep climbing")
    // NO order assertion, deliberately: Fastest builds no merge, so arrival interleaving is
    // whatever the two racing consumers produced - asserting any order would pin luck.
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible() // no ordering layer, so nothing to confess
    DeliveredMessages.assertExactly(pausedExportedSet(cs), liveSeeds ++ liveTail, "A-F delivered multiset")
  }

  test("CS-DM-AB [ALL LIVE x Best effort]: every message exactly once, in global publish-time order") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveSeeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), bestEffortLabel)
    cs.play()
    cs.assertState("running")

    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveTail)
    cs.awaitLoaded(liveSeeds.size + liveTail.size)
    assertSettledLoaded(cs, liveSeeds.size + liveTail.size, "Best effort must deliver exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible() // an ordered live run confesses no out-of-order deliveries
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, liveSeeds ++ liveTail, "A-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), liveSeeds ++ liveTail, "A-B delivered multiset")
  }

  test("CS-DM-AG [ALL LIVE x Guaranteed]: live traffic arrives in CHUNKS - Play's recorded range replays, later traffic waits for the next boundary") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveSeeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), guaranteedLabel)
    cs.play()
    // Chunk 1 is everything recorded up to Play: all six seeds - including the globally-last one,
    // which the old contract held forever - then the boundary auto-pause with the banner.
    awaitCaughtUp(cs, liveSeeds.size)
    // (The chip label that used to name the replay here was removed 2026-08-11 with the always-on
    // mode text; the caught-up banner awaitCaughtUp asserts IS the replay's announcement.)

    // Live traffic published after Play is recorded PAST the boundary: none of it may deliver
    // into this chunk, however long it sits on the broker.
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveTail)
    assertSettledLoaded(cs, liveSeeds.size, "post-Play traffic belongs to the NEXT chunk - nothing may leak past the boundary")
    DeliveredMessages.assertExactly(cs.exportedValues(), liveSeeds, "A-G first-chunk multiset")

    // "Load new messages" extends the boundary to now: the whole tail replays as chunk 2, exactly once, and
    // the session catches up again.
    loadNewMessages.click()
    awaitCaughtUp(cs, liveSeeds.size + liveTail.size)
    assertSettledLoaded(cs, liveSeeds.size + liveTail.size, "the delta must replay exactly once")
    assertNoSeamViolations()
    assertArrivalOrder(cs, liveSeeds ++ liveTail, "A-G arrival order across both chunks")
    DeliveredMessages.assertExactly(cs.exportedValues(), liveSeeds ++ liveTail, "A-G delivered multiset")
  }

  // =============================================================================================
  // CELL B - ALL STATIC. One 3-partition topic: the one-click "browse this topic" shape where the
  // delivery-mode decision bites hardest, and a partitioned topic is several delivery streams
  // without any multi-topic setup. Backlog is spread round-robin across the partition FQNs with
  // ticked sends, so every partition holds part of it (asserted) and publish times are globally
  // distinct.
  // =============================================================================================

  private val staticBacklog = (0 until 12).map(i => f"m-$i%02d")

  /** Fresh 3-partition topic with `staticBacklog` spread p0,p1,p2,p0,... - deterministic slices:
    * p0 = indexes 0,3,6,9; p1 = 1,4,7,10; p2 = 2,5,8,11. The premise (every partition non-empty)
    * is asserted against the broker rather than trusted. */
  private def staticPartitionedTopic(): (String, String, String, String) =
    val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.PersistentPartitioned)
    fixtures.produceRoundRobin(partitionFqns(fqn, 3), staticBacklog)
    partitionFqns(fqn, 3).foreach { p =>
      val held = fixtures.readAllMessages(p).map(_.getValue)
      assert(held.size == staticBacklog.size / 3, s"the arrangement did not land on $p: $held")
    }
    (t, ns, topic, fqn)

  private def openPartitionedSession(t: String, ns: String, topic: String, mode: String): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(mode)
    cs

  test("CS-DM-BF [ALL STATIC x Fastest]: the whole backlog arrives exactly once") {
    val (t, ns, topic, _) = staticPartitionedTopic()
    val cs = openPartitionedSession(t, ns, topic, fastestLabel)
    cs.play()
    cs.awaitLoaded(staticBacklog.size)
    assertSettledLoaded(cs, staticBacklog.size, "Fastest must deliver the backlog exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    // NO order assertion: Fastest promises none (see cell A-F).
    DeliveredMessages.assertExactly(pausedExportedSet(cs), staticBacklog, "B-F delivered multiset")
  }

  test("CS-DM-BB [ALL STATIC x Best effort]: the static backlog COMPLETES, in global publish-time order - the grace releases every tail") {
    val (t, ns, topic, _) = staticPartitionedTopic()
    val cs = openPartitionedSession(t, ns, topic, bestEffortLabel)
    cs.play()
    // THE static-tail pin: nothing new will ever arrive, and Best effort must still deliver
    // everything - each partition's tail is released by the bounded reorder grace, not by traffic.
    cs.awaitLoaded(staticBacklog.size)
    assertSettledLoaded(cs, staticBacklog.size, "Best effort must deliver the backlog exactly once")
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, staticBacklog, "B-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), staticBacklog, "B-B delivered multiset")
  }

  test("CS-DM-BG [ALL STATIC x Guaranteed]: the WHOLE backlog replays - no held tail - and the session auto-pauses caught up") {
    val (t, ns, topic, _) = staticPartitionedTopic()
    val cs = openPartitionedSession(t, ns, topic, guaranteedLabel)
    cs.play()
    // The replay contract on the shape the old contract punished hardest: p0 draining after m-09
    // holds NOTHING back - m-10 and m-11 are recorded history and need no proof from p0's future.
    // All 12 deliver, then the boundary auto-pause with the banner on the ordinary paused state.
    awaitCaughtUp(cs, staticBacklog.size)
    // No stall was ever disclosed, because no stall exists to disclose.
    assertThat(waitingChip).not().isVisible()
    assertSettledLoaded(cs, staticBacklog.size, "the replay must deliver the backlog exactly once and then stop at the boundary")
    // Banner content on a topic with NOTHING past the boundary: the newer-entries line and the
    // excluded-topics line say nothing, because a zero is silence, not a claim (R1 pins the
    // positive halves).
    assertThat(bannerExcludedLine).not().isVisible()
    assertNoSeamViolations()
    assertArrivalOrder(cs, staticBacklog, "B-G arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), staticBacklog, "B-G delivered multiset")
  }

  // =============================================================================================
  // CELL C - MIXED. Two topics: S stopped before Play (its share of the backlog is its last
  // word), L keeps receiving during the session. Backlog round-robin S,L,S,L... so S = even
  // indexes (b-00..b-06), L = odd (b-01..b-07).
  // =============================================================================================

  private val mixedBacklog = (0 until 8).map(i => f"b-$i%02d")
  private val mixedLive = (0 until 6).map(i => f"l-$i%02d")

  test("CS-DM-CF [MIXED x Fastest]: backlog of both plus the live tail, exactly once") {
    val (fqnS, fqnL, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnS, fqnL), mixedBacklog)
    val cs = openTwoTopicSession(parts, Seq(fqnS, fqnL), fastestLabel)
    cs.play()
    cs.assertState("running")
    fixtures.produceRoundRobin(Seq(fqnL), mixedLive) // only L is live
    cs.awaitLoaded(mixedBacklog.size + mixedLive.size)
    assertSettledLoaded(cs, mixedBacklog.size + mixedLive.size, "Fastest must deliver exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    // NO order assertion: Fastest promises none.
    DeliveredMessages.assertExactly(pausedExportedSet(cs), mixedBacklog ++ mixedLive, "C-F delivered multiset")
  }

  test("CS-DM-CB [MIXED x Best effort]: the stopped topic's tail completes and the live topic keeps flowing, all in order") {
    val (fqnS, fqnL, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnS, fqnL), mixedBacklog)
    val cs = openTwoTopicSession(parts, Seq(fqnS, fqnL), bestEffortLabel)
    cs.play()
    // The static half's tail (b-07 has no S successor) must complete on the grace alone.
    cs.awaitLoaded(mixedBacklog.size)
    fixtures.produceRoundRobin(Seq(fqnL), mixedLive)
    cs.awaitLoaded(mixedBacklog.size + mixedLive.size)
    assertSettledLoaded(cs, mixedBacklog.size + mixedLive.size, "Best effort must deliver exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, mixedBacklog ++ mixedLive, "C-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), mixedBacklog ++ mixedLive, "C-B delivered multiset")
  }

  test("CS-DM-CG [MIXED x Guaranteed]: the stopped topic holds nothing back - the recorded range replays whole; the live tail is the next chunk") {
    val (fqnS, fqnL, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnS, fqnL), mixedBacklog)
    val cs = openTwoTopicSession(parts, Seq(fqnS, fqnL), guaranteedLabel)
    cs.play()
    // The whole recorded range delivers - b-07 included, which the old contract held behind S's
    // silence - then the boundary auto-pause.
    awaitCaughtUp(cs, mixedBacklog.size)
    assertThat(waitingChip).not().isVisible()

    // L keeps speaking - PAST the boundary, so none of it may appear in this chunk.
    fixtures.produceRoundRobin(Seq(fqnL), mixedLive)
    assertSettledLoaded(cs, mixedBacklog.size, "post-Play traffic on L belongs to the next chunk")
    DeliveredMessages.assertExactly(cs.exportedValues(), mixedBacklog, "C-G first-chunk multiset")

    // "Load new messages": the boundary extends to now and the accumulated delta replays exactly once.
    loadNewMessages.click()
    awaitCaughtUp(cs, mixedBacklog.size + mixedLive.size)
    assertSettledLoaded(cs, mixedBacklog.size + mixedLive.size, "the delta must replay exactly once")
    assertNoSeamViolations()
    assertArrivalOrder(cs, mixedBacklog ++ mixedLive, "C-G arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), mixedBacklog ++ mixedLive, "C-G delivered multiset")
  }

  // =============================================================================================
  // CELL D1 - EDGE: partitions EMPTY FROM BIRTH. One 3-partition topic, backlog on p0 only;
  // p1/p2 have never held a message (asserted). Under the old contract this was the
  // out-of-the-box stall; under the replay contract an empty recorded range is TRIVIALLY
  // FINISHED, so the empty partitions cost nothing at all.
  // =============================================================================================

  private val d1Backlog = (0 until 8).map(i => f"b-$i%02d")

  private def emptyPartitionTopic(): (String, String, String, String) =
    val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.PersistentPartitioned)
    fixtures.produceRoundRobin(Seq(s"$fqn-partition-0"), d1Backlog)
    Seq(1, 2).foreach { i =>
      val held = fixtures.readAllMessages(s"$fqn-partition-$i")
      assert(held.isEmpty, s"partition $i must be empty from birth, holds ${held.map(_.getValue)}")
    }
    (t, ns, topic, fqn)

  test("CS-DM-D1F [EMPTY PARTITIONS x Fastest]: empty partitions cost nothing - the backlog arrives exactly once") {
    val (t, ns, topic, _) = emptyPartitionTopic()
    val cs = openPartitionedSession(t, ns, topic, fastestLabel)
    cs.play()
    cs.awaitLoaded(d1Backlog.size)
    assertSettledLoaded(cs, d1Backlog.size, "Fastest must deliver the backlog exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    // NO order assertion: Fastest promises none.
    DeliveredMessages.assertExactly(pausedExportedSet(cs), d1Backlog, "D1-F delivered multiset")
  }

  test("CS-DM-D1B [EMPTY PARTITIONS x Best effort]: an empty partition cannot hold delivery - everything arrives in order") {
    val (t, ns, topic, _) = emptyPartitionTopic()
    val cs = openPartitionedSession(t, ns, topic, bestEffortLabel)
    cs.play()
    cs.awaitLoaded(d1Backlog.size)
    assertSettledLoaded(cs, d1Backlog.size, "Best effort must deliver the backlog exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, d1Backlog, "D1-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d1Backlog, "D1-B delivered multiset")
  }

  test("CS-DM-D1G [EMPTY PARTITIONS x Guaranteed]: empty partitions are trivially finished - the backlog replays in full, no stall, caught up") {
    val (t, ns, topic, fqn) = emptyPartitionTopic()
    val cs = openPartitionedSession(t, ns, topic, guaranteedLabel)
    cs.play()
    // The old contract stalled here forever, showing nothing; the replay contract's answer: a
    // stream that recorded nothing has nothing to replay and is never waited for. The whole
    // backlog delivers, and the session catches up promptly.
    awaitCaughtUp(cs, d1Backlog.size)
    assertThat(waitingChip).not().isVisible()
    assertSettledLoaded(cs, d1Backlog.size, "the empty partitions must not hold or duplicate anything")

    // One ticked word per partition INTO the pause (r-00 lands on p0, r-01/r-02 give the
    // never-spoken partitions their first words) - all three are past the boundary, so all three
    // wait for the next chunk together.
    val release = (0 until 3).map(i => f"r-$i%02d")
    fixtures.produceRoundRobin(partitionFqns(fqn, 3), release)
    assertSettledLoaded(cs, d1Backlog.size, "pause-window words belong to the next chunk")

    // "Load new messages": all three deliver - the formerly-empty partitions join the replay like any other
    // stream, in key order.
    loadNewMessages.click()
    awaitCaughtUp(cs, d1Backlog.size + release.size)
    assertSettledLoaded(cs, d1Backlog.size + release.size, "the delta must replay exactly once")
    assertNoSeamViolations()
    assertArrivalOrder(cs, d1Backlog ++ release, "D1-G arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d1Backlog ++ release, "D1-G delivered multiset")
  }

  // =============================================================================================
  // CELL D2 - EDGE: a static topic BECOMES LIVE again. Two topics, four seeds round-robin
  // (A = m-00/m-02, B = m-01/m-03), then ONE more message to the topic that had finished. For
  // the replay contract this is the chunk rule at its sharpest: the late word is recorded PAST
  // the boundary, so it lands in the NEXT chunk - banner first, then "Load new messages" delivers it.
  // =============================================================================================

  private val d2Seeds = (0 until 4).map(i => f"m-$i%02d")

  test("CS-DM-D2F [STATIC-BECOMES-LIVE x Fastest]: the late word arrives like any other - everything exactly once") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d2Seeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), fastestLabel)
    cs.play()
    cs.awaitLoaded(d2Seeds.size)
    fixtures.produceRoundRobin(Seq(fqnA), Seq("x-00"))
    cs.awaitLoaded(d2Seeds.size + 1)
    assertSettledLoaded(cs, d2Seeds.size + 1, "Fastest must deliver exactly once")
    // NO order assertion: Fastest promises none.
    DeliveredMessages.assertExactly(pausedExportedSet(cs), d2Seeds :+ "x-00", "D2-F delivered multiset")
  }

  test("CS-DM-D2B [STATIC-BECOMES-LIVE x Best effort]: the finished topic's next word arrives promptly and in order") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d2Seeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), bestEffortLabel)
    cs.play()
    cs.awaitLoaded(d2Seeds.size) // the static tail completed on the grace alone
    fixtures.produceRoundRobin(Seq(fqnA), Seq("x-00"))
    cs.awaitLoaded(d2Seeds.size + 1) // and the new word itself is released by the grace, not by traffic
    assertSettledLoaded(cs, d2Seeds.size + 1, "Best effort must deliver exactly once")
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, d2Seeds :+ "x-00", "D2-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d2Seeds :+ "x-00", "D2-B delivered multiset")
  }

  test("CS-DM-D2G [STATIC-BECOMES-LIVE x Guaranteed]: the late word lands in the NEXT chunk - banner first, then 'Load new messages' delivers it, order intact") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d2Seeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), guaranteedLabel)
    cs.play()
    // All four seeds replay - m-03 included, which the old contract held against A's silence -
    // then the boundary auto-pause.
    awaitCaughtUp(cs, d2Seeds.size)
    assertThat(waitingChip).not().isVisible()

    // The finished topic speaks again - PAST the boundary. The word is recorded, safe, and NOT
    // delivered into this chunk.
    fixtures.produceRoundRobin(Seq(fqnA), Seq("x-00"))
    assertSettledLoaded(cs, d2Seeds.size, "the late word belongs to the next chunk")

    loadNewMessages.click()
    awaitCaughtUp(cs, d2Seeds.size + 1)
    assertSettledLoaded(cs, d2Seeds.size + 1, "the late word must deliver exactly once on 'Load new messages'")
    assertNoSeamViolations()
    assertArrivalOrder(cs, d2Seeds :+ "x-00", "D2-G arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d2Seeds :+ "x-00", "D2-G delivered multiset")
  }

  // =============================================================================================
  // CELL D3 - EDGE: a SINGLE non-partitioned topic. One delivery stream needs no MERGE - but the
  // replay boundary is not a merge property: Guaranteed builds its layer at ANY stream count,
  // because the boundary, the auto-pause and the caught-up signal live in it. So Fastest and
  // Best effort stay layer-free (no chip), while a static single topic under Guaranteed replays
  // and pauses caught-up like any other shape.
  // =============================================================================================

  private val d3Backlog = (0 until 6).map(i => f"m-$i%02d")

  private def singleStaticTopic(): (String, String, String) =
    val parts = fixtures.freshTopicParts()
    fixtures.produceRoundRobin(Seq(s"persistent://${parts._1}/${parts._2}/${parts._3}"), d3Backlog)
    parts

  private def openSingleTopicSession(parts: (String, String, String), mode: String): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(parts._1, parts._2, parts._3)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(mode)
    cs

  test("CS-DM-D3F [SINGLE TOPIC x Fastest]: the static backlog arrives exactly once, no layer, no chip") {
    val cs = openSingleTopicSession(singleStaticTopic(), fastestLabel)
    cs.play()
    cs.awaitLoaded(d3Backlog.size)
    assertSettledLoaded(cs, d3Backlog.size, "the backlog must deliver exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible()
    // NO order assertion: Fastest promises none, even where a single log would happen to provide it.
    DeliveredMessages.assertExactly(pausedExportedSet(cs), d3Backlog, "D3-F delivered multiset")
  }

  test("CS-DM-D3B [SINGLE TOPIC x Best effort]: one stream builds no layer - delivery is append order, nothing to confess") {
    val cs = openSingleTopicSession(singleStaticTopic(), bestEffortLabel)
    cs.play()
    cs.awaitLoaded(d3Backlog.size)
    assertSettledLoaded(cs, d3Backlog.size, "the backlog must deliver exactly once")
    assertThat(page.getByTestId("cs-order-warning")).not().isVisible() // no layer exists, nothing may claim one (CS-MO-8's contract, per mode)
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, d3Backlog, "D3-B arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d3Backlog, "D3-B delivered multiset")
  }

  test("CS-DM-D3G [SINGLE TOPIC x Guaranteed]: one stream still gets the replay boundary - the backlog replays, then the caught-up pause") {
    val cs = openSingleTopicSession(singleStaticTopic(), guaranteedLabel)
    cs.play()
    // The boundary is per-stream and positional, so it exists at ANY stream count: the single
    // static log replays completely and the session auto-pauses at its recorded end.
    awaitCaughtUp(cs, d3Backlog.size)
    // The boundary layer is real even for one stream: the caught-up banner asserted by
    // awaitCaughtUp is its announcement (the always-on chip label was removed 2026-08-11).
    assertSettledLoaded(cs, d3Backlog.size, "the backlog must deliver exactly once")
    assertNoSeamViolations()
    assertArrivalOrder(cs, d3Backlog, "D3-G arrival order")
    DeliveredMessages.assertExactly(cs.exportedValues(), d3Backlog, "D3-G delivered multiset")
  }

  // =============================================================================================
  // CELL D4 - EDGE: Guaranteed with a NON-PERSISTENT stream in a multi-stream session. A
  // non-persistent topic records nothing, so a multi-stream replay over it cannot mean anything:
  // the server refuses to build it, up front, with the remediation in the message. (A SINGLE
  // non-persistent stream is legal - instant caught-up, pinned by CS-MO-0B; Best effort on the
  // same mixed shape works - pinned by CS-MO-6.)
  // =============================================================================================

  test("CS-DM-D4G [NON-PERSISTENT x Guaranteed]: a mixed-persistency multi-stream session is REFUSED by name, and nothing is delivered") {
    val (tP, nsP, topicP) = fixtures.freshTopicParts()
    val fqnP = s"persistent://$tP/$nsP/$topicP"
    fixtures.produceRoundRobin(Seq(fqnP), (0 until 4).map(i => f"m-$i%02d"))
    val (_, _, _, fqnN) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.NonPersistentNonPartitioned)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tP, nsP, topicP)
    cs.setTargetTopicsSpecific(Seq(fqnP, fqnN))
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.play()

    // How the refusal surfaces: the server rejects the session CREATE (before any consumer is
    // built), and the client shows the server's reason - which names the offending topics and
    // both remediations.
    assertThat(page.getByText("Guaranteed ordering is not supported when merging non-persistent topics").first())
      .isVisible(vis(15000))
    assert(cs.loadedCount == 0, s"a refused session must deliver nothing, got ${cs.loadedCount}")
    assertSettledLoaded(cs, 0, "a refused session must stay silent")
    // Observed 2026-08-09 and pinned: the refusal leaves the session in 'new' - still on the
    // configuration view, so the user corrects the mode (or the targets) and presses Play again;
    // no consumer was ever built, nothing to stop or clean up.
    cs.assertState("new")
  }

  // =============================================================================================
  // CELL D5 - EDGE: the ONE-CLICK SWITCH, from the caught-up pause. The caught-up banner offers
  // "Switch to Best effort and follow live" - the designed transition out of the replay into live
  // following (SetDeliveryOrder on the live session; the only broker-level exercise of that
  // RPC). The pause-window traffic and everything after must arrive exactly once, and the FIRST
  // row delivered after the switch carries the divider badge (`cs-order-switch-point`) that
  // marks where the exact replay ends and the bounded-reorder live following begins.
  // =============================================================================================

  test("CS-DM-D5G [SWITCH]: 'Switch to Best effort and follow live' resumes live delivery from the caught-up pause - marked at the switch point, nothing lost or doubled") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    val recorded = (0 until 12).map(i => f"m-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), recorded)

    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), guaranteedLabel)
    cs.play()
    // Chunk 1: the whole recorded range, then the boundary pause.
    awaitCaughtUp(cs, recorded.size)

    // Traffic into the pause window: recorded past the boundary, waiting.
    val pauseWindow = (0 until 4).map(i => f"w-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), pauseWindow)
    assertSettledLoaded(cs, recorded.size, "pause-window traffic waits behind the boundary")

    // THE SWITCH. The granted SetDeliveryOrder releases the boundary holds and the session
    // follows live traffic under Best effort from here on.
    bannerContinueBestEffort.click()
    cs.awaitLoaded(recorded.size + pauseWindow.size)
    assertThat(caughtUpBanner).not().isVisible() // the replay state died with the barrier

    // And it IS live following now: a fresh round arrives promptly, nothing to click.
    val liveRound = (0 until 6).map(i => f"p-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), liveRound)
    val all = recorded ++ pauseWindow ++ liveRound
    cs.awaitLoaded(all.size)
    assertSettledLoaded(cs, all.size, "exactly once across the switch - no re-read, no duplicate")
    // The proof the session now RUNS Best effort is the switch-point divider on the first
    // post-switch row (asserted below) - the chip label that used to read the mode back was
    // removed 2026-08-11 with the always-on mode text.
    // NOT asserted here: the switch also writes Best effort back into the session CONFIG (so the
    // next Play keeps it). The config select only exists on the pre-Play configuration view
    // (`currentView` is 'configuration' only while the session is 'new'), so a running session
    // cannot show it; that write-through is pinned at the jest tier
    // (ConsumerSession.test.ts, the applyDeliveryOrder suite).

    // The toolbar rerenders every second (the live gauges), and one observed run lost this click
    // to a node swap (state stayed 'running', no 'pausing' ever recorded) - so the pause request
    // is re-issued while the state machine has provably not moved. Never clicked in 'pausing':
    // that click would be a resume.
    eventually(timeoutMs = 10000, intervalMs = 1500) {
      if cs.state == "running" then cs.pauseFromToolbar()
      assert(cs.state != "running", "the pause request has not been accepted yet")
    }
    cs.assertState("paused", timeoutMs = 10000)
    // THE SWITCH POINT: exactly one divider badge, attached to the FIRST row delivered after the
    // switch - the first pause-window message. Rows above it are the exact replay; rows below
    // follow live traffic.
    val badgeRows = switchPointRowValues()
    assert(
      badgeRows == List(pauseWindow.head),
      s"expected exactly one switch-point badge, on '${pauseWindow.head}' (the first row delivered after the switch), got $badgeRows"
    )
    assertNoSeamViolations()
    assertArrivalOrder(cs, all, "D5 arrival order (the release preserves publish-time order)")
    DeliveredMessages.assertExactly(cs.exportedValues(), all, "D5 delivered multiset")
  }

  // =============================================================================================
  // CELL D6 - EDGE: OWNERSHIP CHURN mid-session. `admin.topics().unload` on ONE stream's topic
  // makes the broker drop and re-own it: the session's consumer for that stream silently
  // disconnects, reconnects, and everything received-but-unacknowledged is REDELIVERED - on a
  // multi-broker cluster this is what a topic ownership move does, and the standalone reproduces
  // the same client-visible physics. The pin under the replay contract: a redelivered message
  // must count against the SAME replay range - never re-shown (deduped), never lost, and never
  // able to re-open a finished stream or double-extend the chunk. Fastest is skipped - it makes
  // no ordering claim for churn to break; its exactly-once under pressure is covered by the
  // flow-control specs.
  // =============================================================================================

  private val d6Seeds = (0 until 12).map(i => f"m-$i%02d")
  private val d6Round = (0 until 8).map(i => f"r-$i%02d")

  /** Consumer connection stamp for the session's subscription on `fqn` - the observable a broker
    * unload changes when the consumer really reconnects. Empty while no consumer is attached. */
  private def consumerConnectedSince(fqn: String): List[String] =
    import scala.jdk.CollectionConverters.*
    admin.topics().getStats(fqn).getSubscriptions.values().asScala.toList
      .flatMap(_.getConsumers.asScala.toList.map(_.getConnectedSince))

  /** Poll the loaded counter until it crosses `n` - mid-replay there is no exact value to wait
    * for, only a threshold proving the drain is in flight. */
  private def awaitLoadedAtLeast(cs: ConsumerSessionPage, n: Int, timeoutMs: Long): Unit =
    eventually(timeoutMs = timeoutMs, intervalMs = 100) {
      val current = cs.loadedCount
      assert(current >= n, s"loaded $current, expected at least $n")
    }

  test("CS-DM-D6G [CHURN x Guaranteed]: an unload mid-replay redelivers - every copy is deduped against the SAME replay range, and the chunk stays exact") {
    // The unload must land while the replay is still draining. Block size alone cannot hold that
    // window open: 6,000 messages drained in under a second on a warm standalone (observed
    // 2026-08-12 - the auto-pause beat the first assertState poll), so the window is held the way
    // R1 holds its announce off: through the product's own delivery rate limit. 6,000 recorded
    // messages at 500/s is a ~12 s drain wherever the pipeline's raw speed goes next; x's
    // dispatch (below) lands ~8 s in, and the unload strikes a provably LIVE replay - with B's
    // receiver queue full of dispatched-but-unemitted in-range messages, which is what gives the
    // dedup assertion real redelivered copies to reject. Fast-produced: order is not asserted in
    // this cell (ties across the two producers), identity is.
    val (fqnD6A, fqnD6B, parts) = twoFreshTopics()
    val seedsA = fixtures.produceStringsFast(fqnD6A, 3000, prefix = "a")
    val seedsB = fixtures.produceStringsFast(fqnD6B, 3000, prefix = "b")

    val cs = openTwoTopicSession(parts, Seq(fqnD6A, fqnD6B), guaranteedLabel)
    cs.setRateLimit(500)
    cs.play()
    cs.assertState("running")

    // The deterministic un-acked message: a word PAST the boundary, produced while the replay
    // drains (the 6,000-message drain outlasts one send by seconds). Pulsar dispatches in order,
    // so by the time x reaches the client every in-range B message is already in the session's
    // hands - the boundary nack then hands x back UN-ACKED and holds B's consumer, stranding
    // nothing. In-range messages cannot play this role: the merge acks them as it emits, and
    // emission runs far ahead of the browser-visible counter (observed 2026-08-09, drafts of
    // this cell: all 3,000 of B's seeds were dispatched AND acked within the first second, so a
    // mid-drain unload found nothing un-acked to redeliver).
    fixtures.produceRoundRobin(Seq(fqnD6B), Seq("x-next-chunk"))
    // x's first dispatch and refusal, observed on the broker before the churn: the counter
    // crossing seedsB + 1 proves the word reached the session once and was nacked (it may not
    // appear on screen), which is what makes its eventual arrival below a REdelivery.
    eventually(timeoutMs = 60000, intervalMs = 200) {
      val dispatched = fixtures.subscriptionDispatchCount(fqnD6B)
      assert(dispatched >= seedsB.size + 1, s"x has not been dispatched yet: B dispatched $dispatched of ${seedsB.size + 1}")
    }

    // CHURN: unload B. The broker closes the consumer, re-owns the topic, and the consumer
    // reconnects - with its boundary hold intact (a held consumer issues no permits), so the
    // un-acked x stays parked on the broker for the next chunk.
    val before = consumerConnectedSince(fqnD6B)
    admin.topics().unload(fqnD6B)
    // The reconnect, observed rather than assumed: a consumer is attached again with a NEW
    // connection stamp. (If this ever fails, the standalone stopped churning on unload and the
    // cell is environment-limited - say so, do not delete the assertion.)
    eventually(timeoutMs = 30000, intervalMs = 300) {
      val now = consumerConnectedSince(fqnD6B)
      assert(now.nonEmpty && now != before, s"no reconnected consumer on $fqnD6B yet: before=$before now=$now")
    }

    // The replay completes EXACTLY across the churn: 6,000 - any copy the churn re-sent is
    // deduped against the same range (6,001 would name a double-delivery; a timeout names a
    // loss or a re-opened stream) - then the boundary pause, with x still outside.
    awaitCaughtUp(cs, seedsA.size + seedsB.size, timeoutMs = 90000)
    assertSettledLoaded(cs, seedsA.size + seedsB.size, "exactly once across the reconnect - and the nacked word stays out of the closed chunk")

    // The redelivery bracket: nothing new is produced to B from here, so every dispatch B's
    // subscription records after this instant is a REdelivery of the un-acked x. (The unload
    // RESETS the broker's per-subscription msgOutCounter - observed 2026-08-09 - which is why
    // the baseline is read here, post-reload, rather than differenced across the unload.)
    val dispatchedBeforeResume = fixtures.subscriptionDispatchCount(fqnD6B)

    // 'Load new messages' extends the boundary: the held consumer releases, the broker redelivers x across
    // the churn, and it arrives exactly once.
    loadNewMessages.click()
    awaitCaughtUp(cs, seedsA.size + seedsB.size + 1, timeoutMs = 45000)
    assertSettledLoaded(cs, seedsA.size + seedsB.size + 1, "the next-chunk word must survive the churn and deliver exactly once")
    val redelivered = fixtures.subscriptionDispatchCount(fqnD6B) - dispatchedBeforeResume
    assert(
      redelivered >= 1,
      s"x arrived without a post-resume dispatch on B - the redelivery path was not exercised " +
        s"(B dispatched $dispatchedBeforeResume before the resume and ${fixtures.subscriptionDispatchCount(fqnD6B)} after)"
    )
    assertNoSeamViolations()
    DeliveredMessages.assertExactly(
      cs.exportedValues(),
      seedsA ++ seedsB ++ Seq("x-next-chunk"),
      "D6-G delivered multiset (every message exactly once across the churn)"
    )
  }

  test("CS-DM-D6B [CHURN x Best effort]: the stream survives an unload - everything before and after arrives exactly once, in order") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d6Seeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), bestEffortLabel)
    cs.play()
    cs.awaitLoaded(d6Seeds.size)

    // Under Best effort nothing is deterministically unacknowledged at steady state (the grace
    // has released everything), so the cell pins churn's cost on the FLOW: what passes through a
    // reconnecting stream must arrive exactly once and stay ordered. Unload A - either works.
    val before = consumerConnectedSince(fqnA)
    admin.topics().unload(fqnA)
    eventually(timeoutMs = 30000, intervalMs = 300) {
      val now = consumerConnectedSince(fqnA)
      assert(now.nonEmpty && now != before, s"no reconnected consumer on $fqnA yet: before=$before now=$now")
    }

    // The probe proves the reconnected stream DELIVERS again before the ordered round rides it -
    // gating on the oracle, not on reconnect timing.
    fixtures.produceRoundRobin(Seq(fqnA), Seq("p-00"))
    cs.awaitLoaded(d6Seeds.size + 1, timeoutMs = 45000)

    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d6Round)
    val all = d6Seeds ++ Seq("p-00") ++ d6Round
    cs.awaitLoaded(all.size, timeoutMs = 45000)
    assertSettledLoaded(cs, all.size, "exactly once across the reconnect")
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 10000)
    assertArrivalOrder(cs, all, "D6-B arrival order across the reconnect")
    DeliveredMessages.assertExactly(cs.exportedValues(), all, "D6-B delivered multiset")
  }

  test("CS-DM-D6S [CHURN x Best effort x skip-n]: an unload mid-skip does not corrupt the counted budget - the survivors are exact") {
    // Skip 14 of 12: the discard spends the whole seeded backlog and then WAITS for two more -
    // which parks the session provably mid-skip (dispatched >= 12, loaded == 0) so the unload
    // deterministically lands while the budget is live. If the churn redelivers anything the
    // discard already decided (acks racing the unload), the budget must not spend a second unit
    // on the copy: the survivors would then be wrong by name, not just by count.
    val (fqnA, fqnB, parts) = twoFreshTopics()
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), d6Seeds)

    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), bestEffortLabel)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("14")
    cs.play()
    cs.assertState("running")
    // Provably mid-skip: every seed has been dispatched to the session, nothing has been shown.
    eventually(timeoutMs = 30000, intervalMs = 300) {
      val dispatched = fixtures.subscriptionDispatchCount(fqnA) + fixtures.subscriptionDispatchCount(fqnB)
      assert(dispatched >= d6Seeds.size, s"the skip has not consumed the seeds yet: dispatched=$dispatched")
    }
    assert(cs.loadedCount == 0, s"the skip must still be counting, got ${cs.loadedCount} loaded")

    val before = consumerConnectedSince(fqnA)
    admin.topics().unload(fqnA)
    eventually(timeoutMs = 30000, intervalMs = 300) {
      val now = consumerConnectedSince(fqnA)
      assert(now.nonEmpty && now != before, s"no reconnected consumer on $fqnA yet: before=$before now=$now")
    }

    // Four more ticked words: r-00/r-01 spend the budget's last two units, r-02/r-03 survive.
    val tail = (0 until 4).map(i => f"r-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), tail)
    cs.awaitLoaded(2, timeoutMs = 45000)
    assertSettledLoaded(cs, 2, "exactly two survivors - a double-spent or under-spent budget shows here")
    DeliveredMessages.assertExactly(pausedExportedSet(cs), tail.drop(2), "D6-S surviving multiset")
  }

  // =============================================================================================
  // CELL R - THE REPLAY CONTRACT'S OWN CELLS: what the redesign added beyond the matrix's
  // liveness axes - the banner's content, the repeatable chunk mechanism, and the one
  // combination the replay makes meaningless.
  // =============================================================================================

  test("CS-DM-R1 [REPLAY BANNER]: the caught-up banner names the boundary instant, and discloses newer data - approximately - only because there is some") {
    // The newer-data indicator is captured AT the caught-up announce (the boundary nacks it has
    // seen, refined once by a broker poll right after), so the post-boundary words must land
    // BEFORE the announce. Raw emission can finish a small backlog in well under a second - one
    // run lost that race - so the drain is throttled through the product's own delivery rate
    // limit: 3,000 recorded messages at 500/s hold the announce off for ~6 seconds, and the
    // words (one producer connect + five ticked sends, well under a second after Play) land
    // mid-drain with seconds to spare. The boundary itself was captured at the seek, before
    // play() returned, so the words are past it wherever they land in the drain.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val backlog = fixtures.produceStringsFast(fqn, 3000, prefix = "bk")

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.setDeliveryOrder(guaranteedLabel)
    cs.setRateLimit(500)
    cs.play()
    // Post-boundary words, landed while the replay drains: the boundary nack (and the one-shot
    // broker poll at the announce) is what feeds the banner's newer-data line.
    val newer = (0 until 5).map(i => f"w-$i%02d")
    fixtures.produceRoundRobin(Seq(fqn), newer)

    awaitCaughtUp(cs, backlog.size, timeoutMs = 60000)
    // The boundary instant, formatted: "Caught up to Aug 09, 2026 14:03:22".
    val bannerText = caughtUpBanner.textContent()
    assert(
      bannerText.matches("(?s).*Caught up to [A-Z][a-z]{2} \\d{2}, \\d{4} \\d{2}:\\d{2}:\\d{2}.*"),
      s"the banner must name the boundary instant, got: '$bannerText'"
    )
    // The panel no longer reports how much waits past the boundary (the "~N entries" line was
    // removed 2026-08-11 - it counted broker entries, not messages). What the cell still pins is
    // the CONTRACT that line described: the replay stops exactly at the boundary, and the words
    // recorded past it wait for the next chunk.
    // No regex matched a new topic, so the excluded-topics line says nothing.
    assertThat(bannerExcludedLine).not().isVisible()
    assertNoSeamViolations()
    assertSettledLoaded(cs, backlog.size, "the replay stops at the boundary, whatever waits past it")
    DeliveredMessages.assertExactly(cs.exportedValues(), backlog, "R1 delivered multiset (the boundary excludes the newer words)")
  }

  test("CS-DM-R2 [LOAD NEW MESSAGES EXTENDS]: every 'Load new messages' extends the boundary and replays the delta exactly - the chunk mechanism is repeatable, not one-shot") {
    val (fqnA, fqnB, parts) = twoFreshTopics()
    val seeds = (0 until 6).map(i => f"m-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), seeds)
    val cs = openTwoTopicSession(parts, Seq(fqnA, fqnB), guaranteedLabel)
    cs.play()
    awaitCaughtUp(cs, seeds.size)

    // Chunk 2: a delta produced INTO the pause, spread over both streams; 'Load new messages' replays it
    // exactly once and the banner returns at the new boundary.
    val delta1 = (0 until 6).map(i => f"d1-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), delta1)
    assertSettledLoaded(cs, seeds.size, "the delta waits behind the boundary")
    loadNewMessages.click()
    awaitCaughtUp(cs, seeds.size + delta1.size)
    assertSettledLoaded(cs, seeds.size + delta1.size, "chunk 2 must deliver exactly once")

    // Chunk 3: the same verbs again - the mechanism must not be a one-shot.
    val delta2 = (0 until 4).map(i => f"d2-$i%02d")
    fixtures.produceRoundRobin(Seq(fqnA, fqnB), delta2)
    assertSettledLoaded(cs, seeds.size + delta1.size, "chunk 3 waits behind the extended boundary")
    loadNewMessages.click()
    awaitCaughtUp(cs, seeds.size + delta1.size + delta2.size)
    assertSettledLoaded(cs, seeds.size + delta1.size + delta2.size, "chunk 3 must deliver exactly once")

    assertNoSeamViolations()
    assertArrivalOrder(cs, seeds ++ delta1 ++ delta2, "R2 arrival order across three chunks")
    DeliveredMessages.assertExactly(cs.exportedValues(), seeds ++ delta1 ++ delta2, "R2 delivered multiset")
  }

  test("CS-DM-R3 [LATEST x GUARANTEED, ungated]: 'Latest message' stays selectable under Guaranteed in BOTH directions, with no note, and nothing is rewritten") {
    // Owner decision 2026-08-11, reversing the 2026-08-09 disabled-option gate: the combination
    // is legal, and what the user gets is the instant caught-up with its panel (R3B pins that
    // flow) - the decision belongs there, not to a greyed-out option. This cell pins the un-gate:
    // nothing disabled, nothing noted, nothing rewritten.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)

    // Direction 1: Guaranteed first - "Latest message" stays selectable.
    cs.setDeliveryOrder(guaranteedLabel)
    assert(
      !cs.disabledStartFromLabels.contains("Latest message"),
      s"'Latest message' must stay selectable under Guaranteed, disabled set: ${cs.disabledStartFromLabels}"
    )
    assertThat(page.getByTestId("cs-start-from-latest-guaranteed-note")).not().isVisible()

    // Direction 2: Latest first, then Guaranteed - the stored value is the user's (M4 lesson).
    cs.setDeliveryOrder(bestEffortLabel)
    cs.setStartFrom("Latest message")
    cs.setDeliveryOrder(guaranteedLabel)
    assertThat(cs.startFromSelect).hasValue("latestMessage")
    assert(
      !cs.disabledStartFromLabels.contains("Latest message"),
      s"'Latest message' must stay selectable in the saved-combo direction too, disabled set: ${cs.disabledStartFromLabels}"
    )
  }

  test("CS-DM-R3B [LATEST x GUARANTEED, the combination]: playing a saved Latest x Guaranteed combo is an INSTANT caught-up that reads nothing") {
    // Untagged 2026-08-09, same day it was found: the first Play now CONSUMES the boundaries the
    // create decided (a live-edge seek = an empty boundary) instead of re-reading the broker, so
    // this regression joined the green lane. What it pins, permanently: the create is the first
    // Play - the boundaries decided at create ARE the first chunk's - so a saved Latest x
    // Guaranteed combination on a topic that HOLDS a backlog answers Play with the instant
    // caught-up pause and reads nothing. (The bug it caught: the first-play boundary re-capture
    // read every persistent topic's real last message ids with no knowledge of the create's
    // `seekedToLiveEdge` set, re-arming the barrier over a range the cursor was seeked past -
    // the session sat 'running' showing nothing, forever. A NON-EMPTY topic is therefore the
    // load-bearing arrangement here; an empty one could not tell the fix from the bug.)
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    // A backlog that must stay UNREAD: Latest means the replay boundary is empty, so these four
    // never reach the session in any chunk.
    val unread = (0 until 4).map(i => f"old-$i%02d")
    fixtures.produceRoundRobin(Seq(fqn), unread)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    // The saved-combo path: Latest first, then Guaranteed - the value is kept, not rewritten.
    cs.setStartFrom("Latest message")
    cs.setDeliveryOrder(guaranteedLabel)
    assertThat(cs.startFromSelect).hasValue("latestMessage")

    cs.play()
    // Instant caught-up: the boundary is empty, nothing replays - the backlog stays unread.
    assertThat(caughtUpBanner).isVisible(vis(20000))
    cs.assertState("paused", timeoutMs = 10000)
    assert(cs.loadedCount == 0, s"Latest x Guaranteed replays nothing, got ${cs.loadedCount}")

    // The chunk verbs still work from here: words recorded during the pause become the next
    // chunk's delta, and the pre-play backlog STAYS unread - Latest anchored the boundary past it.
    val delta = (0 until 4).map(i => f"d-$i%02d")
    fixtures.produceRoundRobin(Seq(fqn), delta)
    assertSettledLoaded(cs, 0, "pause-window words wait for the next chunk")
    loadNewMessages.click()
    awaitCaughtUp(cs, delta.size)
    assertSettledLoaded(cs, delta.size, "the delta must deliver exactly once - and the old backlog must stay out")
    DeliveredMessages.assertExactly(cs.exportedValues(), delta, "R3B delivered multiset (the unread backlog is not in it)")
  }
