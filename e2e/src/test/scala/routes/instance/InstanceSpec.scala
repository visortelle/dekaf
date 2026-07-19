package routes.instance

import harness.DekafSuite
import routes.instance.create_tenant.CreateTenantPage
import routes.instance.resource_groups.create.CreateResourceGroupPage
import routes.instance.resource_groups.edit._resource_group_id.EditResourceGroupPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import org.apache.pulsar.common.policies.data.ResourceGroup
import scala.jdk.CollectionConverters.*

class InstanceSpec extends DekafSuite:

  test("INS-3: create a tenant") {
    page.navigate("/instance/create-tenant")
    val p = CreateTenantPage(page.locator("body"))
    val name = fixtures.unique("t")
    p.setTenantName(name)
    p.addAdminRole("role-1")
    p.create()
    fixtures.trackTenant(name)

    assert(admin.tenants().getTenants.asScala.contains(name))
    assert(admin.tenants().getTenantInfo(name).getAdminRoles.asScala.contains("role-1"))
  }

  test("INS-4: Create is disabled until a tenant name is entered") {
    page.navigate("/instance/create-tenant")
    val p = CreateTenantPage(page.locator("body"))
    assertThat(p.createButton).isDisabled()
    p.setTenantName(fixtures.unique("t"))
    assertThat(p.createButton).isEnabled()
  }

  test("INS-6: create a resource group") {
    val name = fixtures.unique("rg")
    page.navigate("/instance/resource-groups/create")
    val cp = CreateResourceGroupPage(page.locator("body"))
    cp.setResourceGroupName(name)
    cp.setDispatchRateInMsgs("10")
    cp.create()
    fixtures.onCleanup(() => admin.resourcegroups().deleteResourceGroup(name))

    assert(admin.resourcegroups().getResourceGroups.asScala.contains(name))
    assert(admin.resourcegroups().getResourceGroup(name).getDispatchRateInMsgs == 10)
  }

  test("INS-7: edit a resource group's rate (Save gated on dirty)") {
    val name = fixtures.unique("rg")
    admin.resourcegroups().createResourceGroup(name, new ResourceGroup())
    fixtures.onCleanup(() => admin.resourcegroups().deleteResourceGroup(name))

    page.navigate(s"/instance/resource-groups/edit/$name")
    val ep = EditResourceGroupPage(page.locator("body"))
    assertThat(ep.resourceGroupName).isVisible()
    assertThat(ep.saveButton).isDisabled()  // not dirty
    ep.setDispatchRateInMsgs("42")
    assertThat(ep.saveButton).isEnabled()
    ep.saveButton.click()
    page.waitForTimeout(1000)

    assert(admin.resourcegroups().getResourceGroup(name).getDispatchRateInMsgs == 42)
  }

  test("INS-8: delete a resource group") {
    val name = fixtures.unique("rg")
    admin.resourcegroups().createResourceGroup(name, new ResourceGroup())
    fixtures.onCleanup(() => admin.resourcegroups().deleteResourceGroup(name))

    page.navigate(s"/instance/resource-groups/edit/$name")
    val ep = EditResourceGroupPage(page.locator("body"))
    ep.deleteButton.click()
    ep.deleteGuardInput.fill("CONFIRM")
    ep.deleteConfirmButton.click()
    page.waitForTimeout(1000)

    assert(!admin.resourcegroups().getResourceGroups.asScala.contains(name))
  }
