package features.consumersession

import com.microsoft.playwright.{Locator, Page}
import com.microsoft.playwright.options.{AriaRole, SelectOption}

/** Topic-selector controls of ONE target, scoped to its `cs-target` column. */
final case class TargetSelector(page: Page, root: Locator):
  def modeSelect: Locator    = root.getByTestId("cs-target-mode")
  def fqnList: Locator       = root.getByTestId("cs-target-fqn-list")
  def fqnInput: Locator      = root.getByTestId("cs-target-fqn-input")
  def regexPattern: Locator  = root.getByTestId("cs-target-regex-pattern")
  def notApplicable: Locator = root.getByTestId("cs-target-not-applicable")
  def resolveCount: Locator  = root.getByTestId("cs-resolve-count")
  def moveLeft: Locator      = root.getByTestId("cs-target-move-left")
  def moveRight: Locator     = root.getByTestId("cs-target-move-right")
  def remove: Locator        = root.getByTestId("cs-target-remove")

  def addFqnButton: Locator =
    fqnList.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Add Topic"))

  def setMode(label: String): Unit = modeSelect.selectOption(new SelectOption().setLabel(label))
  def typeFqn(fqn: String): Unit   = fqnInput.fill(fqn)
  def addFqn(fqn: String): Unit    = { fqnInput.fill(fqn); addFqnButton.click() }
