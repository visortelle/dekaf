package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

class NamespacePolicySpec extends DekafSuite:

  private def saveButton =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))

  test("NS-4: retention selector offers four options with cross-field validation gating Save") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=retention")

    val typeSelect = page.getByTestId("retention-type-select")
    assertThat(typeSelect).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))

    // Four-way selector.
    assertThat(typeSelect.locator("option")).hasCount(4)
    val opts = typeSelect.locator("option").allTextContents().asScala.toList
    assert(
      opts.contains("Inherited from broker config") && opts.contains("Disabled") &&
        opts.contains("Retain infinitely") && opts.contains("Custom"),
      s"retention options were: $opts"
    )

    // Custom => time & size default to a limit of 1 (valid); Save appears enabled.
    typeSelect.selectOption(new SelectOption().setLabel("Custom"))
    assertThat(saveButton).isEnabled()

    // Drive size to 0 while time stays 1 => cross-field validation fails, Save disabled.
    page.getByTestId("retention-size-value").locator("input").fill("0")
    assertThat(page.getByText("Setting a single time or size limit to 0 is invalid")).isVisible()
    assertThat(saveButton).isDisabled()

    // Switch to a valid selection and persist; PulsarAdmin confirms infinite retention.
    typeSelect.selectOption(new SelectOption().setLabel("Retain infinitely"))
    assertThat(saveButton).isEnabled()
    saveButton.click()

    eventually() {
      val r = admin.namespaces().getRetention(fqn)
      assert(r != null && r.getRetentionSizeInMB == -1 && r.getRetentionTimeInMinutes == -1,
        s"retention was: $r")
    }
  }

  test("NS-5: editing max-consumers-per-topic on the Limits tab persists") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=limits")

    val typeSelect = page.getByTestId("max-consumers-per-topic-type-select")
    assertThat(typeSelect).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    typeSelect.selectOption(new SelectOption().setLabel("Specified for this namespace"))

    page.getByTestId("max-consumers-per-topic-value-input").fill("5")
    saveButton.click()

    eventually() {
      val v = admin.namespaces().getMaxConsumersPerTopic(fqn)
      assert(v == 5, s"maxConsumersPerTopic was: $v")
    }
  }
