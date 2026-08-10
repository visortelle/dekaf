package features.consumersession

import harness.DekafSuite

/** PAUSE IS FAST AND LOSSLESS - both halves of the fast-pause contract, proven together.
  *
  * `paused` now lands on the server's confirmation (intake closed, everything unsent held), not on
  * the old "quiet second" of the loaded-rate gauge - so the button flips in an RPC round trip and
  * the in-flight tail finishes rendering into the paused view. What makes that flip honest is the
  * server's ledger: prefetched messages refused at the closed gate are handed back for redelivery,
  * the limiter's backlog waits unacknowledged, and whatever was already sent lands and is counted.
  *
  * This spec drives that ledger hard and then demands the books balance to the message:
  *
  *   - a 50,000-message backlog is drained through repeated HOT pauses - clicked mid-flow with the
  *     prefetch queues full, which is exactly the refuse-at-the-gate / redeliver-on-resume path;
  *   - one more burst is produced INTO a paused session - the retention path: a paused session
  *     must deliver NOTHING and hand it all over on resume;
  *   - and the final set must be EXACTLY the 55,000 the broker holds, message for message.
  *
  * WHY THE SET AND NOT THE COUNT. This test used to end on `loaded == 55,000` alone, and that
  * number cannot tell a correct run from a plausible one: one message lost anywhere plus one
  * delivered twice anywhere reaches it exactly. Worse, `cs-loaded` is not even read from the
  * delivered rows - it is the server's own `numMessageSent` - so a message counted but never
  * shown, or shown but never counted, is invisible to it. Every payload here is therefore UNIQUE
  * (`bk-*` for the backlog, `burst-*` for what is produced into the pause), the expectation is
  * read back from the BROKER, and the delivered set is read out of the app's own export.
  * `harness.DeliveredMessagesSpec` pins that this comparison really does catch what the count
  * cannot. The counts are kept alongside it, deliberately - see the assertions at the end.
  */
class CsPauseLoopSpec extends DekafSuite:

  private val backlog = 50_000
  private val pausedBurst = 5_000
  private val total = backlog + pausedBurst

  /** Poll the loaded counter until it reaches `n` (the toolbar counter moves before rows paint,
    * and mid-drain there is no exact value to wait for - only a threshold to cross). */
  private def awaitLoadedAtLeast(cs: ConsumerSessionPage, n: Int, timeoutMs: Long): Unit =
    val deadline = System.currentTimeMillis() + timeoutMs
    var current = cs.loadedCount
    while current < n && System.currentTimeMillis() < deadline do
      Thread.sleep(200)
      current = cs.loadedCount
    assert(current >= n, s"loaded $current, expected at least $n within ${timeoutMs}ms")

  test("CS-PL-1: 50,000 messages through a hot pause/resume loop - instant pauses, exact SET, zero loss") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStringsFast(fqn, backlog, prefix = "bk")

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    // RETENTION IS PART OF THE ARRANGEMENT. A session keeps 10,000 messages on screen by default
    // and drops its oldest past that, which would leave 45,000 of these unobservable and reduce
    // the whole test back to a count. Asking for more than the run produces is what makes the
    // delivered set readable at all; `retainedCount` below proves the ask took effect.
    cs.setNumDisplayItems(total + 5_000)
    cs.play()

    // Four pauses clicked HOT - mid-drain, prefetch full, frames in flight. Each pause must
    // confirm promptly (the RPC plus a React commit, nowhere near the old gauge's multi-second
    // quiet window), and each resume must pick the drain back up without dropping or repeating
    // whatever the closed gate refused.
    (1 to 4).foreach { round =>
      awaitLoadedAtLeast(cs, n = round * 8000, timeoutMs = 120000)
      cs.pauseFromToolbar()
      cs.assertState("paused", timeoutMs = 5000)
      cs.play()
      cs.assertState("running", timeoutMs = 20000)
    }

    cs.awaitLoaded(backlog, timeoutMs = 180000)

    // The retention leg: produce INTO the paused session. A paused session delivers NOTHING - and
    // that is asserted from BOTH sources, the server's counter and the browser's own buffer, so a
    // delivery that moved only one of them cannot pass.
    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 5000)
    val loadedWhilePaused = cs.loadedCount
    val retainedWhilePaused = cs.retainedCount
    fixtures.produceStringsFast(fqn, pausedBurst, prefix = "burst")
    Thread.sleep(1500)
    assert(
      cs.loadedCount == loadedWhilePaused,
      s"a paused session delivered messages: $loadedWhilePaused -> ${cs.loadedCount}"
    )
    assert(
      cs.retainedCount == retainedWhilePaused,
      s"a paused session added rows: $retainedWhilePaused -> ${cs.retainedCount}"
    )

    cs.play()
    cs.awaitLoaded(total, timeoutMs = 120000)

    // THE COUNTS, KEPT ON PURPOSE - do not "simplify" them away when the set assertion below
    // already looks stronger. They are read from a DIFFERENT source than the set (the server's
    // numMessageSent, and the browser's buffer length) and they are read AFTER a quiet window, so
    // together they catch the one thing a set comparison cannot: a straggling extra delivery that
    // arrives after the set first matched.
    Thread.sleep(2000)
    assert(
      cs.loadedCount == total,
      s"expected exactly $total, got ${cs.loadedCount} - a loss deflates, a duplicate inflates"
    )
    assert(cs.state == "running", s"the session must still be healthy, got '${cs.state}'")
    assert(
      cs.retainedCount == total,
      s"the browser holds ${cs.retainedCount} of $total messages - display retention dropped rows, so the " +
        "exported set below would be a tail rather than the whole delivery (raise setNumDisplayItems)"
    )

    // THE SET. The expectation comes from the broker, not from the produce call: what the topic
    // really holds is the only ground truth for what the session should have shown.
    val onTheBroker = fixtures.readAllMessages(fqn).map(_.getValue).toList
    assert(
      onTheBroker.size == total && onTheBroker.distinct.size == total,
      s"arrangement broken: the broker holds ${onTheBroker.size} message(s), ${onTheBroker.distinct.size} distinct, " +
        s"expected $total unique - the payloads must be unique or the set below proves nothing"
    )

    cs.pauseFromToolbar()
    cs.assertState("paused", timeoutMs = 15000)
    DeliveredMessages.assertExactly(
      cs.exportedValues(),
      onTheBroker,
      "the pause loop delivered a different set than the broker holds"
    )
    cs.stop()
  }
