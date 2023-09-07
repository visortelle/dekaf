package routes.tenants._tenant_id.namespaces._namespace_id.policies

import _root_.ui.ListInput
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.GetByRoleOptions
import com.microsoft.playwright.options.AriaRole

case class Properties(root: Locator):
    val displayChangeButton: Locator = root.getByTestId("key-value-change-display-properties")
    val saveButton: Locator = root.getByTestId("key-value-save-properties")
    val resetButton: Locator = root.getByTestId("key-value-reset-properties")
    val addPropertyButton: Locator = root.getByTestId("key-value-add-properties")

    val newKey: Locator = root.getByTestId("new-key-properties")
    val newValue: Locator = root.getByTestId("new-value-properties")

    def existingKey(name: String) =
        root.getByTestId(s"key-${name}-properties")

    def existingValue(name: String) =
        root.getByTestId(s"value-${name}-properties")

    def deleteButton(name: String) =
        root.getByTestId(s"key-value-delete-${name}-properties")
