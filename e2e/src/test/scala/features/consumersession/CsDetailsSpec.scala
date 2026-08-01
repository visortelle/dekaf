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
