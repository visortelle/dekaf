package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.Schema

class CsProjectionColoringSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private def vis           = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)
  private def contains      = new LocatorAssertions.ContainsTextOptions().setTimeout(20000)
  private def css           = new LocatorAssertions.HasCSSOptions().setTimeout(20000)

  private def produce(fqn: String, values: Seq[String]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try values.foreach(p.send) finally p.close()

  test("CS-12 (P0): a projection adds a column whose header equals the projection label") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produce(fqn, (1 to 3).map(i => s"m-$i"))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    cs.addProjection()
    cs.projectionLabel.first().fill("MyCol")

    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(3, count(3))
    assertThat(cs.projectionColumnHeader).hasCount(1, count(1))
    assertThat(cs.projectionColumnHeader).containsText("MyCol", contains)
  }

  test("CS-13: coloring modal picks a swatch, applies it, and a matching row is colored") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produce(fqn, (1 to 3).map(i => s"c-$i"))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    cs.addColoringRule()                       // default rule = empty filter chain (matches all)

    cs.coloringBg.first().click()              // open the "Pick a Color" modal
    // 242 built-in swatches (+2 theme) carry data-tooltip-content.
    assert(page.locator("[data-tooltip-content]").count() >= 242)
    cs.pickSwatch("red-500")                    // select + auto-apply + close
    assertThat(cs.coloringBg.first()).hasCSS("background-color", "rgb(239, 68, 68)", css)

    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(3, count(3))
    // Row cells carry the rule background (server evaluates the empty chain as match-all).
    assertThat(cs.messages.first()).hasCSS("background-color", "rgb(239, 68, 68)", css)
  }

  test("CS-13b: a per-target coloring rule beats the session coloring rule") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produce(fqn, (1 to 2).map(i => s"p-$i"))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()

    // Session rule -> red.
    cs.addColoringRule()
    cs.coloringBg.first().click(); cs.pickSwatch("red-500")

    // Target rule -> green (cs-target-coloring container).
    val targetColoring = cs.target(0).root.getByTestId("cs-target-coloring")
    targetColoring.getByRole(
      com.microsoft.playwright.options.AriaRole.BUTTON,
      new com.microsoft.playwright.Locator.GetByRoleOptions().setName("Add Coloring Rule")
    ).click()
    targetColoring.getByTestId("cs-coloring-bg").first().click(); cs.pickSwatch("green-500")

    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(2, count(2))
    assertThat(cs.messages.first()).hasCSS("background-color", "rgb(34, 197, 94)", css) // green wins
  }

  test("CS-14: changing the deserializer changes how values decode") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produce(fqn, Seq("\"apple\""))              // raw bytes are the JSON string "apple" (with quotes)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(1, count(1))
    val schemaRendered = cs.firstValueCell.innerText()   // topic STRING schema -> "apple" (quoted)

    cs.stop()                                            // back to config view
    cs.setDeserializer("Treat raw bytes as JSON")
    cs.play()
    assertThat(cs.messages).hasCount(1, count(1))
    val jsonRendered = cs.firstValueCell.innerText()     // JSON parse -> apple (unquoted)

    assert(schemaRendered != jsonRendered,
      s"deserializer change should alter value rendering: schema='$schemaRendered' json='$jsonRendered'")
  }

  test("CS-15: the Advanced reveal is one-way (once revealed, stays)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)

    assertThat(cs.advancedToggle).isVisible(vis)
    assertThat(cs.sessionFilters).hasCount(0, count(0))

    cs.revealAdvanced()
    assertThat(cs.sessionFilters).isVisible(vis)

    cs.sessionFilterPanel.addFilter()                    // adds advanced config -> reveal locks on
    assertThat(cs.advancedToggle).hasCount(0, count(0))  // toggle is gone
    assertThat(cs.sessionFilters).isVisible(vis)         // advanced section stays
  }
