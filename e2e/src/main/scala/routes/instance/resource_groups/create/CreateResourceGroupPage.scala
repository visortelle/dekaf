package routes.instance.resource_groups.create

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class CreateResourceGroupPage(root: Locator):
    val resourceGroupNameInput: Locator = root.getByTestId("resource-group-name")
    val dispatchRateInBytesInput: Locator = root.getByTestId("dispatch-rate-in-bytes")
    val dispatchRateInMsgsInput: Locator = root.getByTestId("dispatch-rate-in-msgs")
    val publishRateInBytesInput: Locator = root.getByTestId("publish-rate-in-bytes")
    val publishRateInMsgsInput: Locator = root.getByTestId("publish-rate-in-msgs")

    def setResourceGroupName(rate: String): Unit = resourceGroupNameInput.fill(rate)
    def setDispatchRateInBytes(rate: String): Unit = dispatchRateInBytesInput.fill(rate)
    def setDispatchRateInMsgs(rate: String): Unit = dispatchRateInMsgsInput.fill(rate)
    def setPublishRateInBytes(rate: String): Unit = publishRateInBytesInput.fill(rate)
    def setPublishRateInMsgs(rate: String): Unit = publishRateInMsgsInput.fill(rate)
    val createButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

    def create(): Unit =
        createButton.click()
        root.page.waitForTimeout(1000)
