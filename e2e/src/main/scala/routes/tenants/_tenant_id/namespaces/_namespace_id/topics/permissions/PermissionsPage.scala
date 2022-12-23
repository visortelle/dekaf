package routes.tenants._tenant_id.namespaces._namespace_id.topics.permissions

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class PermissionsPage(root: Locator):
    val revokeButton: Locator = root.getByTestId("permission-revoke-button")
    val revokeConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
