package features.producer

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import org.apache.pulsar.client.api.{Schema, SubscriptionInitialPosition}
import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.*

class ProducerBytesSpec extends DekafSuite:

  /** First-run onboarding modal; dismiss if present (see ConsumerSessionPage.play). */
  private def dismissCredentialsIfPresent(): Unit =
    page.waitForTimeout(500)
    if page.getByText("Pulsar Credentials").isVisible then
      page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Done").setExact(true)).click()

  private def publisherCount(fqn: String): Int =
    admin.topics().getStats(fqn).getPublishers.size

  private def awaitPublishers(fqn: String, pred: Int => Boolean, timeoutMs: Long = 15000): Int =
    val deadline = System.currentTimeMillis() + timeoutMs
    var c = publisherCount(fqn)
    while !pred(c) && System.currentTimeMillis() < deadline do
      Thread.sleep(200); c = publisherCount(fqn)
    c

  test("PRD-2: producing in Bytes (hex) mode yields a consumable message") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools() // reveal the (already-mounted) Produce console
    dismissCredentialsIfPresent()

    page.getByTestId("produce-encoding").selectOption(new SelectOption().setLabel("Bytes (hex)"))
    page.getByTestId("produce-key").fill("k-bytes")
    val editor = page.getByTestId("produce-value").locator(".monaco-editor").first()
    editor.click()
    page.keyboard().`type`("6162") // hex for ASCII "ab"
    page.getByTestId("produce-send").click()
    assertThat(page.getByText("Message successfully sent")).isVisible()

    // Client cross-check: the raw bytes are consumable and match exactly.
    val consumer = client.newConsumer(Schema.BYTES)
      .topic(fqn)
      .subscriptionName(fixtures.unique("verify"))
      .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
      .subscribe()
    try
      val msg = consumer.receive(10, TimeUnit.SECONDS)
      assert(msg != null, "expected to consume the produced bytes message")
      assert(new String(msg.getValue) == "ab") // bytes 0x61 0x62
      assert(msg.getKey == "k-bytes")
    finally consumer.close()
  }

  test("PRD-4: the produce console's producer is route-scoped - present on the route, gone on leave") {
    // The Producer mounts with the consumer-session route (isRenderAlways=true), NOT on openTools, so
    // the honest claim is a route-scoped lifecycle: a `__dekaf_*` producer exists while the route is
    // mounted and is torn down (React cleanup -> deleteProducer) when we navigate away.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic) // mounts ConsumerSession -> Producer -> createProducer
    dismissCredentialsIfPresent()

    // Present-on-route (created at mount, before any Tools interaction).
    assert(awaitPublishers(fqn, _ >= 1) >= 1)
    assert(
      admin.topics().getStats(fqn).getPublishers.asScala
        .exists(p => Option(p.getProducerName).exists(_.startsWith("__dekaf_")))
    )

    // Gone-on-leave: an in-app nav away unmounts the console (React cleanup -> deleteProducer).
    // Dispatch the click directly on the <a> (react-router handles it) - the tools tooltip can overlay
    // the toolbar, so a coordinate-based click may land on the tooltip instead of the link.
    page.getByRole(AriaRole.LINK, new GetByRoleOptions().setName("Overview").setExact(true)).dispatchEvent("click")
    assert(awaitPublishers(fqn, _ == 0) == 0)
  }
