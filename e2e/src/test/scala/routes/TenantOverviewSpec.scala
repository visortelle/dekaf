package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.Locator
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import scala.jdk.CollectionConverters.*

/** TEN-1/TEN-2 - the tenant overview's admin-roles / allowed-clusters editors (immediate update). */
class TenantOverviewSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  test("TEN-1: adding then removing an admin role updates the tenant immediately") {
    val tenant = fixtures.createTenant()
    val role = fixtures.unique("role")
    page.navigate(s"/tenants/$tenant/overview")

    val rolesInput = page.getByTestId("tenant-admin-roles")
    assertThat(rolesInput).isVisible(vis(15000))

    // Add - the editor is inline; type then click Add.
    rolesInput.getByPlaceholder("Enter new role").fill(role)
    rolesInput.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Add").setExact(true)).click()
    eventually() {
      assert(admin.tenants().getTenantInfo(tenant).getAdminRoles.asScala.contains(role),
        s"roles were: ${admin.tenants().getTenantInfo(tenant).getAdminRoles}")
    }
    assertThat(rolesInput.locator(s"[data-testid=list-item][data-item-id='$role']")).isVisible(vis(10000))

    // Remove (immediate).
    rolesInput.locator(s"[data-testid=list-item][data-item-id='$role']").getByTestId("list-item-remove").click()
    eventually() {
      assert(!admin.tenants().getTenantInfo(tenant).getAdminRoles.asScala.contains(role),
        s"roles still: ${admin.tenants().getTenantInfo(tenant).getAdminRoles}")
    }
  }

  test("TEN-2: the last allowed cluster cannot be removed") {
    val tenant = fixtures.createTenant()
    page.navigate(s"/tenants/$tenant/overview")

    val clustersInput = page.getByTestId("tenant-allowed-clusters")
    assertThat(clustersInput).isVisible(vis(15000))
    assertThat(clustersInput.locator("[data-testid=list-item]")).hasCount(1, cnt(10000))
    // The single (last) cluster has no remove control.
    assertThat(clustersInput.getByTestId("list-item-remove")).hasCount(0, cnt(5000))
  }
