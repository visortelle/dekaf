package routes.instance.resource_groups.edit._resource_group_id

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class EditResourceGroupPage(root: Locator):
    val saveButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))
    val deleteButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Delete").setExact(true))
    val deleteConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
    val deleteGuardInput: Locator = root.getByTestId("confirmation-dialog-guard-input")

    val resourceGroupName: Locator = root.getByTestId("resource-group-name")
    val dispatchRateInBytesInput: Locator = root.getByTestId("dispatch-rate-in-bytes")
    val dispatchRateInMsgsInput: Locator = root.getByTestId("dispatch-rate-in-msgs")
    val publishRateInBytesInput: Locator = root.getByTestId("publish-rate-in-bytes")
    val publishRateInMsgsInput: Locator = root.getByTestId("publish-rate-in-msgs")

    def setDispatchRateInBytes(rate: String): Unit = dispatchRateInBytesInput.fill(rate)
    def setDispatchRateInMsgs(rate: String): Unit = dispatchRateInMsgsInput.fill(rate)
    def setPublishRateInBytes(rate: String): Unit = publishRateInBytesInput.fill(rate)
    def setPublishRateInMsgs(rate: String): Unit = publishRateInMsgsInput.fill(rate)
