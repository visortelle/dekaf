package features.consumersession

import com.microsoft.playwright.{Locator, Page}

/** Default Topic Positions column indices. Tests use a fresh browser context, so there is no
  * persisted user reorder and the table starts in this order. */
object TopicPositionsColumn:
  val Topic                   = 0
  val RetainedEntryPosition   = 1
  val EntriesAfterCursor      = 2
  val EntryPositionFraction   = 3
  val PublishTimeLag          = 4
  val PublishTimeFraction     = 5
  val FirstConsumedPublished  = 6
  val FirstConsumedId         = 7
  val LastConsumedPublished   = 8
  val LastConsumedId          = 9
  val OldestRetainedPublished = 10
  val OldestRetainedId        = 11
  val NewestRetainedPublished = 12
  val NewestRetainedId        = 13

/** The More tools bottom panel (toggled by `cs-tools`). */
final case class ToolsPanel(page: Page):
  val produceTab: Locator = page.getByTestId("console-tab-produce")
  val replTab: Locator    = page.getByTestId("console-tab-repl")
  val logsTab: Locator    = page.getByTestId("console-tab-logs")

  val produceSend: Locator = page.getByTestId("produce-send") // pre-existing (Producer)

  val replEditor: Locator = page.getByTestId("cs-repl-editor")
  val replRun: Locator    = page.getByTestId("cs-repl-run")
  val replClear: Locator  = page.getByTestId("cs-repl-clear")
  val replLogs: Locator   = page.getByTestId("cs-repl-logs")

  /** Replace the Context REPL expression in Monaco. */
  def writeRepl(code: String): Unit =
    replEditor.locator(".monaco-editor").click()
    page.keyboard().press("ControlOrMeta+A")
    page.keyboard().press("Delete")
    page.keyboard().`type`(code)

  val logs: Locator = page.getByTestId("cs-logs")

  // --- Topic Positions (the per-topic debug view) ---
  val topicPositionsTab: Locator        = page.getByTestId("console-tab-topic-positions")
  val topicPositionsTable: Locator      = page.getByTestId("topic-positions-table")
  val topicPositionsNotStarted: Locator = page.getByTestId("topic-positions-not-started")
  val topicPositionsError: Locator      = page.getByTestId("topic-positions-error")

  /** A row of the (shared-Table-backed) positions table, matched by its topic cell. */
  def topicPositionsRow(topicFqn: String): Locator =
    page.locator("[data-testid='topic-positions'] tbody tr").filter(new Locator.FilterOptions().setHasText(topicFqn))

  /** The row's cells, in DEFAULT header order (progress, processed bounds, stored endpoints):
    * 0 topic/partition, 1 stored entry position (x / y), 2 stored entries after position,
    * 3 stored entry position %, 4 publish-time gap, 5 publish-time position %,
    * 6 earliest processed publish time, 7 earliest processed message id,
    * 8 furthest processed publish time, 9 furthest processed message id,
    * 10 earliest stored publish time, 11 earliest stored message id,
    * 12 latest stored publish time, 13 latest stored message id.
    */
  def topicPositionsCells(topicFqn: String): Vector[String] =
    import scala.jdk.CollectionConverters.*
    topicPositionsRow(topicFqn).locator("td").allTextContents().asScala.toVector

  /** One cell in the default order, kept as a locator so an assertion can wait for a poll to fill it. */
  def topicPositionsCell(topicFqn: String, column: Int): Locator =
    topicPositionsRow(topicFqn).locator("td").nth(column)

  /** Click a sortable header of the positions table by its column key. */
  def topicPositionsSortBy(columnKey: String): Unit =
    page.locator(s"[data-testid='topic-positions'] [data-testid='table-th'][data-column-key='$columnKey']").click()
