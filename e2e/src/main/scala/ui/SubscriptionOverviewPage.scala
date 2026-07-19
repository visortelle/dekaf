package ui

import com.microsoft.playwright.{Locator, Page}

/** Locators for the subscription Overview action buttons + their modal controls.
  * Buttons come from ActionButton (which emits `data-testid`); the modals wrap
  * their content in the shared ui.ConfirmationDialog (guard = "CONFIRM"). */
final case class SubscriptionOverviewPage(page: Page):
  val expireButton: Locator = page.getByTestId("expire-subscription-messages-button")
  val skipButton: Locator   = page.getByTestId("skip-subscription-messages-button")
  val resetButton: Locator  = page.getByTestId("reset-subscription-cursor-button")

  def open(tenant: String, namespace: String, topic: String, sub: String): Unit =
    page.navigate(s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topic/subscriptions/$sub/overview")
