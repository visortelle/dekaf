package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** NAV-7 - modal stack: Escape closes the top modal; a route change clears the whole stack. */
class ModalsSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  test("NAV-7: Escape closes an open modal") {
    page.navigate("/overview")
    page.getByTestId("credentials-button").click()
    val modal = page.getByTestId("modal")
    assertThat(modal).isVisible(vis(10000))
    modal.press("Escape")
    assertThat(modal).hasCount(0, cnt(8000))
  }

  test("NAV-7: navigating to another route clears the modal stack") {
    val t = fixtures.createTenant()
    page.navigate(s"/tenants/$t/overview")
    page.getByTestId("credentials-button").click()
    assertThat(page.getByTestId("modal")).isVisible(vis(10000))
    // SPA navigation via the instance breadcrumb.
    page.locator("[data-testid=breadcrumb][data-crumb-type=instance]").click()
    assertThat(page.getByTestId("modal")).hasCount(0, cnt(8000))
  }
