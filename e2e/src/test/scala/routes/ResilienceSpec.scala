package routes

import harness.DekafSuite
import harness.Eventually.eventually
import features.consumersession.ConsumerSessionPage
import features.library.LibrarySidebar
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions

/** RES-1/2/3 - negative / resilience: bogus routes 404, a saved-session id that is missing or
  * points at a malformed persisted config degrades gracefully, and the unguarded non-persistent
  * details route is documented. */
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

  test("RES-2: opening a consumer session with a MISSING saved-session id degrades gracefully") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    // A non-existent managed session id must not crash the page - it falls back to a fresh session.
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/consumer-session?id=does-not-exist-xyz")
    val cs = ConsumerSessionPage(page)
    // The toolbar still renders (no ErrorBoundary blank / crash) - that is the graceful degradation.
    assertThat(cs.playButton).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
  }

  // A `?id=` pointing at a persisted library item whose stored content is NOT a consumer-session
  // config (here a message-filter, saved through the app's own Library) used to take the WHOLE app
  // down: the editor reached for `spec.targets` on the foreign spec and threw "TypeError: Cannot
  // read properties of undefined (reading 'map')" during render, and with no error boundary React
  // unmounted everything - document.body rendered EMPTY. The session configuration editor now checks
  // the stored shape and reports it, and the session subtree sits behind an error boundary, so this
  // degrades like the missing-id case above (untagged from KnownBug per e2e/README.md §6).
  test("RES-2: opening a consumer session whose persisted config is MALFORMED degrades gracefully") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val overviewUrl = s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview"
    page.navigate(overviewUrl)

    // Arrange through the app's own persistence path: save a library item whose content is
    // structurally invalid FOR THIS ROUTE, then read its real id out of the app's item editor.
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "malformed-session")
    page.navigate(overviewUrl) // reload so the library search re-fetches (see LIB-8/12)
    lib.openLibraryTab()
    lib.browseType("message-filter").editItem("malformed-session")
    val itemId = eventually() {
      val editorText = page.getByTestId("lib-save-dialog").innerText()
      // The editor renders `ID:&nbsp;<uuid>`, and a non-breaking space is not `\s` - skip any
      // non-hex separator instead.
      raw"ID:[^0-9a-fA-F]*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})".r
        .findFirstMatchIn(editorText)
        .map(_.group(1))
        .getOrElse(throw new AssertionError(s"no item id in the library item editor: $editorText"))
    }

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/consumer-session?id=$itemId")

    // The app must survive a malformed persisted config: its chrome still renders (the document is
    // not blank) ...
    assertThat(page.getByTestId("breadcrumbs")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
    // ... and the route shows either a usable session or a visible error - never an empty shell.
    assertThat(
      ConsumerSessionPage(page).playButton
        .or(page.getByText(java.util.regex.Pattern.compile("Unable to fetch item", java.util.regex.Pattern.CASE_INSENSITIVE)))
        .first()
    ).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
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
