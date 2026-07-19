package features.library

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import ui.ConfirmationDialog

class LibraryNotesSpec extends DekafSuite:

  private def overviewUrl(t: String, ns: String, topic: String): String =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview"

  private def openTopicOverview(): (String, String, String) =
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(overviewUrl(t, ns, topic))
    (t, ns, topic)

  private def ct = new LocatorAssertions.HasCountOptions().setTimeout(10000)

  test("LIB-14: Create First Note yields a persistent 'Note 1'") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openNotesTab()
    lib.createNote()
    assertThat(lib.noteTab("Note 1")).hasCount(1, ct)
    page.navigate(overviewUrl(t, ns, topic))
    lib.openNotesTab()
    assertThat(lib.noteTab("Note 1")).hasCount(1, ct)
  }

  test("LIB-15: renaming then deleting a note returns to the empty state") {
    openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openNotesTab()
    lib.createNote()
    lib.noteTab("Note 1").getByTestId("lib-note-rename").click()
    page.getByTestId("lib-name-input").fill("Renamed Note")
    page.getByTestId("lib-name-confirm").click()
    assertThat(lib.noteTab("Renamed Note")).hasCount(1, ct)
    lib.noteTab("Renamed Note").getByTestId("lib-note-delete").click()
    ConfirmationDialog(page).confirmButton.click()
    assertThat(lib.createFirstNoteButton).isVisible()      // back to empty state
  }

  // NOTE: instance-scope leg is NOT parallel-safe and leaks one instance note (no LibraryService teardown).
  // Run in a serial lane. See packet NOTES.
  test("LIB-16: the '⭐️ Updates' pseudo-note appears only on the Instance scope") {
    // Topic scope: a real note, but no Updates pseudo-note.
    openTopicOverview()
    val libT = LibrarySidebar(page)
    libT.openNotesTab()
    libT.createNote()
    assertThat(libT.noteTab("⭐️ Updates")).hasCount(0)
    // Instance scope: once >=1 note exists, the Updates pseudo-note is concatenated in.
    page.navigate("/overview")
    val libI = LibrarySidebar(page)
    libI.openNotesTab()
    libI.createNote()
    assertThat(libI.noteTab("⭐️ Updates")).hasCount(1, ct)
  }
