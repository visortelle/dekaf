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

  test("CS-FC-1: the per-stream watermark engages under the armed listener, and the exact count survives") {
    // B: 30,000 OLD messages. A: 3,000 NEW ones. Global skip of 31,995 must drop every B message
    // FIRST (they are globally oldest), which takes real seconds - and in that window all of A
    // arrives and can do nothing but QUEUE, sailing past the per-stream watermark (1,000), so
    // A's consumer is paused from inside its own listener callback and resumed as the queue
    // drains, cycling until the budget lands. What this pins end to end: pausing a consumer
    // mid-listener neither deadlocks the session (a hang fails the await) nor loses or
    // double-counts anything (the final count is EXACT: 31,995 dropped of 33,000 leaves 1,005,
    // independent of every timing). What it deliberately does not claim: that a silently
    // non-pausing consumer.pause() would be detected - that would only weaken the memory bound,
    // which no black-box assertion can see; the hook INVOCATION is pinned by the ordering-layer
    // unit suite.
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    fixtures.produceStringsFast(fqnB, 30000) // first, so B is the globally-oldest block
    fixtures.produceStrings(fqnA, 3000)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("31995")
    cs.play()
    cs.assertState("running")

    cs.awaitLoaded(1005, timeoutMs = 120000)
    page.waitForTimeout(1500) // anything past 1,005 would arrive right behind it
    assert(cs.loadedCount == 1005, s"exactly 1005 must remain after skipping 31995 of 33000, got ${cs.loadedCount}")

    // Slow positioning is not degraded positioning: every stream kept speaking.
    assertThat(cs.startFromDegradedBanner).not().isVisible()
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
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("600000")
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
    assert(banner.contains("1 stream"), s"the banner should count the abandoned streams, got: '$banner'")

    // Nothing was delivered - the budget is unspendable by design - and the session is still
    // alive and positioning, not crashed: degradation is a disclosure, never a failure.
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
