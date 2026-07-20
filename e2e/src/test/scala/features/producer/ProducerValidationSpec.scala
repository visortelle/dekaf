package features.producer

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.options.AriaRole
import org.apache.pulsar.client.api.{Schema, SubscriptionInitialPosition}
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

class ProducerValidationSpec extends DekafSuite:

  test("PRD-3: invalid JSON is rejected with a specific error and nothing is published") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    page.waitForTimeout(500)
    if page.getByText("Pulsar Credentials").isVisible then
      page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Done").setExact(true)).click()

    // JSON encoding is the default; a bare word is invalid JSON (and free of brace auto-closing).
    val editor = page.getByTestId("produce-value").locator(".monaco-editor").first()
    editor.click()
    page.keyboard().`type`("notjson")
    // dispatchEvent, not click(): with INVALID input Monaco keeps re-rendering its error markers,
    // and on the slow CI box the button below never passes Playwright's stability check
    // ("element is not stable" x30s). The button's real clickability is covered by PRD-2.
    page.getByTestId("produce-send").dispatchEvent("click")

    // The specific validation error is shown (Producer.tsx:84) and the success toast never appears.
    // (Use the CASE_INSENSITIVE flag, not an inline (?i) - the browser JS regex engine rejects (?i).)
    assertThat(page.getByText(Pattern.compile("Unable to send message", Pattern.CASE_INSENSITIVE)))
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    assertThat(page.getByText("Message successfully sent")).hasCount(0)

    // Broker oracle: nothing was published - a short consume must time out empty.
    val consumer = client.newConsumer(Schema.BYTES)
      .topic(fqn)
      .subscriptionName(fixtures.unique("verify"))
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      .subscribe()
    try
      val msg = consumer.receive(3, TimeUnit.SECONDS)
      assert(msg == null, s"expected no published message, but consumed: ${if msg != null then new String(msg.getValue) else "<null>"}")
    finally consumer.close()
  }
