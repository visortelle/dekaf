package ui

import com.microsoft.playwright.Page
import com.microsoft.playwright.Locator

/** The shared destructive-action dialog (delete topic/namespace/tenant/subscription/schema,
  * unload, expire, skip, reset-cursor, revoke, …). Already instrumented in the app. */
final case class ConfirmationDialog(page: Page):
  val guardInput: Locator          = page.getByTestId("confirmation-dialog-guard-input")
  val confirmButton: Locator       = page.getByTestId("confirmation-dialog-confirm-button")
  val forceDeleteCheckbox: Locator = page.getByTestId("confirm-dialog-force-delete-checkbox")

  /** Type the guard (when the dialog requires it), optionally tick force-delete, then confirm. */
  def confirm(guard: Option[String] = None, force: Boolean = false): Unit =
    if force then forceDeleteCheckbox.click()
    guard.foreach(guardInput.fill)
    confirmButton.click()
