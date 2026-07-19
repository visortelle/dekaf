package features.library

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern

class LibrarySpec extends DekafSuite:

  /** Fresh topic, navigate to its overview (where the Library sidebar mounts); returns (tenant, ns, topic). */
  private def openTopicOverview(): (String, String, String) =
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$tenant/$ns/$topic")
    page.navigate(s"/tenants/$tenant/namespaces/$ns/topics/persistent/$topic/overview")
    (tenant, ns, topic)

  test("LIB-17: 'New Consumer Session' navigates to the topic's consumer-session route") {
    openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.newConsumerSessionButton.click()
    assertThat(page).hasURL(Pattern.compile(".*/consumer-session.*"))
  }

  test("LIB-2: Library and Notes tabs switch content") {
    openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openNotesTab()
    assertThat(lib.createFirstNoteButton).isVisible()   // Notes content (fresh topic → 0 notes)
    lib.openLibraryTab()
    assertThat(lib.newConsumerSessionButton).isVisible() // Library content
  }

  test("LIB-7: creating a note persists across reload") {
    val (tenant, ns, topic) = openTopicOverview()
    val overviewUrl = s"/tenants/$tenant/namespaces/$ns/topics/persistent/$topic/overview"

    val lib = LibrarySidebar(page)
    lib.openNotesTab()
    lib.createNote()
    assertThat(lib.noteTabs).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(10000))

    // Reload the page - the note is server-persisted, scoped to this topic's context.
    page.navigate(overviewUrl)
    lib.openNotesTab()
    assertThat(lib.noteTabs).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(10000))
  }
