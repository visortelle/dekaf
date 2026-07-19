package features.library

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern

class LibrarySelectSpec extends DekafSuite:

  private def overviewUrl(t: String, ns: String, topic: String): String =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview"

  private def openTopicOverview(): (String, String, String) =
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(overviewUrl(t, ns, topic))
    (t, ns, topic)

  test("LIB-18: picking a saved session navigates with a managedConsumerSessionId and loads it (P0)") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("consumer-session-config", "picked-session")
    // fresh navigation so the Consumer Sessions sub-tab list re-fetches
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab()
    lib.openConsumerSessionsSubtab()
    val browser = LibraryBrowser(page)
    browser.result("picked-session").click()     // select the saved session
    browser.selectButton.click()                 // "Select"
    assertThat(page).hasURL(Pattern.compile(".*/consumer-session\\?id=.+"))
    assertThat(ConsumerSessionPage(page).playButton).isVisible()   // the session config loaded
  }

  // LIB-21 - reference -> value. Loading a session by `?id=` mounts the top-level config as
  // { type: 'reference', ref: id } (TopicPage.tsx:296-299), which renders the reference icon in
  // SessionConfiguration's LibraryBrowserPanel; clicking it converts the reference to a value.
  test("LIB-21: a referenced session config can be converted to a value") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("consumer-session-config", "ref-session")
    // Pick it -> navigates to /consumer-session?id=<id> -> the config is loaded by reference.
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab()
    lib.openConsumerSessionsSubtab()
    val browser = LibraryBrowser(page)
    browser.result("ref-session").click()
    browser.selectButton.click()
    // The top-level config is a reference -> exactly one reference icon is shown once it resolves.
    val referenceIcon = page.getByTestId("lib-reference-icon")
    assertThat(referenceIcon).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(15000))
    // Convert reference -> value; the icon disappears (managedItemReference becomes undefined).
    referenceIcon.click()
    assertThat(referenceIcon).hasCount(0)
  }
