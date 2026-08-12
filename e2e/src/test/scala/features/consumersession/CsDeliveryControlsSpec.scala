package features.consumersession

import harness.DekafSuite

/** The two browser-wide delivery controls in the toolbar: "msg/s limit" and "pause after".
  *
  * Both live in localStorage and ride the session's requests - the rate on each Resume, the
  * auto-pause purely client-side - so neither is part of the session's saved definition. What only
  * an end-to-end test can see: that the number typed into the toolbar actually SLOWS a real
  * session against a real broker, and that the auto-pause lands the session in `paused` near the
  * threshold rather than merely somewhere.
  *
  * THE RATE IS A BAND, THE BUDGET IS EXACT - deliberately different assertions. A rate of 100/s
  * starts with a full one-second burst (by design: the first screenful paints at once) and the UI
  * flushes every 250ms, so a fixed observation window can only assert a corridor. "Pause after n"
  * carries a server-side delivery budget, so its count is asserted with EQUALITY: exactly n, then
  * exactly n more. The offline arithmetic lives in deliveryRateLimiterTest and deliveryBudgetTest;
  * what this spec pins is that the whole path is wired against a real broker.
  */
class CsDeliveryControlsSpec extends DekafSuite:

  /** Every test leaves the browser-wide settings OFF, so no later spec inherits a throttle. */
  private def clearControls(cs: ConsumerSessionPage): Unit =
    cs.setRateLimit(0)
    cs.setPauseAfter(0)

  test("DC-1: the rate limit slows a real session, and clearing it restores full speed") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 2000)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    try
      cs.setRateLimit(100)
      cs.setStartFrom("Earliest message")
      cs.play()

      // ~4s at 100/s: the burst (100) plus ~400 paced, with generous slack for the stack under
      // load. The line that matters is the ceiling: WELL under the 2000 an unlimited session
      // loads in this window (DC-1's second half proves that below, on the same topic).
      page.waitForTimeout(4000)
      val limited = cs.loadedCount
      assert(cs.state == "running", s"expected a throttled session to still be running, got '${cs.state}'")
      assert(limited >= 100, s"the first second's burst should have painted at least the rate, got $limited")
      // The ideal is ~500 (the 100 burst + ~4s at 100/s). 800 tolerates stack jitter but convicts
      // a limiter running 2x fast or worse; the old 1500 ceiling waved a 3x-broken limiter through.
      assert(limited <= 800, s"a 100/s limit should not have loaded $limited messages in ~4s")

      // Clear the limit and restart: the same topic must now load completely FASTER than the
      // throttled run's theoretical minimum ever could - a still-active 100/s limiter needs ~19s
      // for the remaining 1900, so finishing inside 12s proves the limit is genuinely off.
      cs.stop()
      cs.setRateLimit(0)
      cs.play()
      cs.awaitLoaded(2000, timeoutMs = 12000)
    finally clearControls(cs)
  }

  test("DC-2: pause-after lands the session in `paused` near the threshold, and Play re-arms it") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 2000)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    try
      // The rate limit keeps the overshoot small: at 200/s, the chunks that land while the pause
      // RPC is in flight are tens of messages, not the rest of the topic.
      cs.setRateLimit(200)
      cs.setPauseAfter(300)
      cs.setStartFrom("Earliest message")
      cs.play()

      // EXACTLY 300, not a band: the server-side delivery budget stops the stream at the
      // message that spends the last unit, so no chunk latency and no rate-limit burst can
      // overshoot it. The client's pause lands after; the count is already settled.
      cs.assertState("paused", timeoutMs = 30000)
      val firstStop = cs.loadedCount
      assert(firstStop == 300, s"'pause after 300' must load exactly 300, got $firstStop")

      // Play again: both halves re-arm - the client threshold at "current + n", the server budget
      // at n more - so Play behaves as "give me exactly 300 more".
      cs.play()
      cs.assertState("paused", timeoutMs = 30000)
      val secondStop = cs.loadedCount
      assert(secondStop == 600, s"the re-armed budget must land at exactly 600, got $secondStop")
    finally clearControls(cs)
  }

  test("DC-3: both controls are REMEMBERED across a reload - they belong to the browser") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    try
      cs.setRateLimit(123)
      cs.setPauseAfter(456)

      page.reload()
      val reloaded = ConsumerSessionPage(page)
      assert(reloaded.rateLimitInput.inputValue() == "123", s"rate limit lost on reload: '${reloaded.rateLimitInput.inputValue()}'")
      assert(reloaded.pauseAfterInput.inputValue() == "456", s"pause-after lost on reload: '${reloaded.pauseAfterInput.inputValue()}'")
    finally clearControls(ConsumerSessionPage(page))
  }
