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

  // --- Topic Positions (the per-topic debug view) ---
  val topicPositionsTab: Locator        = page.getByTestId("console-tab-topic-positions")
  val topicPositionsTable: Locator      = page.getByTestId("topic-positions-table")
  val topicPositionsNotStarted: Locator = page.getByTestId("topic-positions-not-started")
  val topicPositionsError: Locator      = page.getByTestId("topic-positions-error")

  /** A row of the (shared-Table-backed) positions table, matched by its topic cell. */
  def topicPositionsRow(topicFqn: String): Locator =
    page.locator("[data-testid='topic-positions'] tbody tr").filter(new Locator.FilterOptions().setHasText(topicFqn))

  /** The row's cells, in DEFAULT header order (consumption first, then the topic's endpoints):
    * 0 topic, 1 entries read (x / y), 2 entries left, 3 % of entries, 4 behind,
    * 5 % of time range, 6 first message, 7 first published, 8 last message,
    * 9 last published, 10 message under cursor.
    */
  def topicPositionsCells(topicFqn: String): Vector[String] =
    import scala.jdk.CollectionConverters.*
    topicPositionsRow(topicFqn).locator("td").allTextContents().asScala.toVector

  /** Click a sortable header of the positions table by its column key. */
  def topicPositionsSortBy(columnKey: String): Unit =
    page.locator(s"[data-testid='topic-positions'] [data-testid='table-th'][data-column-key='$columnKey']").click()
