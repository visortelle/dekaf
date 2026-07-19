package features.consumersession

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.Schema

class CsFiltersSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private def vis           = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)
  private def hasText       = new LocatorAssertions.HasTextOptions().setTimeout(10000)
  private def hasV          = new LocatorAssertions.HasValueOptions().setTimeout(10000)

  private def produce(fqn: String, values: Seq[String]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try values.foreach(p.send) finally p.close()

  test("CS-8: add a filter, switch Basic<->JS, enable/negate, AND/OR group") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    val f = cs.sessionFilterPanel

    f.addFilter()
    assertThat(f.opSelect).isVisible(vis)                 // filter added -> op select present

    f.switchToJs()                                        // Basic -> JavaScript
    assertThat(f.jsEditor).isVisible(vis)
    f.switchToBasic()                                     // back to Basic
    assertThat(f.opSelect).isVisible(vis)

    // enable toggle flips its state (OnOffToggle tooltip text is state-specific).
    assertThat(f.enableToggle.first()).hasAttribute("data-tooltip-html", "Enabled")
    f.enableToggle.first().click()
    assertThat(f.enableToggle.first()).hasAttribute("data-tooltip-html", "Disabled")
    f.enableToggle.first().click()

    f.negateToggle.first().click()                        // exercise negate (no throw)

    // AND/OR group appears only with >= 2 filters.
    f.addFilter()
    assertThat(f.logicToggle).hasText("AND", hasText)
    f.logicToggle.click()
    assertThat(f.logicToggle).hasText("OR", hasText)
  }

  test("CS-9: choosing an operator reveals its value input and holds the entered value") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    val f = cs.sessionFilterPanel

    f.addFilter()
    f.setOp("string includes")
    f.setValue("abc")
    assertThat(f.valueInput.first()).hasValue("abc", hasV)
  }

  // The messages are interleaved and the LAST one is a matching "keep-last" sentinel. Because a
  // single-partition topic delivers in order, the sentinel appearing means every earlier message was
  // already processed - so we can then assert the EXACT retained set. A no-op filter would also show
  // the skips (fails the set); an inverted filter would drop the sentinel (times out) - neither can
  // pass by reaching a transient count of 3, which the old `hasCount(3)` allowed.
  private val filterInput  = Seq("keep-1", "skip-1", "keep-2", "skip-2", "keep-last")
  private val filterKept   = Set("keep-1", "keep-2", "keep-last")

  private def assertFilteredToKept(cs: ConsumerSessionPage): Unit =
    cs.setStartFrom("Earliest message")
    cs.play()
    val values = eventually() {
      val vs = cs.columnValues("value")
      assert(vs.contains("keep-last"), s"sentinel not loaded yet: $vs")
      vs
    }
    assert(values.toSet == filterKept, s"filtered values were: $values (expected exactly $filterKept)")
    assert(!values.exists(_.startsWith("skip")), s"a skip-* leaked through the filter: $values")

  // CS-10/CS-11 stream through the PER-TARGET filter chain (the primary, always-visible path a user
  // drives); CS-10s covers the SESSION-level chain. Both now filter correctly. A session-level miss
  // previously HALTED the stream at the first non-matching message - ConsumerSessionRunner emitted a
  // zero-message response that the client reads as end-of-stream; fixed 2026-07-19 to emit a count-only
  // placeholder like the per-target path. CS-10s is the regression guarding that fix.
  test("CS-10 (P0): a BASIC filter actually filters the streamed rows") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    produce(s"persistent://$t/$ns/$topic", filterInput)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    val f = cs.targetFilterPanel
    f.addFilter()
    f.setOp("string includes")
    f.setValue("keep")

    assertFilteredToKept(cs)
  }

  test("CS-11: a JS filter filters the streamed rows") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    produce(s"persistent://$t/$ns/$topic", filterInput)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    val f = cs.targetFilterPanel
    f.addFilter()
    f.switchToJs()
    f.writeJs("(v) => v.includes(\"keep\")")

    assertFilteredToKept(cs)
  }

  // Regression for the session-level filter halt (ConsumerSessionRunner zero-message response): the
  // SESSION chain must skip non-matching messages and keep streaming, not stop at the first miss.
  test("CS-10s: a SESSION-level basic filter skips non-matches and keeps streaming") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    produce(s"persistent://$t/$ns/$topic", filterInput)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    val f = cs.sessionFilterPanel
    f.addFilter()
    f.setOp("string includes")
    f.setValue("keep")

    assertFilteredToKept(cs)
  }
