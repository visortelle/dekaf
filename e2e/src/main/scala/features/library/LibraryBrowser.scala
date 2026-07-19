package features.library

import com.microsoft.playwright.{Locator, Page}
import com.microsoft.playwright.options.SelectOption
import ui.ConfirmationDialog

/** The Browse-Library dialog: search-results list with client-side filter/sort, per-row edit/delete,
  * and (for consumer-session-config) a Select button. Scoped to the browse dialog root so it never
  * matches an Overwrite dialog's rows stacked on top. */
final case class LibraryBrowser(page: Page):
  private val root: Locator      = page.getByTestId("lib-browse-dialog")
  val filterInput: Locator       = root.getByTestId("lib-search-filter")
  val sortSelect: Locator        = root.getByTestId("lib-search-sort")
  val results: Locator           = root.getByTestId("lib-search-result")
  val selectButton: Locator      = page.getByTestId("lib-browse-select")

  def result(name: String): Locator =
    results.filter(new Locator.FilterOptions().setHasText(name))

  def filter(text: String): Unit = filterInput.fill(text)

  /** value = "<SortBy>-<asc|desc>", e.g. "Name-asc", "Name-desc", "Last Modified-desc". */
  def sortBy(value: String): Unit = sortSelect.selectOption(new SelectOption().setValue(value))

  def editItem(name: String): Unit = result(name).getByTestId("lib-item-edit").click()

  def deleteItem(name: String): Unit =
    result(name).getByTestId("lib-item-delete").click()
    ConfirmationDialog(page).confirmButton.click()   // shared confirmation-dialog-confirm-button

/** The Overwrite-Another dialog (OverwriteExistingItemDialog); its result rows are scoped to its own root. */
final case class LibraryOverwriteDialog(page: Page):
  private val root: Locator    = page.getByTestId("lib-overwrite-dialog")
  val results: Locator         = root.getByTestId("lib-search-result")
  val overwriteButton: Locator = page.getByTestId("lib-overwrite-confirm")
  val cancelButton: Locator    = page.getByTestId("lib-overwrite-cancel")

  def select(name: String): Unit =
    results.filter(new Locator.FilterOptions().setHasText(name)).click()
