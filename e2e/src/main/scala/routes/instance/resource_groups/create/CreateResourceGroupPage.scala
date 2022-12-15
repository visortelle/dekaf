package routes.instance.resource_groups.create

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class CreateResourceGroupPage(root: Locator):
    val resourceGroupNameInput: Locator = root.getByPlaceholder("new-resource-group", new GetByPlaceholderOptions().setExact(true))
    val dispatchRateInBytesInput: Locator = root.getByPlaceholder("1024", new GetByPlaceholderOptions().setExact(true))
    val dispatchRateInMsgsInput: Locator = root.getByPlaceholder("100", new GetByPlaceholderOptions().setExact(true))
    val publishRateInBytesInput: Locator = root.getByPlaceholder("2048", new GetByPlaceholderOptions().setExact(true))
    val publishRateInMsgsInput: Locator = root.getByPlaceholder("200", new GetByPlaceholderOptions().setExact(true))
    val linkToCreateButton: Locator = root.getByTestId("resource-group-create-button")

    def setResourceGroupName(rate: String): Unit = resourceGroupNameInput.fill(rate)
    def setDispatchRateInBytes(rate: String): Unit = dispatchRateInBytesInput.fill(rate)
    def setDispatchRateInMsgs(rate: String): Unit = dispatchRateInMsgsInput.fill(rate)
    def setPublishRateInBytes(rate: String): Unit = publishRateInBytesInput.fill(rate)
    def setPublishRateInMsgs(rate: String): Unit = publishRateInMsgsInput.fill(rate)
    val createButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

    def moveToCreate(): Unit =
        linkToCreateButton.click()
        root.page.waitForTimeout(1000)

    def create(): Unit =
        createButton.click()
        root.page.waitForTimeout(1000)
