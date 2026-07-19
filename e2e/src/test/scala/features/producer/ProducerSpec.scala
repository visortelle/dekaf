package features.producer

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import org.apache.pulsar.client.api.{Schema, SubscriptionInitialPosition}
import java.util.concurrent.TimeUnit

class ProducerSpec extends DekafSuite:

  test("PRD-1: producing a JSON message publishes it to the broker") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools() // open the console (force-click; its tooltip can overlay the button)

    // A first Pulsar op may raise the credentials onboarding modal - dismiss it.
    page.waitForTimeout(500)
    if page.getByText("Pulsar Credentials").isVisible then
      page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Done").setExact(true)).click()

    // JSON encoding (the default); 4242 is valid JSON (a number) and free of Monaco brace/quote auto-close.
    page.getByTestId("produce-encoding").selectOption(new SelectOption().setValue("json"))
    page.getByTestId("produce-key").fill("k1")
    val editor = page.getByTestId("produce-value").locator(".monaco-editor").first()
    editor.click()
    page.keyboard().`type`("4242")
    page.getByTestId("produce-send").click()
    assertThat(page.getByText("Message successfully sent")).isVisible()

    // Broker oracle: the message is actually published - consume it and assert value + key
    // (JSON mode sends the raw UTF-8 string bytes after JSON.parse validation - lib.ts:20).
    val consumer = client.newConsumer(Schema.BYTES)
      .topic(fqn)
      .subscriptionName(fixtures.unique("verify"))
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      .subscribe()
    try
      val msg = consumer.receive(10, TimeUnit.SECONDS)
      assert(msg != null, "expected the produced JSON message on the broker")
      assert(new String(msg.getValue) == "4242", s"value was: ${new String(msg.getValue)}")
      assert(msg.getKey == "k1", s"key was: ${msg.getKey}")
    finally consumer.close()
  }
