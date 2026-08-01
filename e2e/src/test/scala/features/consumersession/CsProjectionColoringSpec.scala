package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.SelectOption
import org.apache.pulsar.client.api.Schema
import scala.jdk.CollectionConverters.*

class CsProjectionColoringSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private def vis           = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)
  private def contains      = new LocatorAssertions.ContainsTextOptions().setTimeout(20000)
  private def css           = new LocatorAssertions.HasCSSOptions().setTimeout(20000)

  private def produce(fqn: String, values: Seq[String]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try values.foreach(p.send) finally p.close()

  private def produceKeyed(fqn: String, keyed: Seq[(String, String)]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try keyed.foreach((k, v) => p.newMessage().key(k).value(v).send()) finally p.close()

  /** The rendered PROJECTION cells, in row order.
    *
    * A projection `<td>` carries no test-id of its own (the projections are a variable-length run of
    * columns), but its position is fixed by `Message.tsx`: the projections sit immediately before
    * the instrumented value cell. Addressing them relative to that anchor reads the real projected
    * output without asking `ui/` for new instrumentation. */
  private def projectionCells(cs: ConsumerSessionPage): List[String] =
    page.locator("[data-testid='cs-message-value']").locator("xpath=preceding-sibling::td[1]")
      .allInnerTexts().asScala.toList.map(_.trim)

  test("CS-12 (P0): a projection adds a column whose header is its label and whose cells hold the projected value") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    // Distinct key and value per message, so a projection OF THE KEY cannot be satisfied by
    // rendering the value column twice - which is what an assertion on the header alone allowed.
    produceKeyed(fqn, (1 to 3).map(i => s"k-$i" -> s"m-$i"))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()
    cs.addProjection()
    cs.projectionLabel.first().fill("MyCol")
    // Project the message KEY rather than the default (the whole value). The target select has no
    // test-id; its option values are the discriminator, and are unique to this control on the page.
    cs.sessionProjections.locator("select:has(option[value='BasicMessageFilterKeyTarget'])")
      .first().selectOption(new SelectOption().setValue("BasicMessageFilterKeyTarget"))

    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(3, count(3))
    assertThat(cs.projectionColumnHeader).hasCount(1, count(1))
    assertThat(cs.projectionColumnHeader).containsText("MyCol", contains)

    // THE assertion: the projected VALUES, exactly, row by row - the server really evaluated the
    // projection and the results really landed in the right rows. The header is generated entirely
    // from local config and would render identically for a projection that computed nothing.
    assert(
      projectionCells(cs) == List("\"k-1\"", "\"k-2\"", "\"k-3\""),
      s"the projection column holds ${projectionCells(cs)}"
    )
    // ... and it is the KEY, not a second copy of the value column beside it.
    assert(cs.columnValues("value") == List("m-1", "m-2", "m-3"), s"the value column holds ${cs.columnValues("value")}")
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
    // The raw bytes on the wire are the seven characters  "apple"  - a JSON string INCLUDING its
    // quotes. That is what makes the two deserializers distinguishable: one more decode step
    // removes exactly one layer of quoting.
    produce(fqn, Seq("\"apple\""))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(1, count(1))
    // Topic STRING schema: the bytes decode to the 7-character string `"apple"`, which the value
    // column then renders as JSON - so the quotes are escaped and a second pair is added.
    // `columnValues` strips the outer rendering pair, leaving the decoded string itself.
    assert(cs.columnValues("value") == List("\\\"apple\\\""), s"schema rendering was ${cs.columnValues("value")}")

    cs.stop()                                            // back to config view
    cs.setDeserializer("Treat raw bytes as JSON")
    cs.play()
    assertThat(cs.messages).hasCount(1, count(1))
    // Raw bytes as JSON: the same bytes are PARSED, so the value is the string `apple` with no
    // quotes of its own, rendered with one pair which `columnValues` strips.
    //
    // Both renderings are pinned exactly, not merely asserted to differ: "they differ" is satisfied
    // by any two wrong answers - a decode that dropped a character, or an error placeholder in
    // either leg - which is what this test used to accept.
    assert(cs.columnValues("value") == List("apple"), s"JSON rendering was ${cs.columnValues("value")}")
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
