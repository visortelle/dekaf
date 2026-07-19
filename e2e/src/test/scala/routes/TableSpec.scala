package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

/** NAV-6 - the shared Table primitive: counter, refresh, sort, filter chip, resize-persist.
  * Exercised through the tenants list (`/tenants`, tableId `tenants-table`). */
class TableSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  private def openTenantsTable(): Unit =
    fixtures.createTenant(); fixtures.createTenant(); fixtures.createTenant()
    page.navigate("/tenants")
    assertThat(page.getByTestId("table-counter")).isVisible(vis(15000))

  /** The rendered tenant names, in row order (the sticky first column of each row). */
  private def visibleTenantNames(): List[String] =
    page.locator("tbody tr td:nth-child(1)").allInnerTexts().asScala.toList.map(_.trim).filter(_.nonEmpty)

  /** The persisted width of a tenants-table column, or -1 when unset. */
  private def storedWidth(col: String): Double =
    page.evaluate(
      s"""() => { const w = JSON.parse(localStorage.getItem('table:tenants-table:column-widths') || '{}'); return (w['$col'] ?? -1); }"""
    ) match { case n: Number => n.doubleValue(); case _ => -1.0 }

  test("NAV-6: the table counter reflects the data and Refresh actually re-loads it") {
    openTenantsTable()
    assertThat(page.getByTestId("table-counter")).containsText("of")

    // Turn OFF auto-refresh first - otherwise SWR's periodic poll (enabled by default) would bring in
    // the new tenant on its own and a dead Refresh button would pass anyway.
    val autoRefresh = page.getByTestId("table-auto-refresh")
    if autoRefresh.getAttribute("data-checked") == "true" then autoRefresh.click()
    assertThat(autoRefresh).hasAttribute("data-checked", "false")

    // Change server state behind the table's back. It must stay absent past a refresh interval
    // (proving the poll is really off), then appear ONLY after the explicit Refresh click.
    val added = fixtures.createTenant()
    page.waitForTimeout(6000)
    assertThat(page.getByText(added)).hasCount(0, cnt(2000))
    page.getByTestId("table-refresh").click()
    assertThat(page.getByText(added).first()).isVisible(vis(15000))
  }

  test("NAV-6: the active filter chip filters the rows and can be removed") {
    openTenantsTable()
    // The tenants table ships `defaultFiltersInUse` with tenantName ACTIVE, so the chip is present
    // from the start (and that is also why the header's filter icon is hidden: `!isColumnFiltered`).
    val chip = page.locator("[data-testid=table-filter-chip][data-column-key=tenantName]")
    assertThat(chip).isVisible(vis(15000))

    val all = visibleTenantNames()
    assert(all.contains("public"), s"expected the seeded 'public' tenant among: $all")

    // Typing into the chip filters the rows (client-side, debounced).
    chip.getByTestId("table-filter-chip-value").fill("public")
    eventually() {
      val shown = visibleTenantNames()
      assert(shown.nonEmpty && shown.forall(_.contains("public")), s"filter not applied, rows: $shown")
    }

    // Removing the chip restores the unfiltered rows.
    chip.getByTestId("table-filter-chip-remove").click()
    assertThat(chip).hasCount(0, cnt(5000))
    eventually() {
      assert(visibleTenantNames().size == all.size, s"rows not restored after removing the filter")
    }
  }

  test("NAV-6: clicking a sortable header toggles the direction AND re-orders the rows") {
    openTenantsTable()
    val nameTh = page.locator("[data-testid=table-th][data-column-key=tenantName]")
    assertThat(nameTh).hasAttribute("data-sort-direction", "asc")

    // Ascending: the visible names are actually in ascending order.
    val asc = visibleTenantNames()
    assert(asc == asc.sorted, s"rows not ascending: $asc")

    nameTh.click()
    assertThat(nameTh).hasAttribute("data-sort-direction", "desc")
    // Descending: the order really flipped (not just the attribute).
    val desc = visibleTenantNames()
    assert(desc == desc.sorted.reverse, s"rows not descending: $desc")
    assert(desc.head != asc.head, s"first row unchanged after toggling sort: ${asc.head}")
  }

  test("NAV-6: a resized column width persists across reload and is re-applied to the DOM") {
    openTenantsTable()
    val nameTh = page.locator("[data-testid=table-th][data-column-key=tenantName]")
    val handle = nameTh.locator("[data-testid=table-resize-handle]")
    val box = handle.boundingBox()
    assert(box != null, "resize handle has no bounding box")
    // Baseline the LIVE rendered width BEFORE the drag, so we can prove the drag actually applied to
    // the DOM (an impl that only writes localStorage would leave both widths at the default default).
    val domBaseline = nameTh.boundingBox().width
    val cx = box.x + box.width / 2
    val cy = box.y + box.height / 2
    page.mouse().move(cx, cy)
    page.mouse().down()
    page.mouse().move(cx + 90, cy)
    page.mouse().up()

    val stored = storedWidth("tenantName") // default is 300; the drag widens it
    assert(stored > 300, s"width not persisted after resize: $stored")
    val domAfterResize = nameTh.boundingBox().width
    assert(domAfterResize > domBaseline + 20,
      s"resize was not applied to the live DOM: ${domBaseline}px -> ${domAfterResize}px")

    page.reload()
    assertThat(page.getByTestId("table-counter")).isVisible(vis(15000))
    // Storage kept it AND the restored column renders at the widened width, not the default.
    assert(storedWidth("tenantName") == stored, s"stored width not stable across reload: $stored -> ${storedWidth("tenantName")}")
    val domAfterReload = nameTh.boundingBox().width
    assert(math.abs(domAfterReload - domAfterResize) <= 3,
      s"restored column rendered at ${domAfterReload}px, expected ~${domAfterResize}px (persisted width not re-applied)")
  }
