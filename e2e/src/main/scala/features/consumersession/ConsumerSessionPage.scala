package features.consumersession

import com.microsoft.playwright.{Locator, Page, Mouse}
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.options.{AriaRole, SelectOption, BoundingBox}
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

/** Component object for the Consumer Session feature (mounted at a resource's `/consumer-session`).
  * Merged surface for both the configuration (CS-2..15) and runtime (CS-16..32) specs. */
final case class ConsumerSessionPage(page: Page):
  // --- Toolbar / table (pre-existing) ---
  val playButton: Locator        = page.getByTestId("cs-play")
  val stopButton: Locator        = page.getByTestId("cs-stop")
  val toolsButton: Locator       = page.getByTestId("cs-tools")
  val toolsPanel: Locator        = page.getByTestId("cs-console")
  val toolsResizeHandle: Locator = page.getByTestId("cs-tools-resize-handle")
  val toolsCloseButton: Locator  = page.getByTestId("cs-tools-close")
  val searchInput: Locator       = page.getByTestId("cs-search")
  val startFromSelect: Locator   = page.getByTestId("cs-start-from")
  val messages: Locator          = page.getByTestId("cs-message")
  val messageDetails: Locator    = page.getByTestId("cs-message-details")

  // --- Start From additional inputs (CS-2/3) ---
  val startFromN: Locator         = page.getByTestId("cs-start-from-n")
  val startFromMessageId: Locator = page.getByTestId("cs-start-from-message-id")

  /** The Start-From "additional controls" block - whatever the selected mode reveals below the
    * dropdown (the n input, the message-id input, the datetime picker, the relative picker).
    *
    * Anchored on the CSS-module class PREFIX rather than a `testId`: the datetime and relative
    * pickers are third-party/shared components with no instrumentation of their own, and `ui/` is
    * out of scope for this change. The `-module__AdditionalControls` prefix is stable across builds;
    * only the trailing content hash moves. Scoping is REQUIRED, not cosmetic - the always-mounted
    * Producer console renders its own datetime picker, so a page-wide `input[name='year']` matches
    * two different controls. */
  val startFromAdditional: Locator = page.locator("[class*='StartFromInput-module__AdditionalControls']")

  // --- The two approximate modes + persistency advice ---
  // Both render the SAME percent control, so each carries its own test-id prefix; sharing one would
  // let a test drive the entry position while asserting the publish-time position.
  val startFromEntryFraction: Locator             = page.getByTestId("cs-start-from-entry-fraction")
  val startFromEntryFractionSlider: Locator       = page.getByTestId("cs-start-from-entry-fraction-slider")
  val startFromEntryFractionError: Locator        = page.getByTestId("cs-start-from-entry-fraction-error")
  val startFromPublishTimeFraction: Locator       = page.getByTestId("cs-start-from-publish-time-fraction")
  val startFromPublishTimeFractionSlider: Locator = page.getByTestId("cs-start-from-publish-time-fraction-slider")
  val startFromPublishTimeFractionError: Locator  = page.getByTestId("cs-start-from-publish-time-fraction-error")
  val startFromNonPersistentNote: Locator    = page.getByTestId("cs-start-from-non-persistent-note")
  val startFromMixedPersistencyNote: Locator = page.getByTestId("cs-start-from-mixed-persistency-note")
  val startFromProgress: Locator             = page.getByTestId("cs-start-from-progress")

  // --- Session-level editor containers ---
  val sessionFilters: Locator     = page.getByTestId("cs-session-filters")
  val sessionProjections: Locator = page.getByTestId("cs-session-projections")
  val sessionColoring: Locator    = page.getByTestId("cs-session-coloring")

  // --- Per-target editor containers (the primary, always-visible filter path) ---
  val targetFilters: Locator      = page.getByTestId("cs-target-filters")

  // --- Targets (CS-4..7) ---
  val targets: Locator         = page.getByTestId("cs-target")
  val addTargetButton: Locator = page.getByTestId("cs-add-target")

  // --- Projections / coloring / deserializer / value (CS-12/13/14) ---
  val projectionLabel: Locator        = page.getByTestId("cs-projection-label")
  val projectionColumnHeader: Locator = page.getByTestId("cs-projection-column-header")
  val coloringBg: Locator             = page.getByTestId("cs-coloring-bg")
  val coloringFg: Locator             = page.getByTestId("cs-coloring-fg")
  val deserializerSelect: Locator     = page.getByTestId("cs-deserializer")
  val firstValueCell: Locator         = page.getByTestId("cs-message-value").first()
  val awaitingText: Locator           = page.getByText("Awaiting for new messages...")

  // --- Runtime table / details / export (CS-18..29) ---
  val session: Locator                    = page.getByTestId("cs-session")
  val table: Locator                      = page.getByTestId("cs-table")
  /** react-virtuoso owns the actual vertical scroll offset on this child, not on `table`. */
  val tableScroller: Locator              = table.locator("[data-virtuoso-scroller]").first()
  val numFound: Locator                   = page.getByTestId("cs-num-found")
  val loaded: Locator                     = page.getByTestId("cs-loaded")
  val messageDetailsClose: Locator        = page.getByTestId("cs-message-details-close")
  val messageDetailsResizeHandle: Locator = page.getByTestId("cs-message-details-resize-handle")
  val exportOpen: Locator                 = page.getByTestId("cs-export-open")

  def th(key: String): Locator   = page.getByTestId(s"cs-th-$key")
  def cell(key: String): Locator = page.getByTestId(s"cs-cell-$key")
  val selectedIndexCell: Locator = page.locator("[data-testid='cs-message'][data-cs-selected='true']")

  /** String cells render JSON-quoted (`"k-1"`); a single surrounding quote pair is stripped. */
  private def stripRenderedQuotes(v: String): String =
    if v.length >= 2 && v.startsWith("\"") && v.endsWith("\"") then v.substring(1, v.length - 1) else v

  /** The visible values of a message column, in rendered row order (e.g. `columnValues("key")`).
    *
    * MOUNTED rows only: the table is react-virtuoso, so this sees one viewport-worth of rows and -
    * on a running session, which auto-scrolls to the bottom every 200ms - specifically the LAST
    * viewport-worth. Fine for sets that fit a viewport and for emptiness checks; any expectation
    * that can outgrow a viewport must use [[allColumnValues]] instead (CS-SF-7/9/13/14 failed on
    * exactly this, all "missing m-01" - the oldest rows had scrolled off the top). */
  def columnValues(key: String): List[String] =
    cell(key).allInnerTexts().asScala.toList.map(_.trim).map(stripRenderedQuotes)

  /** Every value of a message column across the WHOLE virtualized list, not just the mounted
    * viewport - the scroll-and-collect pattern `CsMergeOrderSpec.deliveredValues` introduced,
    * shared so every exact-set assertion benefits.
    *
    * The entire walk runs inside ONE `page.evaluate`: it steps the virtuoso scroller from the top,
    * waits two animation frames per step for React to mount the range, and collects
    * (displayIndex, cell text) pairs keyed by the arrival ordinal so a row is never double-counted
    * across steps. Unlike `deliveredValues` it does NOT pause the session (callers keep producing
    * into live sessions afterwards); instead the running-state auto-scroll is treated as a rival:
    * a step whose position was hijacked (the scroller is not where the walk put it) is detected
    * and retried, bounded, so the walk terminates either way - at worst the outer polling loop
    * calls it again. Returned in arrival (displayIndex) order, with the same one-quote-pair strip
    * `columnValues` applies. Parsed with jackson rather than a regex so payloads containing
    * brackets, quotes or newlines cannot be silently dropped. */
  def allColumnValues(key: String): List[String] =
    val json = page
      .evaluate(
        s"""async () => {
           |  const table = document.querySelector("[data-testid='cs-table']");
           |  if (!table) return "[]";
           |  const byOrdinal = new Map();
           |  const harvest = () => {
           |    for (const r of table.querySelectorAll("tbody tr")) {
           |      const ord = r.querySelector("[data-testid='cs-message']");
           |      const cell = r.querySelector("[data-testid='cs-cell-$key']");
           |      if (ord && cell) {
           |        const n = parseInt(ord.innerText.trim(), 10);
           |        if (!isNaN(n)) byOrdinal.set(n, cell.innerText.trim());
           |      }
           |    }
           |  };
           |  const result = () => JSON.stringify(Array.from(byOrdinal.entries()));
           |  harvest();
           |  const s = table.querySelector("[data-virtuoso-scroller]");
           |  if (!s || s.scrollHeight <= s.clientHeight + 2) return result();
           |  const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
           |  let target = 0;
           |  let guard = 0;
           |  while (guard < 300) {
           |    guard += 1;
           |    s.scrollTop = target;
           |    await frame();
           |    const atEnd = target >= s.scrollHeight - s.clientHeight - 2;
           |    if (Math.abs(s.scrollTop - target) > 2 && !atEnd) continue; // auto-scroll hijacked the step - retry it
           |    harvest();
           |    if (atEnd) break;
           |    target = Math.min(target + s.clientHeight * 0.8, s.scrollHeight - s.clientHeight);
           |  }
           |  return result();
           |}""".stripMargin
      )
      .toString
    ConsumerSessionPage.jsonMapper
      .readTree(json)
      .elements()
      .asScala
      .map(pair => pair.get(0).asInt() -> pair.get(1).asText())
      .toList
      .sortBy(_._1)
      .map((_, value) => stripRenderedQuotes(value.trim))

  /** EVERY loaded message's value, read out of the app's own bulk export instead of the table.
    *
    * [[allColumnValues]] walks the virtualized list a viewport at a time and gives up after 300
    * steps, which is a few thousand rows on this 1280x800 context - so the exact-set assertions the
    * high-pressure specs need (tens of thousands of messages) are simply out of its reach. The
    * export writes the whole retained buffer, not the mounted rows, in one file.
    *
    * TWO PREMISES, both enforced rather than assumed, because either one silently truncates the
    * oracle into something that still looks like a set:
    *   - the session must NOT be running: while running the app shows (and exports) only the last
    *     250 messages, so a running export would quietly compare 250 rows and pass;
    *   - the session's retention (`data-cs-retained`, the `numDisplayItems` limit) must be wide
    *     enough to still hold everything the test produced - see [[setNumDisplayItems]]. Callers
    *     assert that themselves against their own expected total, which this cannot know.
    *
    * Returned in the table's DISPLAY order (publish time ascending, stable), not arrival order:
    * this is a SET oracle. Arrival order has its own reader in `CsMergeOrderSpec`. */
  def exportedValues(): List[String] =
    assert(
      state != "running",
      "exportedValues must be called on a paused/stopped session: a RUNNING session renders and " +
        "exports only its last 250 messages, so the exported set would silently be a tail"
    )
    exportOpen.click()
    val modal = ExportModal(page)
    modal.selectFormat("json-value-per-entry")
    // Generous: the export serializes, zips and downloads the whole retained buffer, which is tens
    // of thousands of messages in the pressure specs.
    val download =
      page.waitForDownload(new Page.WaitForDownloadOptions().setTimeout(120000), () => modal.runButton.click())
    val zipPath = java.nio.file.Files.createTempFile("cs-exported-values", ".zip")
    try
      download.saveAs(zipPath)
      val zip = new java.util.zip.ZipFile(zipPath.toFile)
      try
        zip.entries().asScala
          .filterNot(_.isDirectory)
          .map(e => e.getName -> new String(zip.getInputStream(e).readAllBytes(), java.nio.charset.StandardCharsets.UTF_8))
          .toList
          // The exporter chunks by size and names each chunk `<first index>-<last index>.json`;
          // ordering by that first index keeps a multi-chunk export in one sequence.
          .sortBy((name, _) => ConsumerSessionPage.chunkFirstIndex(name))
          .flatMap { (name, text) =>
            val root = ConsumerSessionPage.jsonMapper.readTree(text)
            assert(root.isArray, s"the exported chunk '$name' is not a JSON array: ${text.take(200)}")
            root.elements().asScala.toList.map { node =>
              // The premise the whole comparison rests on: the exporter writes each value as it
              // reached the browser, and these specs produce STRING payloads, so every entry must
              // be a JSON string. A payload that stopped being one would otherwise compare as "".
              assert(node.isTextual, s"an exported value is not a JSON string: ${node.toString.take(200)}")
              node.asText
            }
          }
      finally zip.close()
    finally
      java.nio.file.Files.deleteIfExists(zipPath)
      modal.close()

  /** The rendered (DOM) width of a column header in px - proves a persisted width is actually applied. */
  def columnDomWidth(key: String): Double =
    val b = th(key).boundingBox()
    if b == null then -1.0 else b.width

  /** Wait for the message table header to be rendered (e.g. after a reload). */
  def waitHeader(timeoutMs: Double = 20000): Unit =
    assertThat(th("publishTime")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(timeoutMs))

  /** Scroll the message rows by `dy` px (wheel over the table; negative = up), then let it settle. */
  def scrollTableBy(dy: Int): Unit =
    val b = table.boundingBox()
    page.mouse().move(b.x + b.width / 2, b.y + b.height / 2)
    page.mouse().wheel(0, dy)
    page.waitForTimeout(400)

  def scrollTableDown(dy: Int): Unit = scrollTableBy(dy)
  /** Scroll the message rows all the way to the top (a running session auto-scrolls to the bottom). */
  def scrollTableToTop(): Unit = scrollTableBy(-100000)

  /** The message index (`displayIndex`, in the first `cs-message` cell) of the first currently-
    * rendered row - it rises when the (virtualized) rows actually scroll. */
  def firstRenderedIndex: Int =
    messages.allInnerTexts().asScala.headOption.map(_.trim).flatMap(_.toIntOption).getOrElse(-1)

  /** Pixel position of the virtualized message viewport. This complements `firstRenderedIndex`:
    * the rendered range can stay the same after a small but still user-visible scroll jump. */
  def tableScrollTop: Double =
    tableScroller.evaluate("element => element.scrollTop") match
      case n: Number => n.doubleValue()
      case value     => throw new AssertionError(s"message viewport scrollTop is not numeric: $value")

  // --- Scoped sub-objects ---
  def sessionFilterPanel: FilterPanel    = FilterPanel(page, sessionFilters)
  /** The per-target filter chain (visible without "advanced"); this is the path that actually filters
    * the streamed rows. Session-level filters only edit config in these tests. */
  def targetFilterPanel: FilterPanel     = FilterPanel(page, targetFilters)
  def target(i: Int = 0): TargetSelector = TargetSelector(page, targets.nth(i))

  // --- Navigation ---
  def openForTopic(tenant: String, namespace: String, topic: String): Unit =
    openForTopic(tenant, namespace, topic, persistency = "persistent")

  /** `persistency` is the route segment: "persistent" or "non-persistent". */
  def openForTopic(tenant: String, namespace: String, topic: String, persistency: String): Unit =
    page.navigate(s"/tenants/$tenant/namespaces/$namespace/topics/$persistency/$topic/consumer-session")

  /** Namespace-level mount (no current topic) - drives CS-7. */
  def openForNamespace(tenant: String, namespace: String): Unit =
    page.navigate(s"/tenants/$tenant/namespaces/$namespace/consumer-session")

  /** Switch target 1's topic selector to "Specific Topic(s)" and enter the given FQNs. */
  def setTargetTopicsSpecific(topicFqns: Seq[String]): Unit =
    page.getByTestId("cs-target-mode").first().selectOption(new SelectOption().setValue("multi-topic-selector"))
    topicFqns.foreach { fqn =>
      val input = page.getByTestId("cs-target-fqn-input").first()
      input.fill(fqn)
      input.press("Enter")
    }

  /** Toggle target 1's read-compacted consumption mode. */
  def toggleTargetCompacted(): Unit = page.getByTestId("cs-target-compacted").first().click()

  val startFromDegradedBanner: Locator = page.getByTestId("cs-start-from-degraded")

  def setStartFrom(label: String): Unit =
    startFromSelect.selectOption(new SelectOption().setLabel(label))

  /** Every Start-From option as (visible label, is it selectable). A mode the selected topics cannot
    * honour is rendered `disabled` rather than hidden, so the list is a stable catalog and the flag
    * is what varies - which is why both halves are read here rather than just the labels. */
  def startFromOptions: List[(String, Boolean)] =
    startFromSelect.locator("option").all().asScala.toList
      .map(o => o.innerText().trim -> (o.getAttribute("disabled") == null))

  def startFromLabels: List[String] = startFromOptions.map(_._1)
  def disabledStartFromLabels: List[String] = startFromOptions.filterNot(_._2).map(_._1)

  /** Start From = "Approximate position (% of data)", set to `percent` of the retained broker entries
    * (0-100; the model stores the fraction). */
  def setStartFromEntryPercent(percent: String): Unit = startFromEntryFraction.fill(percent)

  /** Start From = "Approximate position (% of time)", set to `percent` between a logical topic's
    * retained boundary-entry publish times (0-100; the model stores the fraction). */
  def setStartFromPublishTimePercent(percent: String): Unit = startFromPublishTimeFraction.fill(percent)

  /** Start From = "Specific time", set to `at` in the BROWSER's local zone (same machine as the
    * test JVM, so `LocalDateTime.ofInstant(i, ZoneId.systemDefault)` is the right conversion).
    *
    * The picker is second-granular and rebuilds its Date from ALL six inputs on every change, so
    * the fields are filled in coarse-to-fine order and the final `second` write is what commits the
    * complete tuple. That last write is nudged through a different value first: React suppresses an
    * onChange when the input's value is unchanged, which would otherwise leave the picker holding
    * whatever it was seeded with (`new Date()`) whenever the target second happened to match. */
  def setStartFromDateTime(at: java.time.LocalDateTime): Unit =
    def part(name: String, value: Int): Unit =
      startFromAdditional.locator(s"input[name='$name']").fill(value.toString)
    part("year", at.getYear)
    part("month", at.getMonthValue)
    part("day", at.getDayOfMonth)
    part("hour24", at.getHour)
    part("minute", at.getMinute)
    part("second", if at.getSecond == 0 then 1 else 0)
    part("second", at.getSecond)

  /** Start From = "Relative time ago", e.g. `setStartFromRelative(10, "second")`. `unit` is the
    * option value: second | minute | hour | day | week | month | year. */
  def setStartFromRelative(value: Int, unit: String): Unit =
    startFromAdditional.locator("input[type='number']").fill(value.toString)
    startFromAdditional.locator("select").selectOption(new SelectOption().setValue(unit))

  /** Delivery order: 'Guaranteed', 'Best effort', or 'Fastest'. */
  def setDeliveryOrder(label: String): Unit =
    page.getByTestId("cs-delivery-order").selectOption(new SelectOption().setLabel(label))

  /** Order by: 'Publish time', 'Broker publish time', or 'Event time'. Hidden for Fastest. */
  def setOrderTime(label: String): Unit =
    page.getByTestId("cs-delivery-order-key").selectOption(new SelectOption().setLabel(label))
  def setDeserializer(label: String): Unit = deserializerSelect.selectOption(new SelectOption().setLabel(label))
  def addTarget(): Unit = addTargetButton.click()

  def addProjection(): Unit =
    sessionProjections.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Add Projection")).click()

  def addColoringRule(): Unit =
    sessionColoring.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Add Coloring Rule")).click()

  /** Click a palette swatch by its color name (e.g. "red-500"); auto-applies + closes the modal. */
  def pickSwatch(colorName: String): Unit =
    page.locator(s"[data-tooltip-content='$colorName']").click()

  /** Start (or resume) the session. The first play in a fresh context pops the "Pulsar Credentials"
    * modal; give it a beat to render, then dismiss it if present and re-click play. */
  def play(): Unit =
    playButton.click()
    page.waitForTimeout(500)
    val credentialsModal = page.getByText("Pulsar Credentials")
    if credentialsModal.isVisible then
      page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Done").setExact(true)).click()
      playButton.click()

  def stop(): Unit               = stopButton.click()

  // --- the browser-wide delivery controls (localStorage-backed, in the toolbar) ---
  val rateLimitInput: Locator  = page.getByTestId("cs-rate-limit")
  val pauseAfterInput: Locator = page.getByTestId("cs-pause-after")

  /** Commit a rate limit (msgs/second, 0 clears). The input is draft-committed on Enter/blur. */
  def setRateLimit(n: Int): Unit =
    rateLimitInput.fill(if n > 0 then n.toString else "")
    rateLimitInput.press("Enter")

  /** Commit an auto-pause threshold (messages loaded, 0 clears). */
  def setPauseAfter(n: Int): Unit =
    pauseAfterInput.fill(if n > 0 then n.toString else "")
    pauseAfterInput.press("Enter")
  def clickFirstMessage(): Unit  = messages.first().click()
  def searchInResults(t: String): Unit = searchInput.fill(t)
  /** Open without accidentally closing an already-open default/persisted panel. Waiting for the
    * toolbar first keeps the visibility check from racing the initial React render. */
  def openTools(): Unit =
    assertThat(toolsButton).isVisible()
    if !toolsResizeHandle.isVisible then toggleTools()

  /** Close through the panel's user-facing cross, but remain idempotent for setup/cleanup paths. */
  def closeTools(): Unit =
    assertThat(toolsButton).isVisible()
    if toolsResizeHandle.isVisible then toolsCloseButton.click()

  /** Deliberately invert visibility. Force-click because the button's tooltip can overlap it. */
  def toggleTools(): Unit = toolsButton.click(new Locator.ClickOptions().setForce(true))

  /** Drag either consumer-session pane handle through the real document-level mouse path used by
    * the resize hook. Positive x/y moves right/down; negative moves left/up. */
  private def dragPaneResize(handle: Locator, dx: Int, dy: Int): Unit =
    val b: BoundingBox = handle.boundingBox()
    assert(b != null, s"resize handle '${handle}' has no live bounding box")
    val sx = b.x + b.width / 2
    val sy = b.y + b.height / 2
    page.mouse().move(sx, sy)
    page.mouse().down()
    page.mouse().move(sx + dx, sy + dy, new Mouse.MoveOptions().setSteps(8))
    page.mouse().up()
    // The shared resize primitive batches updates through requestAnimationFrame.
    page.waitForTimeout(100)

  /** The bottom panel grows when its top edge is dragged up, and shrinks when dragged down. */
  def resizeToolsBy(dy: Int): Unit = dragPaneResize(toolsResizeHandle, dx = 0, dy = dy)

  /** The right-hand inspector grows when its left edge is dragged left, and shrinks when dragged right. */
  def resizeMessageDetailsBy(dx: Int): Unit = dragPaneResize(messageDetailsResizeHandle, dx = dx, dy = 0)

  def toolsPanelDomHeight: Double =
    val b = toolsPanel.boundingBox()
    if b == null then -1.0 else b.height

  def sessionDomHeight: Double =
    val b = session.boundingBox()
    if b == null then -1.0 else b.height

  def tableDomWidth: Double =
    val b = table.boundingBox()
    if b == null then -1.0 else b.width

  def messageDetailsDomWidth: Double =
    val b = messageDetails.boundingBox()
    if b == null then -1.0 else b.width

  /** Sizes are JSON numbers because the panes use `use-local-storage-state`. */
  def storedPaneSize(paneId: String): Double =
    val value = page.evaluate(
      s"""() => {
         |  const raw = localStorage.getItem('pane:$paneId:size');
         |  if (raw === null) return -1;
         |  const parsed = JSON.parse(raw);
         |  return typeof parsed === 'number' ? parsed : -1;
         |}""".stripMargin
    )
    value match { case n: Number => n.doubleValue(); case _ => -1.0 }

  def setStoredPaneSize(paneId: String, size: Double): Unit =
    page.evaluate(
      s"""() => localStorage.setItem('pane:$paneId:size', JSON.stringify($size))"""
    )

  // --- state (CS-16..19) ---
  def state: String = session.getAttribute("data-cs-state")
  def assertState(s: String, timeoutMs: Double = 20000): Unit =
    assertThat(session).hasAttribute("data-cs-state", s, new LocatorAssertions.HasAttributeOptions().setTimeout(timeoutMs))

  /** While `running`, clicking Play requests a pause (Toolbar: running -> 'pausing'). */
  def pauseFromToolbar(): Unit = playButton.click()

  def waitMessages(n: Int, timeoutMs: Double = 20000): Unit =
    assertThat(messages).hasCount(n, new LocatorAssertions.HasCountOptions().setTimeout(timeoutMs))

  /** Wait until the toolbar reports `n` messages loaded. Use this instead of `waitMessages` when n is
    * larger than a viewport - the message table is virtualized, so DOM rows != loaded messages.
    *
    * The counter renders through `numeral(n).format('0,0')`, so the expected text must carry the
    * same thousands separator - `hasText("2000")` against a counter showing "2,000" waited out its
    * whole timeout on a session that had in fact finished. */
  def awaitLoaded(n: Int, timeoutMs: Double = 30000): Unit =
    val expected = java.text.NumberFormat.getIntegerInstance(java.util.Locale.US).format(n.toLong)
    assertThat(loaded).hasText(expected, new LocatorAssertions.HasTextOptions().setTimeout(timeoutMs))

  /** How many messages the session is actually HOLDING, after display retention - a different
    * number from [[loadedCount]] and read from a different source.
    *
    * `cs-loaded` is the SERVER's `numMessageSent`; this is the length of the browser's own message
    * array, which is capped at the session's `numDisplayItems` limit (10,000 unless the config
    * raises it). Any exact-set assertion over the whole delivered stream is only meaningful while
    * these two agree - past the cap the browser has deliberately dropped its oldest rows, and the
    * exported set is a tail rather than the whole story. */
  def retainedCount: Int =
    val raw = session.getAttribute("data-cs-retained")
    raw.toIntOption.getOrElse(throw new AssertionError(s"data-cs-retained does not read as a number: '$raw'"))

  /** The Session Configuration's "Limit num. display messages" toggle and its number field. */
  val limitDisplayItemsToggle: Locator = page.getByTestId("cs-limit-display-items")
  val numDisplayItemsInput: Locator    = page.getByTestId("cs-num-display-items")

  /** Keep at most `n` messages on screen - the session's own `numDisplayItems` retention.
    *
    * A test that wants to assert the EXACT set of a large delivery has to raise this: the default
    * is 10,000 and the browser drops its oldest rows past it, so beyond that the delivered set is
    * unobservable and only counts remain. The toggle is what reveals the field (it is
    * `visibility: hidden` while off, so Playwright cannot fill it), and it is idempotent here so a
    * caller need not know the current state. */
  def setNumDisplayItems(n: Int): Unit =
    if limitDisplayItemsToggle.getAttribute("data-checked") != "true" then limitDisplayItemsToggle.click()
    numDisplayItemsInput.fill(n.toString)

  /** The toolbar's loaded counter as a number, right now. Digits only: it is rendered through
    * `numeral(n).format('0,0')`, so a four-figure count carries a thousands separator. */
  def loadedCount: Int =
    val digits = loaded.innerText().replaceAll("[^0-9]", "")
    digits.toIntOption.getOrElse(throw new AssertionError(s"the loaded counter does not read as a number: '${loaded.innerText()}'"))

  // --- lifecycle triggers (CS-18) ---
  def wheelUpOverTable(): Unit =
    val b = table.boundingBox()
    page.mouse().move(b.x + b.width / 2, b.y + b.height / 2)
    page.mouse().wheel(0, -150)

  /** Simulate a window/tab blur (the app pauses on visibilitychange -> hidden). */
  def blurWindow(): Unit =
    page.evaluate(
      """() => {
        |  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        |  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        |  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
        |}""".stripMargin)

  // --- table (CS-20/21/22/26) ---
  // The CS message table renders <th> outside a <table>, so ARIA columnheader role isn't implied;
  // count the instrumented header cells instead.
  def headerCount: Int = table.locator("[data-testid^='cs-th-']").count()
  /** 'sticky' if the header cell or any ancestor is position:sticky, else 'not-sticky'. */
  def firstHeaderPosition: String =
    table.locator("[data-testid^='cs-th-']").first().evaluate(
      "el => { let e = el; while (e && e !== document.body) { if (getComputedStyle(e).position === 'sticky') return 'sticky'; e = e.parentElement; } return 'not-sticky'; }"
    ).asInstanceOf[String]

  def sortBy(key: String): Unit = th(key).click()
  def sortAttr: String = table.getAttribute("data-cs-sort")
  def assertSort(v: String, timeoutMs: Double = 5000): Unit =
    assertThat(table).hasAttribute("data-cs-sort", v, new LocatorAssertions.HasAttributeOptions().setTimeout(timeoutMs))

  /** Drag a column's resize handle by `dx` px (document-level mousemove/up). */
  def resizeColumn(key: String, dx: Int): Unit =
    val handle = th(key).getByTestId("table-resize-handle")
    val b: BoundingBox = handle.boundingBox()
    val sx = b.x + b.width / 2
    val sy = b.y + b.height / 2
    page.mouse().move(sx, sy)
    page.mouse().down()
    page.mouse().move(sx + dx, sy, new Mouse.MoveOptions().setSteps(8))
    page.mouse().up()

  /** The persisted width for a column, or -1 if unset. */
  def storedColumnWidth(key: String): Double =
    val v = page.evaluate(
      s"""() => { const w = JSON.parse(localStorage.getItem('table:consumer-session-messages:column-widths') || '{}'); return (w['$key'] ?? -1); }""")
    v match { case n: Number => n.doubleValue(); case _ => -1.0 }

  /** Focus the message table so real keyboard input reaches it (it is `tabIndex=0`). */
  def focusTable(): Unit = table.focus()

  /** Press a key as a REAL keyboard user would - the table must be focused first. Exercises the true
    * accessibility path (previously this dispatched a synthetic keydown, bypassing focus entirely).
    * Respects the 64ms in-app debounce between calls. */
  def pressKeyOnTable(key: String): Unit =
    page.keyboard().press(key)
    page.waitForTimeout(120)

object ConsumerSessionPage:
  /** Parses what the full-table harvest returns. jackson-databind is on the compile classpath via
    * the Pulsar admin client (and version-pinned for tests in build.sbt). */
  private val jsonMapper = new com.fasterxml.jackson.databind.ObjectMapper()

  /** The first message index in an exported chunk's file name (`<folder>/<first>-<last>.json`), or
    * `Int.MaxValue` for the exporter's fallback names, which sort last. */
  private def chunkFirstIndex(entryName: String): Int =
    entryName.substring(entryName.lastIndexOf('/') + 1).takeWhile(_.isDigit).toIntOption.getOrElse(Int.MaxValue)
