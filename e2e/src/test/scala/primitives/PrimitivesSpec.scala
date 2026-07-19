package primitives

import harness.DekafSuite
import harness.Eventually.eventually
import ui.ConfirmationDialog
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.SelectOption
import scala.jdk.CollectionConverters.*

/** X-1/X-2/X-3 - the cross-cutting form primitives (WithUpdateConfirmation, KeyValueEditor, ConfirmationDialog). */
class PrimitivesSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  test("X-1: WithUpdateConfirmation - Save appears when dirty, validation disables it, Reset clears it") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=retention")

    val typeSelect = page.getByTestId("retention-type-select")
    assertThat(typeSelect).isVisible(vis(15000))

    // Dirty + valid -> Save enabled.
    typeSelect.selectOption(new SelectOption().setLabel("Custom"))
    assertThat(page.getByTestId("update-confirm-save")).isEnabled()

    // Cross-field validation (a single 0 limit is invalid) -> Save disabled.
    page.getByTestId("retention-size-value").locator("input").fill("0")
    assertThat(page.getByTestId("update-confirm-save")).isDisabled()

    // Reset reverts to the loaded value -> no longer dirty -> the confirmation disappears.
    page.getByTestId("update-confirm-reset").click()
    assertThat(page.getByTestId("update-confirm-save")).hasCount(0, cnt(8000))
  }

  test("X-2: KeyValueEditor 'As List' adds + removes an entry; readonly view hides the add controls") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val save = page.getByTestId("update-confirm-save")

    page.navigate(s"/tenants/$tenant/namespaces/$ns/overview")
    // Readonly (view) mode: no add controls.
    assertThat(page.getByTestId("namespace-properties-edit-toggle")).isVisible(vis(15000))
    assertThat(page.getByTestId("new-key-properties")).hasCount(0)

    // Edit mode -> add a key/value -> save.
    page.getByTestId("namespace-properties-edit-toggle").click()
    page.getByTestId("new-key-properties").fill("envx")
    page.getByTestId("new-value-properties").fill("prod")
    page.getByTestId("key-value-add-properties").click()
    save.click()
    eventually() { assert(admin.namespaces().getProperties(fqn).asScala.get("envx").contains("prod")) }

    // Re-open in edit mode and remove the entry.
    page.navigate(s"/tenants/$tenant/namespaces/$ns/overview")
    page.getByTestId("namespace-properties-edit-toggle").click()
    page.getByTestId("key-value-delete-envx-properties").click()
    page.getByTestId("update-confirm-save").click()
    eventually() { assert(!admin.namespaces().getProperties(fqn).asScala.contains("envx")) }
  }

  test("X-3: ConfirmationDialog force-delete removes a non-empty tenant (force cascades)") {
    val tenant = fixtures.createTenant()
    fixtures.createNamespace(tenant) // makes the tenant non-empty
    page.navigate(s"/tenants/$tenant/overview")

    page.getByTestId("tenant-page-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(tenant), force = true)
    eventually() { assert(!admin.tenants().getTenants.asScala.contains(tenant)) }
  }
