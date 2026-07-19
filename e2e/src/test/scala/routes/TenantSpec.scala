package routes

import harness.DekafSuite
import ui.ConfirmationDialog
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

class TenantSpec extends DekafSuite:
  private def createButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

  test("TEN-4: create a namespace under a tenant") {
    val tenant = fixtures.createTenant()
    val ns = fixtures.unique("ns")
    page.navigate(s"/tenants/$tenant/create-namespace")
    page.getByTestId("create-namespace-name").fill(ns)
    createButton.click()
    page.waitForTimeout(1000)
    assert(admin.namespaces().getNamespaces(tenant).asScala.contains(s"$tenant/$ns"))
  }

  test("TEN-5: delete a tenant") {
    val tenant = fixtures.createTenant()
    page.navigate(s"/tenants/$tenant/overview")
    page.getByTestId("tenant-page-delete-button").click()
    ConfirmationDialog(page).confirm(guard = Some(tenant), force = true)
    page.waitForTimeout(1500)
    assert(!admin.tenants().getTenants.asScala.contains(tenant))
  }
