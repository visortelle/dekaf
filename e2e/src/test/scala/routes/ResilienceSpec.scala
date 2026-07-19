package routes

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions

/** RES-1/2/3 - negative / resilience: bogus routes 404, a bad saved-session id degrades gracefully,
  * and the unguarded non-persistent details route is documented. */
class ResilienceSpec extends DekafSuite:
  private def goHome = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Go Home"))

  test("RES-1: bogus deep-links under each resource family render the 404 page") {
    val bogus = List(
      "/instance/this-is-not-a-real-page",
      "/tenants/nope-xyz/this-is-not-a-tab",
      "/tenants/nope-xyz/namespaces/nope/this-is-not-a-tab",
      "/tenants/nope-xyz/namespaces/nope/topics/persistent/nope/this-is-not-a-tab"
    )
    for path <- bogus do
      page.navigate(path)
      assertThat(goHome).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
  }

  test("RES-2: opening a consumer session with a bad saved-session id degrades gracefully") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    // A non-existent managed session id must not crash the page - it falls back to a fresh session.
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/consumer-session?id=does-not-exist-xyz")
    val cs = ConsumerSessionPage(page)
    // The toolbar still renders (no ErrorBoundary blank / crash) - that is the graceful degradation.
    assertThat(cs.playButton).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
  }

  test("RES-3: the unguarded non-persistent /details route renders without a blank crash") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("nptopic")
    admin.topics().createNonPartitionedTopic(s"non-persistent://$t/$ns/$topic")

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/non-persistent/$topic/details")
    // Chrome (breadcrumbs) is not enough - it renders even if the Details BODY crashed to blank. Assert
    // a Details-body-specific anchor: either the policy editor (is-global toggle / a category tab) or
    // the "policies disabled" message. One of them proves the body rendered content, not a blank crash.
    assertThat(page.getByTestId("breadcrumbs")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
    assertThat(
      page.getByText(java.util.regex.Pattern.compile("Delayed delivery|Topic level policies are not enabled", java.util.regex.Pattern.CASE_INSENSITIVE)).first()
    ).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
  }
