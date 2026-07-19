package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

/** INS-5 - the dynamic broker configuration page (/instance/configuration): filter, dynamic-only
  * toggle, and inline edit persisted to the broker. */
class InstanceConfigSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  test("INS-5: dynamic configuration filters by name and toggles dynamic-only") {
    page.navigate("/instance/configuration")
    val rows = page.locator("[data-testid=config-row]")
    assertThat(rows.first()).isVisible(vis(15000))
    val allCount = rows.count()
    assert(allCount > 5, s"expected many config rows, got $allCount")

    // Filter narrows the table.
    page.getByTestId("config-filter").fill("maxConcurrentLookupRequest")
    assertThat(page.locator("[data-testid=config-row][data-config-key='maxConcurrentLookupRequest']")).isVisible(vis(10000))
    eventually() { assert(rows.count() < allCount, s"filter did not reduce rows: ${rows.count()} !< $allCount") }

    // Show-dynamic-only reduces further (dynamic keys are a subset of all keys).
    page.getByTestId("config-filter").fill("")
    assertThat(rows.first()).isVisible(vis(10000))
    val beforeToggle = rows.count()
    page.getByTestId("config-toggle-dynamic").click()
    eventually() { assert(rows.count() < beforeToggle, s"dynamic-only did not reduce rows: ${rows.count()} !< $beforeToggle") }
  }

  test("INS-5: editing a dynamic configuration value persists to the broker") {
    val key = "maxConcurrentLookupRequest"
    // Snapshot the prior value and restore it exactly on teardown (don't clobber pre-existing state).
    val prior = admin.brokers().getAllDynamicConfigurations().asScala.get(key)
    fixtures.onCleanup { () =>
      prior match
        case Some(v) => admin.brokers().updateDynamicConfiguration(key, v)
        case None    => admin.brokers().deleteDynamicConfiguration(key)
    }

    page.navigate("/instance/configuration")
    page.getByTestId("config-filter").fill(key)
    val row = page.locator(s"[data-testid=config-row][data-config-key='$key']")
    assertThat(row).isVisible(vis(10000))
    row.getByTestId("config-edit").click()
    row.getByTestId("config-value-input").fill("50001")
    row.getByTestId("config-update").click()

    assertThat(page.getByText("has been successfully update")).isVisible(vis(10000))
    eventually() {
      assert(admin.brokers().getAllDynamicConfigurations().asScala.get(key).contains("50001"),
        s"broker dynamic config was: ${admin.brokers().getAllDynamicConfigurations()}")
    }
  }
