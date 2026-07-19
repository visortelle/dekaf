package features.library

import com.microsoft.playwright.{Locator, Page}

/** The Save/Create library-item dialog (SaveItemDialog) + its shared Set-Name dialog (EditNameDialog). */
final case class LibrarySaveDialog(page: Page):
  val saveButton: Locator              = page.getByTestId("lib-save-dialog-save")               // "Create" (new) / "Save" (existing)
  val saveAsNewButton: Locator         = page.getByTestId("lib-save-dialog-save-as-new")
  val overwriteAnotherButton: Locator  = page.getByTestId("lib-save-dialog-overwrite-another")
  val cancelButton: Locator            = page.getByTestId("lib-save-dialog-cancel")
  // Shared Set-Name / rename dialog (EditNameDialog)
  val nameInput: Locator               = page.getByTestId("lib-name-input")
  val nameConfirm: Locator             = page.getByTestId("lib-name-confirm")
  val nameCancel: Locator              = page.getByTestId("lib-name-cancel")

  /** Clone an existing item under a new name (Save as New -> Set-Name). */
  def saveAsNew(name: String): Unit =
    saveAsNewButton.click()
    nameInput.fill(name)
    nameConfirm.click()
