package features.consumersession

import com.microsoft.playwright.{Locator, Page}

/** The Tools/Console bottom panel (toggled by `cs-tools`). */
final case class ToolsPanel(page: Page):
  val produceTab: Locator = page.getByTestId("console-tab-produce")
  val replTab: Locator    = page.getByTestId("console-tab-repl")
  val logsTab: Locator    = page.getByTestId("console-tab-logs")

  val produceSend: Locator = page.getByTestId("produce-send") // pre-existing (Producer)

  val replEditor: Locator = page.getByTestId("cs-repl-editor")
  val replRun: Locator    = page.getByTestId("cs-repl-run")
  val replClear: Locator  = page.getByTestId("cs-repl-clear")
  val replLogs: Locator   = page.getByTestId("cs-repl-logs")

  val logs: Locator = page.getByTestId("cs-logs")
