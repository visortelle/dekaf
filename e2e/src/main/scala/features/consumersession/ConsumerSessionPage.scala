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
  val playButton: Locator      = page.getByTestId("cs-play")
  val stopButton: Locator      = page.getByTestId("cs-stop")
  val toolsButton: Locator     = page.getByTestId("cs-tools")
  val searchInput: Locator     = page.getByTestId("cs-search")
  val startFromSelect: Locator = page.getByTestId("cs-start-from")
  val messages: Locator        = page.getByTestId("cs-message")
  val messageDetails: Locator  = page.getByTestId("cs-message-details")

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
  // let a test drive "% through the data" while asserting "% through the time range".
  val startFromDataFraction: Locator       = page.getByTestId("cs-start-from-data-fraction")
  val startFromDataFractionSlider: Locator = page.getByTestId("cs-start-from-data-fraction-slider")
  val startFromDataFractionError: Locator  = page.getByTestId("cs-start-from-data-fraction-error")
  val startFromTimeFraction: Locator       = page.getByTestId("cs-start-from-time-fraction")
  val startFromTimeFractionSlider: Locator = page.getByTestId("cs-start-from-time-fraction-slider")
  val startFromTimeFractionError: Locator  = page.getByTestId("cs-start-from-time-fraction-error")
  val startFromNonPersistentNote: Locator    = page.getByTestId("cs-start-from-non-persistent-note")
  val startFromMixedPersistencyNote: Locator = page.getByTestId("cs-start-from-mixed-persistency-note")
  val startFromProgress: Locator             = page.getByTestId("cs-start-from-progress")

  // --- Advanced reveal (CS-15) ---
  val advancedToggle: Locator = page.getByTestId("cs-advanced-toggle")

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
  val session: Locator             = page.getByTestId("cs-session")
  val table: Locator               = page.getByTestId("cs-table")
  val numFound: Locator            = page.getByTestId("cs-num-found")
  val loaded: Locator              = page.getByTestId("cs-loaded")
  val messageDetailsClose: Locator = page.getByTestId("cs-message-details-close")
  val exportOpen: Locator          = page.getByTestId("cs-export-open")

  def th(key: String): Locator   = page.getByTestId(s"cs-th-$key")
  def cell(key: String): Locator = page.getByTestId(s"cs-cell-$key")
  val selectedIndexCell: Locator = page.locator("[data-testid='cs-message'][data-cs-selected='true']")

  /** The visible values of a message column, in rendered row order (e.g. `columnValues("key")`).
    * String cells render JSON-quoted (`"k-1"`), so a single surrounding quote pair is stripped. */
  def columnValues(key: String): List[String] =
    cell(key).allInnerTexts().asScala.toList.map(_.trim).map: v =>
      if v.length >= 2 && v.startsWith("\"") && v.endsWith("\"") then v.substring(1, v.length - 1) else v

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

  /** Start From = "About % through the data", set to `percent` of the messages a topic still holds
    * (0-100; the model stores the fraction). */
  def setStartFromDataPercent(percent: String): Unit = startFromDataFraction.fill(percent)

  /** Start From = "About % through the time range", set to `percent` of the time a topic still
    * covers (0-100; the model stores the fraction). */
  def setStartFromTimePercent(percent: String): Unit = startFromTimeFraction.fill(percent)

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

  def revealAdvanced(): Unit = advancedToggle.click()
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
  // Force-click: the button's own "Toggle additional tools" tooltip can overlay it and intercept a normal click.
  def openTools(): Unit          = toolsButton.click(new Locator.ClickOptions().setForce(true))

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
