package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import org.apache.pulsar.client.api.MessageId

/** Navigate-and-render coverage: each page loads the right resource (cross-checked by a
  * resource-specific string appearing) rather than 404-ing or hanging. */
class RenderSpec extends DekafSuite:

  test("INS-1: instance overview shows Pulsar instance info") {
    page.navigate("/overview")
    assertThat(page.getByText("Pulsar Instance")).isVisible()
    assertThat(page.getByText("dekaf-e2e-local").first()).isVisible()
  }

  test("INS-2: tenants list shows a created tenant") {
    val t = fixtures.createTenant()
    page.navigate("/tenants")
    assertThat(page.getByText(t).first()).isVisible()
  }

  test("TEN-3: namespaces list shows a created namespace") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    page.navigate(s"/tenants/$t/namespaces")
    assertThat(page.getByText(ns).first()).isVisible()
  }

  test("NS-2: topics list shows a created topic") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics")
    assertThat(page.getByText(topic).first()).isVisible()
  }

  test("TOP-1: topic overview renders topic metadata") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    assertThat(page.getByText("Topic Name").first()).isVisible()
    assertThat(page.getByText(topic).first()).isVisible()
  }

  test("TOP-6: subscriptions list shows a created subscription") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions")
    assertThat(page.getByText(sub).first()).isVisible()
  }

  test("SUB-1: subscription overview renders the subscription") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview")
    assertThat(page.getByText(sub).first()).isVisible()
  }

  test("SUB-2: consumers list page renders") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/consumers")
    assertThat(page.getByText(sub).first()).isVisible()
  }
