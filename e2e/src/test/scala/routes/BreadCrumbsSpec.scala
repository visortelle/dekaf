package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern

/** NAV-5 - breadcrumbs reflect the resource, navigate on click, and copy the FQN. */
class BreadCrumbsSpec extends DekafSuite:
  test("NAV-5: breadcrumbs reflect the resource, navigate on click, and copy the FQN") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    assertThat(page.getByTestId("breadcrumbs")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
    assertThat(page.locator("[data-testid=breadcrumb][data-crumb-type=tenant]")).containsText(t)
    assertThat(page.locator("[data-testid=breadcrumb][data-crumb-type=namespace]")).containsText(ns)

    // Copy FQN -> success toast. (JS regex engine rejects (?i) inline; use CASE_INSENSITIVE.)
    page.getByTestId("breadcrumbs-copy-fqn").click()
    assertThat(page.getByText(Pattern.compile("copied to clipboard", Pattern.CASE_INSENSITIVE)))
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))

    // Click the tenant crumb -> navigate to the tenant overview.
    page.locator("[data-testid=breadcrumb][data-crumb-type=tenant]").click()
    page.waitForURL(s"**/tenants/$t/overview**")
  }
