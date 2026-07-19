package routes

import harness.DekafSuite
import harness.Eventually.eventually
import ui.ConfirmationDialog
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import org.apache.pulsar.client.api.MessageId

class NamespaceBundlesSpec extends DekafSuite:

  private def button(name: String) =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName(name).setExact(true))

  test("NS-8: bundles tab renders the actions and a confirm flow opens and closes cleanly") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=bundles")

    // Namespace-wide + per-bundle actions render (per-row buttons repeat, so use .first()).
    assertThat(button("Unload all")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    assertThat(button("Clear backlog").first()).isVisible()
    assertThat(button("Split").first()).isVisible()
    assertThat(button("Unload").first()).isVisible()

    // Confirm flow opens and closes cleanly (no crash), no side effect.
    button("Unload all").click()
    val confirm = page.getByTestId("confirmation-dialog-confirm-button")
    assertThat(confirm).isVisible()
    button("Cancel").click()
    assertThat(confirm).isHidden()
  }

  test("NS-8: splitting a bundle increases the bundle count") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"

    val initial = admin.namespaces().getBundles(fqn).getNumBundles

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=bundles")
    assertThat(button("Split").first()).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    button("Split").first().click()
    ConfirmationDialog(page).confirm() // default split algorithm pre-selected.

    eventually() {
      val now = admin.namespaces().getBundles(fqn).getNumBundles
      assert(now > initial, s"bundle count did not increase: $initial -> $now")
    }
  }

  test("NS-17: namespace-wide Clear backlog empties a subscription's backlog") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)
    fixtures.produceStrings(fqn, 5) // 5 unconsumed messages => backlog of 5

    def backlog: Long = admin.topics().getStats(fqn).getSubscriptions.get(sub).getMsgBacklog
    eventually() { assert(backlog == 5L, s"pre-clear backlog: $backlog") }

    page.navigate(s"/tenants/$t/namespaces/$ns/details?category=bundles")
    page.getByTestId("ns-clear-backlog-button").click()
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM")) // ns-wide Clear backlog is guarded.

    eventually() { assert(backlog == 0L, s"post-clear backlog: $backlog") }
  }
