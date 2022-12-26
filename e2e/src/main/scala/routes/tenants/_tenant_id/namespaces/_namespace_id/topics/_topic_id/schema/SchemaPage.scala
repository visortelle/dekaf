package routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.{GetByPlaceholderOptions, GetByRoleOptions}
import com.microsoft.playwright.options.AriaRole

case class SchemaPage(root: Locator):
    val deleteButton: Locator = root.getByTestId("schema-delete-button")
    val deleteConfirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
