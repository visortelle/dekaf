package features.consumersession

import com.microsoft.playwright.{Locator, Page}
import com.microsoft.playwright.options.SelectOption

/** The "Export N messages" modal (opened from the toolbar's `cs-export-open`). */
final case class ExportModal(page: Page):
  val root: Locator        = page.getByTestId("modal")
  val format: Locator      = page.getByTestId("cs-export-format")
  val runButton: Locator   = page.getByTestId("cs-export-run")
  val resetButton: Locator = page.getByTestId("cs-export-reset")
  val fieldRows: Locator   = page.locator("[data-testid^='cs-export-field-']")

  def formatOptionCount: Int = format.locator("option").count()
  def selectFormat(value: String): Unit =
    format.selectOption(new SelectOption().setValue(value))
  def close(): Unit = root.press("Escape")
