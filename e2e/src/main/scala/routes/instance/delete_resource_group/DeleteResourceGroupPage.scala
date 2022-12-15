package routes.instance.delete_resource_group

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

class DeleteResourceGroupPage(root: Locator):
    val editableResourceGroup: Locator = root.getByTestId("resource-group-name-0")
    val editButton: Locator = root.getByTestId("resource-group-edit-button-0")
    val deleteButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Delete").setExact(true))
    val resourceGroup: Locator = root.getByTestId("resource-group-name")

    def edit(): Unit =
        editButton.click()
        root.page.waitForTimeout(1000)

    def delete(): Unit =
        deleteButton.click()
        root.page.waitForTimeout(1000)
