package routes.tenants._tenant_id.create_namespace

import com.microsoft.playwright.Locator
import routes.tenants._tenant_id.namespaces._namespace_id.policies.Properties
import ui.ListInput

case class CreateNamespacePage(root: Locator):
  val namespaceNameInput: Locator = root.getByTestId("namespace-name-input")
  val replicationClustersSelectListInput: ListInput = ListInput(root.getByTestId("replication-clusters-select-input"))
  val bundlesCountInput: Locator = root.getByTestId("bundles-count-input")
  val namespaceProperties: Properties = Properties(root.getByTestId("properties"))
  val createNamespaceButton: Locator = root.getByTestId("create-namespace-button")

