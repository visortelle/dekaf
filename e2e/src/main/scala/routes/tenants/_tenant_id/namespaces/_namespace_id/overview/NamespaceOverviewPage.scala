package routes.tenants._tenant_id.namespaces._namespace_id.overview

import com.microsoft.playwright.Locator
import com.microsoft.playwright.options.AriaRole

import scala.jdk.CollectionConverters.*

case class NamespaceOverviewPage(root: Locator):
    val unloadAllButton: Locator = root.getByTestId("unload-all-button")
    val clearWholeBacklogButton: Locator = root.getByTestId("clear-whole-backlog-button")
    val confirmButton: Locator = root.getByTestId("confirmation-dialog-confirm-button")
    val guardInput: Locator = root.getByTestId("confirmation-dialog-guard-input")
    val forceButton: Locator = root.getByTestId("confirm-dialog-force-delete-checkbox")
    val unloadSplitBundlesButton: Locator = root.getByTestId("confirm-dialog-unload-split-bundles-checkbox")
    val namespaceFqn: Locator = root.getByTestId("namespace-fqn")

    def clusterTabs: Seq[Locator] =
        root.getByTestId("cluster-tabs").all().asScala.toSeq

    def bundleRangesNames: Seq[String] =
        root.getByTestId("bundle-range-name").all().asScala.map(_.textContent()).toSeq

    def bundleClearBacklogButton(bundleRange: String): Locator =
        root.getByTestId(s"clear-backlog-button-$bundleRange")

    def bundleSplitButton(bundleRange: String): Locator =
        root.getByTestId(s"split-bundle-button-$bundleRange")

    def bundleUnloadButton(bundleRange: String): Locator =
        root.getByTestId(s"unload-button-$bundleRange")
