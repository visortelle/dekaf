package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import java.util.regex.Pattern

class NavigationSpec extends DekafSuite:

  test("NAV-1: root redirects to the instance overview") {
    page.navigate("/")
    assertThat(page).hasURL(Pattern.compile(".*/overview.*"))
    assertThat(page.getByText("Pulsar Instance")).isVisible()
  }

  test("NAV-8: ConfirmationDialog Confirm is gated on an exact guard match") {
    val tenant = fixtures.createTenant()
    page.navigate(s"/tenants/$tenant/overview")
    page.getByTestId("tenant-page-delete-button").click()

    val confirm = page.getByTestId("confirmation-dialog-confirm-button")
    val guard = page.getByTestId("confirmation-dialog-guard-input")
    assertThat(confirm).isDisabled()
    guard.fill(s"${tenant}x")     // near-miss
    assertThat(confirm).isDisabled()
    guard.fill(tenant)            // exact
    assertThat(confirm).isEnabled()
  }

  test("NAV-11: deep-linking a nonexistent tenant shows the 404 page") {
    page.navigate(s"/tenants/${fixtures.unique("missing")}/overview")
    assertThat(page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Go Home")))
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
  }
