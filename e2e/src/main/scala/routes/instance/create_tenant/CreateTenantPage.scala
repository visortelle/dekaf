package routes.instance.create_tenant

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class CreateTenantPage(root: Locator):
    val tenantNameInput: Locator = root.getByTestId("tenant-name")
    val adminRoleInput: ListInput = ListInput(root.getByTestId("admin-roles-input"))
    val clustersInput: ListInput = ListInput(root.getByTestId("clusters-input"))
    val createButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

    def setTenantName(tenantName: String): Unit = tenantNameInput.fill(tenantName)
    def addAdminRole(role: String): Unit = adminRoleInput.addItem(role)
    def addCluster(cluster: String): Unit = clustersInput.addItem(cluster)
    def create(): Unit =
        createButton.click()
        root.page.waitForTimeout(1000)
