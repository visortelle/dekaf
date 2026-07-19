package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

class CsLifecycleSpec extends DekafSuite:
  private def topicWith(n: Int): (String, String, String) =
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", n)
    (t, ns, topic)

  private def runningSession(n: Int): ConsumerSessionPage =
    val (t, ns, topic) = topicWith(n)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.assertState("running")
    cs

  test("CS-18: wheel-scroll (up) on a running session transitions to paused") {
    val cs = runningSession(5)
    cs.wheelUpOverTable()
    cs.assertState("paused")
  }

  test("CS-18: clicking a row on a running session transitions to paused") {
    val cs = runningSession(5)
    cs.clickFirstMessage()
    cs.assertState("paused")
  }

  test("CS-18: window/visibility blur transitions a running session to paused") {
    val cs = runningSession(5)
    cs.blurWindow()
    cs.assertState("paused")
  }

  test("CS-19: running caps the displayed set at 250; pausing reveals all") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 300) // values "msg-1".."msg-300", all contain "msg-"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()

    // Ensure all 300 are loaded BEFORE pausing (otherwise "paused" could show < 300).
    assertThat(cs.loaded).hasText("300", new LocatorAssertions.HasTextOptions().setTimeout(30000))
    cs.assertState("running")

    // A search matching every message surfaces the (non-virtualized) count.
    cs.searchInResults("msg-")
    assertThat(cs.numFound).hasText("250", new LocatorAssertions.HasTextOptions().setTimeout(10000)) // running slice = last 250

    cs.pauseFromToolbar()
    cs.assertState("paused")
    assertThat(cs.numFound).hasText("300", new LocatorAssertions.HasTextOptions().setTimeout(10000)) // cap lifted
  }
