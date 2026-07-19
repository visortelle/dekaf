package routes

import harness.DekafSuite
import ui.ConfirmationDialog
import org.apache.pulsar.client.api.MessageId
import scala.jdk.CollectionConverters.*

class SubscriptionSpec extends DekafSuite:

  test("SUB-6: delete a subscription (guard = topic FQN)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview")
    page.getByTestId("subscription-page-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(fqn), force = true)
    page.waitForTimeout(1500)

    assert(!admin.topics().getSubscriptions(fqn).asScala.contains(sub))
  }
