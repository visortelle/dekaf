package routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class TopicPage(root: Locator):
    val deleteButton: Locator = root.getByTestId("topic-page-delete-button")
    val deleteConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
    val deleteGuardInput: Locator = root.getByTestId("confirmation-dialog-guard-input")
    val forceDeleteCheckbox: Locator = root.getByTestId("confirm-dialog-force-delete-checkbox")
    val policiesButton: Locator = root.getByTestId("topic-policies-button")
