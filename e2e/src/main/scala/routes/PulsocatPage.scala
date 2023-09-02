package routes

import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.GetByRoleOptions
import com.microsoft.playwright.options.AriaRole

case class PulsocatPage(root: Locator):
    val collapseAllButton: Locator = root.getByTestId("navigation-tree-collapse-all-button")
    val pulsarAuthButton: Locator = root.getByTestId("pulsar-auth-button")

    def collapseAll(): Unit = collapseAllButton.click()

