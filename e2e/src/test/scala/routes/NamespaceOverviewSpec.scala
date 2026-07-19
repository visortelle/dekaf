package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

class NamespaceOverviewSpec extends DekafSuite:

  test("NS-1: namespace overview shows stats and the Properties editor persists a property") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"

    page.navigate(s"/tenants/$tenant/namespaces/$ns/overview")

    // Statistics block renders.
    assertThat(page.getByText("Namespace FQN").first()).isVisible()
    assertThat(page.getByText("Topics count").first()).isVisible()
    assertThat(page.getByText(fqn).first()).isVisible()

    // Enter edit mode, add a key/value, and save through the shared UpdateConfirmation.
    val key = "env"
    val value = fixtures.unique("val")

    page.getByTestId("namespace-properties-edit-toggle").click()
    page.getByTestId("new-key-properties").fill(key)
    page.getByTestId("new-value-properties").fill(value)
    page.getByTestId("key-value-add-properties").click()

    val saveButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))
    assertThat(saveButton).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    saveButton.click()

    // Oracle: PulsarAdmin sees the new property.
    eventually() {
      val props = admin.namespaces().getProperties(fqn).asScala
      assert(props.get(key).contains(value), s"properties were: $props")
    }
  }
