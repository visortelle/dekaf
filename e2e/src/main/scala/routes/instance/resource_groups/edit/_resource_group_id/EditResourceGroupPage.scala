package routes.instance.resource_groups.edit._resource_group_id

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class EditResourceGroupPage(root: Locator):
    val resourceGroupName: Locator = root.getByTestId("resource-group-name")
    val saveButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))
    val deleteButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Delete").setExact(true))

    val dispatchRateInBytesInput: Locator = root.getByPlaceholder("1024", new GetByPlaceholderOptions().setExact(true))
    val dispatchRateInMsgsInput: Locator = root.getByPlaceholder("100", new GetByPlaceholderOptions().setExact(true))
    val publishRateInBytesInput: Locator = root.getByPlaceholder("2048", new GetByPlaceholderOptions().setExact(true))
    val publishRateInMsgsInput: Locator = root.getByPlaceholder("200", new GetByPlaceholderOptions().setExact(true))

    def setDispatchRateInBytes(rate: String): Unit = dispatchRateInBytesInput.fill(rate)
    def setDispatchRateInMsgs(rate: String): Unit = dispatchRateInMsgsInput.fill(rate)
    def setPublishRateInBytes(rate: String): Unit = publishRateInBytesInput.fill(rate)
    def setPublishRateInMsgs(rate: String): Unit = publishRateInMsgsInput.fill(rate)
