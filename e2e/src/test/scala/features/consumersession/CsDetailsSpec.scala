package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.{Schema, SubscriptionInitialPosition}
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

class CsDetailsSpec extends DekafSuite:
  private def hasText      = new LocatorAssertions.HasTextOptions().setTimeout(20000)
  private def containsText = new LocatorAssertions.ContainsTextOptions().setTimeout(20000)
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)

  private final case class MessageViewport(
    firstRenderedIndex: Int,
    scrollTop: Double,
    x: Double,
    y: Double,
    width: Double,
    height: Double
  )

  private def messageViewport(cs: ConsumerSessionPage): MessageViewport =
    val box = cs.tableScroller.boundingBox()
    assert(box != null, "the virtualized message viewport has no live bounding box")
    MessageViewport(
      firstRenderedIndex = cs.firstRenderedIndex,
      scrollTop = cs.tableScrollTop,
      x = box.x,
      y = box.y,
      width = box.width,
      height = box.height
    )

  private def assertViewportUnchanged(expected: MessageViewport, actual: MessageViewport, after: String): Unit =
    assert(actual.firstRenderedIndex == expected.firstRenderedIndex,
      s"the first rendered message jumped $after: ${expected.firstRenderedIndex} -> ${actual.firstRenderedIndex}")
    assert(math.abs(actual.scrollTop - expected.scrollTop) <= 1,
      s"the message list scroll offset jumped $after: ${expected.scrollTop} -> ${actual.scrollTop}")

    val geometryDelta = List(
      "x" -> math.abs(actual.x - expected.x),
      "y" -> math.abs(actual.y - expected.y),
      "width" -> math.abs(actual.width - expected.width),
      "height" -> math.abs(actual.height - expected.height)
    )
    assert(geometryDelta.forall(_._2 <= 1),
      s"the message viewport geometry changed $after: $expected -> $actual; deltas: $geometryDelta")

  private def loadedPaused(n: Int): ConsumerSessionPage =
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", n)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs

  // CS-23 used to assert only that the panel OPENS - a panel rendering an empty shell, or another
  // message entirely, passed. It now pins the panel's CONTENT, tab by tab, against what the broker
  // actually stored (read back with the Pulsar client) rather than against the UI's own table view.
  test("CS-23: MessageDetails shows the published key, value, metadata and properties") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    val key          = "cs23-key"
    val value        = "cs23-value-payload" // no spaces: survives Monaco's tokenized rendering verbatim
    val producerName = fixtures.unique("cs23-producer")
    val properties   = Map("cs23-prop-a" -> "alpha", "cs23-prop-b" -> "beta")

    val producer = client.newProducer(Schema.STRING).producerName(producerName).topic(fqn).create()
    try
      val builder = producer.newMessage().key(key).value(value)
      properties.foreach { case (k, v) => builder.property(k, v) }
      builder.send()
    finally producer.close()

    // GROUND TRUTH: read the message back off the broker. Everything below is asserted against
    // THIS, so a UI that renders its own stale copy (or the wrong message) can't pass.
    val oracleConsumer = client.newConsumer(Schema.STRING)
      .topic(fqn)
      .subscriptionName(fixtures.unique("cs23-oracle"))
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      .subscribe()
    val stored =
      try
        val m = oracleConsumer.receive(15, TimeUnit.SECONDS)
        assert(m != null, "the oracle consumer received no message")
        (m.getKey, m.getValue, m.getProducerName, m.getProperties.asScala.toMap)
      finally oracleConsumer.close()
    val (storedKey, storedValue, storedProducer, storedProps) = stored
    assert(
      stored == (key, value, producerName, properties),
      s"the broker stored something else than we published: $stored"
    )

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(1)
    cs.pauseFromToolbar()
    cs.assertState("paused")

    cs.clickFirstMessage()
    assertThat(cs.messageDetails).isVisible()

    // --- Value tab (the default one) ---
    // A STRING key/value crosses the wire JSON-encoded (messageConverters: `msg.getKey.asJson`),
    // so the panel renders it JSON-quoted - assert that exact rendering, not a substring.
    assertThat(cs.messageDetails.getByTestId("cs-cell-key")).hasText(s"\"$storedKey\"", hasText)
    // The value itself is shown in a Monaco viewer (JsonView), so assert its rendered text.
    assertThat(cs.messageDetails.locator(".monaco-editor")).containsText(storedValue, containsText)

    // --- Metadata tab ---
    cs.messageDetails.getByTestId("cs-details-tab-metadata").click()
    assertThat(cs.messageDetails.getByTestId("cs-cell-topic")).hasText(fqn, hasText)
    assertThat(cs.messageDetails.getByTestId("cs-cell-key")).hasText(s"\"$storedKey\"", hasText)
    // The producer name is broker-reported, and we pinned it on the producer - so it is a real
    // metadata round-trip, not a value the UI could have echoed from the row it was clicked on.
    assertThat(cs.messageDetails).containsText(storedProducer, containsText)

    // --- Properties tab ---
    val propertiesTab = cs.messageDetails.getByTestId("cs-details-tab-properties")
    assertThat(propertiesTab).hasText(s"Properties ${storedProps.size}", hasText) // count in the tab title
    propertiesTab.click()
    // Only the active tab is mounted, so these are exactly the read-only property key/value inputs.
    val propertyInputs = cs.messageDetails.locator("input")
    assertThat(propertyInputs).hasCount(storedProps.size * 2, count(storedProps.size * 2))
    val shown = propertyInputs.all().asScala.toList
      .map(_.inputValue())
      .grouped(2)
      .map(pair => pair.head -> pair.last)
      .toMap
    assert(shown == storedProps, s"the Properties tab showed $shown, the broker has $storedProps")
  }

  test("CS-24: MessageDetails closes only via its close button") {
    val cs = loadedPaused(3)
    cs.clickFirstMessage()
    assertThat(cs.messageDetails).isVisible()

    // Clicking elsewhere keeps a single selection -> panel stays open.
    cs.messages.nth(1).click()
    assertThat(cs.messageDetails).isVisible()
    cs.th("key").click()
    assertThat(cs.messageDetails).isVisible()

    cs.messageDetailsClose.click()
    assertThat(cs.messageDetails).isHidden()
  }

  test("CS-24R: MessageDetails width is resizable and persists across closing and reload") {
    val cs = loadedPaused(3)
    cs.openTools()
    cs.clickFirstMessage()
    assertThat(cs.messageDetailsResizeHandle).isVisible()

    // Preserve the former 600rem default (540 CSS px under Dekaf's 0.9px root scale).
    val defaultWidth = cs.messageDetailsDomWidth
    assert(math.abs(defaultWidth - 540) <= 3,
      s"the resizable inspector changed its old 600rem default: $defaultWidth")

    // Restore an oversized preference, then recreate the runtime view. The grid caps it to 85%
    // without rewriting storage, and the first drag must start from that VISIBLE capped width.
    cs.setStoredPaneSize("consumer-session-message-inspector", 1080)
    page.reload()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(3)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs.clickFirstMessage()
    assertThat(cs.messageDetailsResizeHandle).isVisible()

    val before = cs.messageDetailsDomWidth
    val contentWidth = before + cs.tableDomWidth
    assert(before >= contentWidth * 0.80 - 3,
      s"inspector should be draggable well beyond the old 65% cap: $before of $contentWidth")
    assert(before <= contentWidth * 0.85 + 3,
      s"oversized inspector preference was not capped: $before of $contentWidth")
    assert(cs.storedPaneSize("consumer-session-message-inspector") == 1080,
      s"responsive cap must not overwrite the preference: ${cs.storedPaneSize("consumer-session-message-inspector")}")

    // Drive the inspector's left edge right. For a right-hand pane that must SHRINK its live width.
    cs.resizeMessageDetailsBy(100)
    val resized = cs.messageDetailsDomWidth
    assert(resized < before - 40, s"dragging the inspector edge right did not shrink it: $before -> $resized")
    val stored = cs.storedPaneSize("consumer-session-message-inspector")
    assert(stored > 0, s"the resized inspector width was not persisted: $stored")

    // Closing a message only removes the pane; selecting one again must restore the chosen width.
    cs.messageDetailsClose.click()
    assertThat(cs.messageDetails).isHidden()
    cs.clickFirstMessage()
    assertThat(cs.messageDetailsResizeHandle).isVisible()
    val afterReopen = cs.messageDetailsDomWidth
    assert(math.abs(afterReopen - resized) <= 3,
      s"MessageDetails width changed after close/reopen: $resized -> $afterReopen")

    // The two optional panes can coexist: opening the bottom panel must not collapse or reset the
    // right pane (both affect the same ConsumerSession grid). The panel is open by default, so it
    // is first genuinely closed and then re-OPENED - the coexistence claim is about the act of
    // opening, and closeTools() alone here used to prove nothing (and failed the very next line,
    // which asserts the handle only an OPEN panel renders).
    cs.closeTools()
    cs.openTools()
    assertThat(cs.toolsResizeHandle).isVisible()
    assertThat(cs.messageDetailsResizeHandle).isVisible()
    assert(cs.toolsPanelDomHeight > 150, s"Tools collapsed while MessageDetails was open: ${cs.toolsPanelDomHeight}")
    assert(math.abs(cs.messageDetailsDomWidth - resized) <= 3,
      s"opening Tools changed the inspector width: $resized -> ${cs.messageDetailsDomWidth}")
    cs.closeTools()

    // Reload resets the running session, but the browser-local pane preference must survive.
    page.reload()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(3)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs.clickFirstMessage()
    assertThat(cs.messageDetailsResizeHandle).isVisible()
    assert(cs.storedPaneSize("consumer-session-message-inspector") == stored,
      s"stored inspector width changed across reload: $stored -> ${cs.storedPaneSize("consumer-session-message-inspector")}")
    val afterReload = cs.messageDetailsDomWidth
    assert(math.abs(afterReload - resized) <= 3,
      s"persisted MessageDetails width was not re-applied after reload: $resized -> $afterReload")

    // The lower bound is intentionally compact too, for users prioritising the message table.
    cs.resizeMessageDetailsBy(2000)
    assert(cs.messageDetailsDomWidth <= 175,
      s"inspector could not be dragged down to its expanded minimum range: ${cs.messageDetailsDomWidth}")
  }

  test("CS-24S: switching Value and Metadata keeps a scrolled message list anchored when Tools is open") {
    // A short list cannot expose the regression: react-virtuoso needs enough off-screen rows for a
    // tab-driven layout recalculation to have a different scroll position available to jump to.
    val messageCount = 120
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", messageCount)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitHeader()
    cs.awaitLoaded(messageCount)
    cs.pauseFromToolbar()
    cs.assertState("paused")

    // Open Tools first, because its reduced vertical viewport is part of the reported interaction.
    // Settle before establishing the scroll anchor so expected resizing is not mistaken for a jump.
    cs.openTools()
    assertThat(cs.toolsResizeHandle).isVisible()
    page.waitForTimeout(500)

    cs.scrollTableToTop()
    val firstAtTop = cs.firstRenderedIndex
    cs.scrollTableDown(900)
    val firstAfterScroll = cs.firstRenderedIndex
    assert(firstAfterScroll > firstAtTop,
      s"the virtualized list did not reach a meaningful middle position: $firstAtTop -> $firstAfterScroll")
    assert(cs.tableScrollTop > 100,
      s"the virtualized list did not gain a meaningful pixel scroll offset: ${cs.tableScrollTop}")

    // Select a row that is already inside the viewport. Opening the inspector is allowed to settle;
    // the invariant starts only once both optional panes and the default Value editor are visible.
    cs.messages.nth(2).click()
    assertThat(cs.messageDetails).isVisible()
    assertThat(cs.messageDetailsResizeHandle).isVisible()
    val valueTab = cs.messageDetails.getByTestId("cs-details-tab-value")
    val metadataTab = cs.messageDetails.getByTestId("cs-details-tab-metadata")
    assertThat(cs.messageDetails.locator(".monaco-editor")).isVisible(
      new LocatorAssertions.IsVisibleOptions().setTimeout(30000)
    )
    page.waitForTimeout(750)

    val anchored = messageViewport(cs)

    // Repeat: the original report was intermittent, and remounting Monaco on every return to Value
    // is the more demanding half of the transition. Check both the exact scroll offset and the
    // virtualized row anchor after each direction, while also pinning the viewport geometry.
    (1 to 3).foreach { cycle =>
      metadataTab.click()
      assertThat(cs.messageDetails.getByTestId("cs-cell-topic")).isVisible()
      page.waitForTimeout(500)
      assertViewportUnchanged(anchored, messageViewport(cs), s"after Metadata (cycle $cycle)")

      valueTab.click()
      assertThat(cs.messageDetails.locator(".monaco-editor")).isVisible(
        new LocatorAssertions.IsVisibleOptions().setTimeout(30000)
      )
      page.waitForTimeout(500)
      assertViewportUnchanged(anchored, messageViewport(cs), s"after Value (cycle $cycle)")
    }
  }

  test("CS-25: click-to-copy a cell copies + toasts; the Topic cell is a link") {
    context.grantPermissions(java.util.List.of("clipboard-read", "clipboard-write"))
    val cs = loadedPaused(3)

    cs.cell("value").first().click() // Field onClick copies the displayed value (JSON-quoted for a STRING schema)
    assertThat(page.getByText("copied to clipboard")).isVisible()
    val copied = page.evaluate("() => navigator.clipboard.readText()").toString
    assert(copied.contains("msg-1"), s"clipboard mismatch: $copied")

    // Topic renders as an <a> with an href (FQN -> route link).
    assertThat(cs.cell("topic").first()).hasAttribute("href", Pattern.compile(".+"))
  }

  test("CS-26: ArrowUp/k and ArrowDown/j move the selection and wrap at ends") {
    val cs = loadedPaused(3)
    cs.clickFirstMessage()
    assertThat(cs.selectedIndexCell).hasText("1")

    // Real keyboard path: focus the (now focusable) table, then press keys - a keyboard user must be
    // able to reach it. This would have been impossible before the tabIndex fix.
    cs.focusTable()
    cs.pressKeyOnTable("ArrowDown"); assertThat(cs.selectedIndexCell).hasText("2")
    cs.pressKeyOnTable("j");         assertThat(cs.selectedIndexCell).hasText("3")
    cs.pressKeyOnTable("ArrowDown"); assertThat(cs.selectedIndexCell).hasText("1") // wrap
    cs.pressKeyOnTable("ArrowUp");   assertThat(cs.selectedIndexCell).hasText("3") // wrap
    cs.pressKeyOnTable("k");         assertThat(cs.selectedIndexCell).hasText("2")
  }
