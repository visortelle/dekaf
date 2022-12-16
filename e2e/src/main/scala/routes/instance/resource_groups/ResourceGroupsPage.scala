package routes.instance.resource_groups

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class ResourceGroupsPage(root: Locator):
    val createButton: Locator = root.getByTestId("resource-group-create-button")

    def edit(resourceGroup: String): Unit =
        val editButton: Locator = root.getByTestId(s"resource-group-edit-button-${resourceGroup}")
        editButton.click()
        root.page.waitForTimeout(1000)

    def getResourceGroupName(resourceGroup: String) =
        root.getByTestId(s"resource-group-name-${resourceGroup}").innerText()

    def getDispatchRateInBytes(resourceGroup: String) =
        root.getByTestId(s"resource-group-d-r-b-${resourceGroup}").innerText()

    def getDispatchRateInMsgs(resourceGroup: String) =
        root.getByTestId(s"resource-group-d-r-m-${resourceGroup}").innerText()

    def getPublishRateInBytes(resourceGroup: String) =
        root.getByTestId(s"resource-group-p-r-b-${resourceGroup}").innerText()

    def getPublishRateInMsgs(resourceGroup: String) =
        root.getByTestId(s"resource-group-p-r-m-${resourceGroup}").innerText()
