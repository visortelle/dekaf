package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** The start-from flow-control and guard behaviors only a REAL broker can prove.
  *
  * The merge's watermark arithmetic, the give-up window and the guards are all pinned by the
  * server suite with injected clocks and plain values. What no unit test can reach is the LAST
  * HOP of each: `consumer.pause()` issued from inside an armed MessageListener callback while the
  * broker keeps dispatching (CS-FC-1), the give-up degradation travelling broker -> merge ->
  * progress frame -> STICKY banner (CS-FC-2), and the creation-time refusals surfacing as a
  * user-visible error rather than a silent wrong session (CS-FC-3/4).
  *
  * WHY NOT A DISPATCH-RATE THROTTLE: the obvious way to starve one stream is a namespace
  * dispatch rate, and it was tried first - this standalone broker does not enforce it (verified
  * with the broker's own CLI consumer sailing through a 1-msg/10s policy), with or without the
  * `dispatchThrottlingOnNonBacklogConsumerEnabled` / `preciseDispatcherFlowControl` flags. The
  * scenarios below use levers that are deterministic here instead: a LARGE OLD BACKLOG whose
  * drop phase takes real seconds (pause pressure without any silence), and a FORCE-DELETE of a
  * topic while the session is paused (absolute silence - a deleted ledger cannot deliver its
  * recorded end, whatever any cursor believes; admin cursor jumps proved unreliable on
  * NonDurable subscriptions).
  */
class CsFlowControlSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  /** Consumer connection stamps for the session's subscription on `fqn` - the connection EPOCH
    * the broker's per-consumer counters live inside (a reconnect replaces the consumer and its
    * dispatch counter; same bracketing as CS-DM-D6G's). Empty while no consumer is attached. */
  private def consumerConnectedSince(fqn: String): List[String] =
    import scala.jdk.CollectionConverters.*
    admin.topics().getStats(fqn).getSubscriptions.values().asScala.toList
      .flatMap(_.getConsumers.asScala.toList.map(_.getConnectedSince))

  test("CS-FC-1: the per-stream watermark engages under the armed listener, and the exact SET survives") {
    // B: 30,000 OLD messages. A: 3,000 NEW ones. Global skip of 31,995 must drop every B message
    // FIRST (they are globally oldest), which takes real seconds - and in that window all of A
    // arrives and can do nothing but QUEUE, sailing past the per-stream watermark (1,000), so
    // A's consumer is paused from inside its own listener callback and resumed as the queue
    // drains, cycling until the budget lands. What this pins end to end: pausing a consumer
    // mid-listener neither deadlocks the session (a hang fails the await) nor loses, duplicates or
    // mis-selects anything - and WHICH 1,005 survive is asserted, not just how many. A count is
    // reached by 1,005 wrong messages just as easily as by the right ones, and one dropped message
    // plus one duplicate reaches it too. What it deliberately does not claim: that a silently
    // non-pausing consumer.pause() would be detected - that would only weaken the memory bound,
    // which no black-box assertion can see; the hook INVOCATION is pinned by the ordering-layer
    // unit suite.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    // DISTINCT PREFIXES, not decoration: with both topics carrying `msg-1..` a B message wrongly
    // delivered instead of an A message is the same string as the A message it displaced, and the
    // exact-set assertion below could not see it.
    fixtures.produceStringsFast(fqnB, 30000, prefix = "b") // first, so B is the globally-oldest block
    // Every one of B's publish times is stamped before its producer flush returned, so this instant
    // separates the two blocks. The exact-set expectation below depends on that separation, and an
    // instant taken here is what makes it checkable without reading 30,000 messages back.
    val betweenBlocks = System.currentTimeMillis()
    fixtures.produceStrings(fqnA, 3000, prefix = "a")

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("31995")
    // PINNED, not inherited: the watermark under test is the ordering MERGE's, so this test is
    // meaningful only with an engaged, non-stalling merge that keeps FOLLOWING. Fastest builds no
    // merge at all, and Guaranteed is an exact replay that auto-pauses at its boundary - a
    // different lifecycle whose flow-control cell is CS-FC-5. The cycling-under-pressure path
    // pinned here is Best effort's, whatever the session default is.
    cs.setDeliveryOrder("Best effort")
    cs.play()
    cs.assertState("running")

    cs.awaitLoaded(1005, timeoutMs = 120000)
    page.waitForTimeout(1500) // anything past 1,005 would arrive right behind it
    // The count is KEPT on purpose: it is read from the server's own numMessageSent after a quiet
    // window, so it catches a straggling extra delivery arriving after the set below first matched
    // - the one failure a set comparison cannot see. It is no longer the whole assertion.
    assert(cs.loadedCount == 1005, s"exactly 1005 must remain after skipping 31995 of 33000, got ${cs.loadedCount}")

    // Slow positioning is not degraded positioning: every stream kept speaking.
    assertThat(cs.startFromDegradedBanner).not().isVisible()

    // WHICH 1,005. The cut is global and B is entirely older than A, so the survivors are A's last
    // 1,005 - read back from the BROKER in append order rather than assumed from the produce call.
    // The boundary premise is checked too: A's oldest message must be newer than the instant B
    // finished. If the two blocks ever overlapped in time a different set would be correct, and
    // this expectation - not the app - would be the thing that is wrong.
    val onA = fixtures.readAllMessages(fqnA)
    val oldestA = onA.head.getPublishTime
    assert(
      oldestA > betweenBlocks,
      s"arrangement broken: A's oldest message ($oldestA) is not newer than the instant B finished " +
        s"($betweenBlocks), so the global cut does not fall where this expectation assumes"
    )
    val expected = onA.map(_.getValue).toList.drop(1995)
    assert(expected.size == 1005, s"expected-set arithmetic is off: ${expected.size}")

    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 15000)
    assert(cs.retainedCount == 1005, s"the browser holds ${cs.retainedCount} of 1005 rows - the export would be partial")
    DeliveredMessages.assertExactly(cs.exportedValues(), expected, "the surviving set after a global skip of 31,995")
  }

  test("CS-FC-2: a stream whose recorded end stops being deliverable degrades VISIBLY after the give-up window") {
    // The retention/trim race, reproduced without racing anything: B holds 200,000 messages, far
    // more than the drop phase can consume before the session is PAUSED moments after it starts.
    // With every consumer frozen, B's subscription cursor is jumped past its whole backlog - the
    // recorded end silently stops being deliverable - and the session resumes into at most a
    // prefetched tail followed by permanent silence on a still-waited stream. The give-up window
    // (30s, granted FRESH at resume - paused time proves nothing) expires, the merge abandons B,
    // and the session must SAY SO: the sticky best-effort banner, carried on the very frames the
    // give-up drain emits. The budget (150,000) is deliberately unspendable, so the banner - not
    // delivery - is the observable outcome, exactly like a real over-sized skip against a topic
    // that retention trimmed mid-positioning.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    // A MILLION, deliberately: the merge's drop phase runs at up to a few hundred thousand
    // messages per second, so anything smaller can be fully consumed - recorded end delivered,
    // stream no longer waited - before a UI-timed pause can possibly land. At this size the
    // pause is guaranteed to catch B mid-backlog, whatever the machine's speed.
    fixtures.produceStringsFast(fqnB, 1000000)
    fixtures.produceStrings(fqnA, 100)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    // ARRANGE THE HIDDEN CONSOLE: the tools pane now opens BY DEFAULT (a deliberate UI change on
    // this branch - `consumerSessionToolsOpen` defaults true), so the collapsed-console layout
    // oracle below needs its premise arranged, or it reads the OPEN pane's honest 360px and
    // fails on a layout that in fact survived (observed 2026-08-09).
    cs.closeTools()
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("600000")
    // PINNED, not inherited: the give-up degradation IS Best effort's contract. Guaranteed waits
    // indefinitely by design and can never reach the banner this test exists to prove, so the mode
    // must be explicit here whatever the session default is - this is the only end-to-end proof of
    // the degradation disclosure.
    cs.setDeliveryOrder("Best effort")
    cs.play()
    cs.assertState("running")

    // Freeze the world, then make the backlog unreachable for good. The pre-pause second drops
    // at most a couple hundred thousand of B's million (harmless - the budget stays unspendable
    // and B stays mid-backlog, so it is still WAITED on), and force-deleting B destroys the
    // rest, recorded end included. Auto-creation may resurrect the NAME as an empty topic; the
    // old ledger never comes back, which is exactly the trimmed-partition condition.
    cs.pauseFromToolbar()
    cs.assertState("paused")
    fixtures.forceDeleteTopic(fqnB)
    cs.play()
    cs.assertState("running")

    // Give-up at ~30s of post-resume silence (+ the 2s sweep cadence).
    assertThat(cs.startFromDegradedBanner).isVisible(vis(75000))
    val banner = cs.startFromDegradedBanner.textContent()
    assert(banner.contains("Best effort"), s"unexpected banner text: '$banner'")
    assert(banner.contains("1 topic"), s"the banner should count the abandoned topics, got: '$banner'")
    // The banner names the TOPIC the user owns, not the internal `<consumer>@<topic>` stream id.
    assert(banner.contains(fqnB), s"the banner should name the silent topic, got: '$banner'")
    assert(!banner.contains("@"), s"internal stream ids must not reach the screen, got: '$banner'")

    // THE LAYOUT SURVIVES THE DISCLOSURE. The banner used to be a fourth direct grid child in a
    // three-row grid: the content area collapsed into the console's zero-height row and the
    // supposedly hidden console became the visible one. Height is the only honest oracle here.
    val contentHeight = page.locator("[data-testid='cs-session'] > *:nth-child(2)").boundingBox().height
    assert(contentHeight > 50, s"the content row must keep real height under the banner, got $contentHeight")
    // <= 8: the console keeps its 4px top border even in a zero-height grid row; what the broken
    // layout produced was the console's full content height in an implicit fourth row.
    val consoleBox = Option(page.getByTestId("cs-console").boundingBox())
    assert(
      consoleBox.forall(_.height <= 8),
      s"a hidden console must stay collapsed under the banner, got ${consoleBox.map(_.height)}"
    )

    // Nothing was delivered - the budget is unspendable by design - and the session is still
    // alive and positioning, not crashed: degradation is a disclosure, never a failure.
    // A COUNT AND NOT A SET, deliberately: zero IS the exact set here. There is no identity to
    // compare, and any non-zero value is a failure whatever its payload.
    assert(cs.loadedCount == 0, s"an unspendable budget must deliver nothing, got ${cs.loadedCount}")
    assert(cs.state == "running", s"a degraded session keeps running, got '${cs.state}'")

    // Stop EXPLICITLY: this session's B-consumer is reconnect-looping against a deleted topic,
    // and leaving it running turns the server log into a firehose for the rest of the suite.
    cs.stop()
  }

  test("CS-FC-3: skip-n REFUSES overlapping targets with a visible reason - and per-view modes still work") {
    // Two enabled targets, both "Current Topic": a counted skip cannot mean anything predictable
    // over duplicated subscriptions (one shared budget, two copies of every message), so Play
    // must fail with the reason on screen. The SAME session with a plain mode then works, and
    // shows each target's own copy - the per-view contract, pinned end to end.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.addTarget()
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("1")
    cs.play()

    val refusal = page.getByText(
      java.util.regex.Pattern.compile("two enabled targets select the same topic", java.util.regex.Pattern.CASE_INSENSITIVE)
    ).first()
    assertThat(refusal).isVisible(vis(15000))

    // The refusal is MODE-specific: Earliest on the same two targets delivers each target's own
    // counted set - three messages, two views, six rows.
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(6)
  }

  test("CS-FC-4: latest-n REFUSES a read-compacted target with a visible reason - Latest message still works") {
    // Latest-n counts STORED entries; a compacted read shows one message per key. The walk
    // cannot see the compacted view, so the session must refuse rather than promise a count it
    // cannot keep. 'Latest message' needs no counting and must keep working on the same target.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.toggleTargetCompacted()
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("2")
    cs.play()

    val refusal = page.getByText(
      java.util.regex.Pattern.compile("read compacted", java.util.regex.Pattern.CASE_INSENSITIVE)
    ).first()
    assertThat(refusal).isVisible(vis(15000))

    cs.setStartFrom("Latest message")
    cs.play()
    cs.assertState("running")
  }

  test("CS-FC-5: the BYTE watermark pauses a hot stream before any count watermark can") {
    // THE ORACLE IS EPOCH-BRACKETED, and the history is worth keeping: this cell first shipped
    // reading the broker's dispatch counter bare, and went red in 2 of 4 otherwise-identical
    // runs with "400 of 400 dispatched". That was the ORACLE's defect, not the product's: the
    // counter counts DISPATCHES, not unique messages, and it belongs to the broker-side consumer
    // - a transient reconnect replaces that consumer, resets the counter, and redelivers the
    // entire un-acked held window (256+ messages the merge already holds and deduplicates), so
    // the reading mixes redeliveries with admission. The counter is therefore interpreted per
    // CONNECTION EPOCH (the same `connectedSince` bracketing CS-DM-D6G uses): within the epoch
    // that began at Play it counts unique admitted messages and carries the full discriminating
    // bounds; after a transient reconnect only the redelivery-inclusive ceiling is checkable
    // from it, and the fixpoint properties below carry the rest. (The server side of the 2026-08-09
    // investigation is separately pinned: admission under the replay barrier is serialized, with
    // its own deterministic unit tests.)
    //
    // Every other payload in this suite is a handful of bytes, so the merge's held-BYTES cap
    // (256 MiB - globalStartFrom.startFromMergePauseBytesAt) was unreachable: a count watermark
    // (10,000 total / 1,000 per stream) always tripped first, and a byte cap with the wrong unit,
    // one that never fires, or one that fires on the first message was invisible. Here the counts
    // are made UNREACHABLE instead: 400 messages of 1 MiB each can never trip a count watermark
    // (400 < 1,000), while 400 MiB > 256 MiB guarantees the byte cap has something to do - so if
    // anything pauses the stream, it is the byte cap.
    //
    // WHAT MAKES THE HOLD DETERMINISTIC changed with the exact-replay redesign (2026-08-09). The
    // old arrangement held A behind a 100-partition topic that never spoke - but a stream that
    // recorded nothing at the boundary is now trivially FINISHED and never waited for, so empty
    // silence holds nothing any more (CS-DM-D1G pins exactly that). The hold that remains
    // e2e-drivable is the one the replay cannot argue with: a recorded range that stops being
    // DELIVERABLE. C records three million messages before Play and is force-deleted mid-drain;
    // its recorded end can then never arrive, the replay may not finish past it, and - because
    // the give-up stays Best effort's alone - the merge waits forever. Everything A dispatches
    // is NEWER than C's unfinished range, so it queues in the heap for as long as we choose,
    // and held-bytes walk up to the cap. Three million because the drop phase is FAST (a 1M
    // topic was fully consumed inside the delete's own REST round trip when this was first
    // tried); the arrangement guard below turns a lost race into a named failure.
    //
    // The skip budget (5,000,000 over a 3,000,400-message arrangement) is the browser shield: an
    // unspendable counted cut consumes what the merge emits without delivering a row, so neither
    // C's drained prefix nor A's 400 MiB can ever strain the shared Chromium. And B - the
    // 100-partition topic that never speaks - stays in the arrangement for its OTHER old job:
    // 102 consumers shrink the per-consumer prefetch to 5,000/102 = 49 messages
    // (mergeReceiverQueueSizeFor), which is what makes the dispatch plateau tight enough to
    // discriminate: after the pause the broker can have dispatched at most the trip point (256)
    // plus prefetch (49) plus a little in-flight slack.
    //
    // COUNTS ARE THE PROPERTY HERE, not a weaker stand-in for an exact set - do not "strengthen"
    // them into one. A byte watermark is a statement about HOW MANY bytes were admitted before the
    // stream was held, so the only thing that can answer it is a quantity: the broker's dispatch
    // counter, bounded on both sides. And the delivered set is asserted exactly - it must be
    // EMPTY - because the budget is unspendable by design.
    //
    // The oracle is the BROKER's dispatch counter for A's one subscription:
    //   - plateau (two agreeing reads) >= 256 - the cap did not fire early (a bytes-vs-KB unit
    //     bug fires orders of magnitude too soon and fails this bound);
    //   - plateau <= 360 - the cap DID fire (a never-firing cap dispatches all 400 and fails
    //     this bound; no count watermark can produce a pause below 1,000 held).
    // The held 256 MiB is deliberately NEVER released into the discard: the byte-RESUME drain is
    // pinned at the server tier (the pause arbiter and watermark unit suites), while the e2e
    // resume path is CS-FC-1's count-watermark cycling through the same arbiter. What closes the
    // loop here instead: the 40s fixpoint (the give-up must NOT fire under Guaranteed - a
    // wrongly-armed one would abandon C, drain the holds and resume A past the plateau), the
    // caught-up banner staying ABSENT (an unfinished stream must never announce a boundary), and
    // a clean stop that releases the paused consumer on the broker.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tC, nsC, topicC) = fixtures.freshTopicParts()
    val fqnC = s"persistent://$tC/$nsC/$topicC"
    val tB = fixtures.createTenant()
    val nsB = fixtures.createNamespace(tB)
    val topicB = s"silent-${System.currentTimeMillis()}"
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    fixtures.admin.topics().createPartitionedTopic(fqnB, 100)

    // C first, A second: every C publish time is stamped before A's first, so A's whole block is
    // strictly newer than C's unfinished range and must queue behind it.
    val cBacklog = 3000000L
    fixtures.produceStringsFast(fqnC, cBacklog.toInt)
    fixtures.produceSized(fqnA, count = 400, payloadBytes = 1024 * 1024)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnC, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("5000000")
    // Guaranteed is the point here, and pinned: only the no-give-up barrier turns "C's recorded
    // end stopped being deliverable" into "A's dispatches are all HELD", which is what walks
    // held-bytes up to the cap. Best effort would abandon C after 30s and drain everything.
    cs.setDeliveryOrder("Guaranteed")
    val playedAt = System.currentTimeMillis()
    cs.play()
    cs.assertState("running")
    // The connection epoch the whole oracle is bracketed by - see the header comment.
    val connectionAtPlay = consumerConnectedSince(fqnA)

    // Make C's recorded end undeliverable while its drop phase is provably still in flight.
    // Auto-creation may resurrect the NAME as an empty topic; the old ledger never comes back,
    // which is exactly the trimmed-partition condition.
    fixtures.forceDeleteTopic(fqnC)
    // THE ARRANGEMENT GUARD: the delete must beat the drop phase to at least part of C's range,
    // or there is no undeliverable remainder and the whole cell proves nothing (observed
    // 2026-08-09 at C = 1M: the drop phase consumed the entire topic inside the delete's own
    // multi-second REST round trip, the barrier finished, and the session legitimately caught
    // up). C is sized at 3M for a several-fold margin, and a lost race fails HERE, by name,
    // instead of as a mysterious full-dispatch plateau below.
    assertThat(page.getByTestId("cs-replay-caught-up")).not().isVisible()
    val progress = page.getByTestId("cs-start-from-progress")
    val skippedAfterDelete =
      if progress.isVisible then Option(progress.getAttribute("data-cs-skipped")).flatMap(_.toLongOption).getOrElse(0L)
      else 0L // no progress frame yet - nothing claimed, the race is safely won
    assert(
      skippedAfterDelete < cBacklog,
      s"the delete lost the race with the drop phase: $skippedAfterDelete of $cBacklog were already claimed - " +
        "grow C so its recorded range outlives the delete"
    )

    // The hold phase. C can never finish, so nothing of A's is emitted, and A's dispatch counter
    // must SETTLE (within one connection epoch) rather than keep climbing.
    val plateau = harness.Eventually.eventually(timeoutMs = 150000, intervalMs = 1000) {
      val c1 = consumerConnectedSince(fqnA)
      val d1 = fixtures.subscriptionDispatchCount(fqnA)
      page.waitForTimeout(1500)
      val d2 = fixtures.subscriptionDispatchCount(fqnA)
      val c2 = consumerConnectedSince(fqnA)
      assert(c1 == c2 && c2.nonEmpty, s"A's consumer is mid-reconnect: $c1 then $c2")
      assert(d1 == d2, s"A's dispatch counter is still moving: $d1 then $d2")
      // The early-fire floor is only meaningful while the counter still counts unique messages -
      // i.e. in the epoch that began at Play. A reconnect resets the broker-side counter, and a
      // byte-paused consumer can legitimately show a near-zero fresh epoch.
      if c2 == connectionAtPlay then
        assert(d2 >= 256, s"A was paused after only $d2 dispatched 1-MiB messages - the byte cap fired too early")
      (d2, c2)
    }
    val (plateauDispatched, plateauEpoch) = plateau
    if plateauEpoch == connectionAtPlay then
      assert(
        plateauDispatched <= 360,
        s"the byte watermark never engaged: $plateauDispatched of 400 1-MiB messages were dispatched while C was " +
          s"unfinished, with no reconnect to blame (cap 256 + prefetch 49 + slack should bound this at ~360; the " +
          s"delete landed with $skippedAfterDelete of $cBacklog already claimed)"
      )
    else
      // A transient reconnect replaced the broker-side consumer: its fresh counter mixes a
      // redelivery of the already-held window (<= 360, deduplicated by the merge) with whatever
      // cap-bounded admission remained (<= 360), so only the redelivery-inclusive ceiling is
      // checkable from the counter in this epoch. loadedCount and the fixpoint below still carry
      // the leak detection at full strength.
      assert(
        plateauDispatched <= 720,
        s"even counting a full held-window redelivery, $plateauDispatched dispatches in the post-reconnect epoch " +
          s"exceed what a working byte cap admits (<= 360 unique + <= 360 redelivered)"
      )
    assert(cs.loadedCount == 0, s"an unspendable budget must deliver nothing, got ${cs.loadedCount}")

    // The hold must be a FIXPOINT that outlives the best-effort give-up window (30s + sweep):
    // under Guaranteed the give-up is disabled, and a wrongly-armed one would abandon C, drain
    // the holds, RESUME A (dispatch rises past the plateau) and spend the budget's next 400.
    // The wait is arrangement - outliving the window - not readiness.
    harness.Eventually.eventually(timeoutMs = 60000, intervalMs = 500) {
      val elapsed = System.currentTimeMillis() - playedAt
      assert(elapsed >= 40000, s"only ${elapsed}ms of the 40s give-up-window margin has elapsed")
    }
    val fixpointEpoch = consumerConnectedSince(fqnA)
    val fixpointDispatched = fixtures.subscriptionDispatchCount(fqnA)
    if fixpointEpoch == plateauEpoch then
      assert(
        fixpointDispatched == plateauDispatched,
        s"dispatch resumed past the plateau after the give-up window - a give-up fired under Guaranteed: " +
          s"$fixpointDispatched after settling at $plateauDispatched"
      )
    else
      // The counter reset with a reconnect inside the window; the ceiling is what remains
      // checkable from it, and the loaded/degraded asserts below are what a real give-up
      // cannot get past (it would spend the budget's next 400 into the discard and disclose).
      assert(
        fixpointDispatched <= 720,
        s"the post-reconnect epoch dispatched $fixpointDispatched - beyond a full held-window redelivery, " +
          "so the hold was released during the give-up window"
      )
    assert(cs.loadedCount == 0, s"the hold leaked deliveries after the give-up window, got ${cs.loadedCount}")
    assertThat(cs.startFromDegradedBanner).not().isVisible()
    // An unfinished stream is not a finished chunk: the replay may not announce caught-up while
    // C's recorded range has never been delivered.
    assertThat(page.getByTestId("cs-replay-caught-up")).not().isVisible()
    assert(cs.state == "running", s"holding is not stalling - the session stays healthy, got '${cs.state}'")

    // A clean stop must release the byte-paused consumer: the session's NonDurable subscription
    // disappears from the broker once its consumer disconnects - a wedged pause would leave it.
    cs.stop()
    harness.Eventually.eventually(timeoutMs = 30000, intervalMs = 500) {
      val subs = fixtures.admin.topics().getStats(fqnA).getSubscriptions
      assert(subs.isEmpty, s"the paused consumer's subscription survived stop: ${subs.keySet()}")
    }
  }
