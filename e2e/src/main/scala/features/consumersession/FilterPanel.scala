package features.consumersession

import com.microsoft.playwright.{Locator, Page}
import com.microsoft.playwright.options.{AriaRole, SelectOption}

/** Ops on ONE message-filter-chain editor, scoped to its container locator
  * (e.g. `cs-session-filters`). Add buttons are located by role within the scope. */
final case class FilterPanel(page: Page, root: Locator):
  def addButton: Locator =
    root.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Add Filter"))

  // Per-filter controls (use .first() when >1 filter present).
  def opSelect: Locator     = root.getByTestId("cs-filter-op")
  def valueInput: Locator   = root.getByTestId("cs-filter-value")
  def modeToggle: Locator   = root.getByTestId("cs-filter-mode")   // Basic <-> JavaScript
  def enableToggle: Locator = root.getByTestId("cs-filter-enable")
  def negateToggle: Locator = root.getByTestId("cs-filter-negate")
  def logicToggle: Locator  = root.getByTestId("cs-filter-logic")  // AND <-> OR (needs >=2 filters)
  def jsEditor: Locator     = root.getByTestId("cs-js-filter")

  def addFilter(): Unit          = addButton.click()
  def setOp(label: String): Unit = opSelect.first().selectOption(new SelectOption().setLabel(label))
  def setValue(v: String): Unit  = valueInput.first().fill(v)

  /** The Basic<->JS mode toggle lives in the LibraryBrowserPanel's hover-gated `postItemType`,
    * so hover the (always-visible) enable toggle to reveal it before clicking. */
  private def clickMode(): Unit =
    enableToggle.first().hover()
    modeToggle.first().click()
  def switchToJs(): Unit    = clickMode()
  def switchToBasic(): Unit = clickMode()

  /** Replace the JS body. Monaco auto-close is idempotent (type-over) for well-formed input. */
  def writeJs(code: String): Unit =
    jsEditor.locator(".monaco-editor").click()
    page.keyboard().press("ControlOrMeta+A")
    page.keyboard().press("Delete")
    page.keyboard().`type`(code)
