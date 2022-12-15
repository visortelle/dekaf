package routes.instance.resource_groups.edit._resource_group_id

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class EditResourceGroupPage(root: Locator):
    val resourceGroupName: Locator = root.getByTestId("resource-group-name")
    val saveButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))
    val deleteButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Delete").setExact(true))
