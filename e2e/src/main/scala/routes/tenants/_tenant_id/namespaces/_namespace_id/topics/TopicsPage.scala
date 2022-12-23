package routes.tenants._tenant_id.namespaces._namespace_id.topics

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class TopicsPage(root: Locator):
    val deleteButton: Locator = root.getByTestId("namespace-page-delete-button")
    val deleteConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
    val deleteGuardInput: Locator = root.getByTestId("confirmation-dialog-guard-input")
