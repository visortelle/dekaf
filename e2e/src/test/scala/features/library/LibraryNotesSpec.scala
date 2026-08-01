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

  /** Hold every `ListLibraryItems` response back by `delayMs`, from inside the browser.
    *
    * ARRANGEMENT, not a readiness wait: the panel's loading state is only observable while its first
    * fetch is genuinely in flight, and on a local stack that window is a few milliseconds wide - far
    * too narrow for a test to land in reliably. Widening it deterministically is the only way to
    * make the state a test can be written against.
    *
    * Done by wrapping `XMLHttpRequest.send` in the page (grpc-web's transport) rather than with
    * Playwright's `page.route`: a Java route handler that sleeps blocks the driver's dispatch loop,
    * which would ALSO stall the test's own `isVisible` call and hide the very race being reproduced.
    * A `setTimeout` in the page delays exactly one request and nothing else. The delay is bounded
    * and small - the point is to be reliably slower than a click, not to test a timeout. */
  private def delayListLibraryItems(delayMs: Int): Unit =
    context.addInitScript(
      s"""(() => {
         |  const marker = 'LibraryService/ListLibraryItems';
         |  const openOrig = XMLHttpRequest.prototype.open;
         |  const sendOrig = XMLHttpRequest.prototype.send;
         |  XMLHttpRequest.prototype.open = function (method, url) {
         |    this.__delayUrl = String(url);
         |    return openOrig.apply(this, arguments);
         |  };
         |  XMLHttpRequest.prototype.send = function () {
         |    const args = arguments;
         |    if (this.__delayUrl && this.__delayUrl.indexOf(marker) !== -1) {
         |      window.__delayedListLibraryItems = (window.__delayedListLibraryItems || 0) + 1;
         |      setTimeout(() => sendOrig.apply(this, args), $delayMs);
         |      return;
         |    }
         |    return sendOrig.apply(this, args);
         |  };
         |})();""".stripMargin
    )

  // The regression for the Notes panel's readiness precondition. Until it was fixed, `createNote`
  // asked `createFirstNoteButton.isVisible` - a question with no wait attached - while the panel was
  // still rendering "Loading...". Neither button exists then, so the answer was `false`, the else
  // branch clicked `lib-new-note`, and that button can never appear on a topic with no notes: the
  // test burned its whole timeout and failed on an app that was working perfectly.
  //
  // Nothing pinned that, because ordinary tests never delay `ListLibraryItems` and the panel settles
  // in milliseconds on a local stack - the flake needed a slow or loaded machine to appear at all.
  test("LIB-22: a note can be created while the first ListLibraryItems is still in flight") {
    delayListLibraryItems(3000)
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openNotesTab()

    // The precondition this test exists for: the panel really is in its unsettled state, with
    // NEITHER button on screen. Asserted rather than assumed - if the delay ever stopped taking
    // effect the test below would still pass, and would silently stop covering anything.
    assert(!lib.createFirstNoteButton.isVisible, "the panel had already settled - the response delay did not take effect")
    assert(!lib.newNoteButton.isVisible, "the panel had already settled - the response delay did not take effect")

    lib.createNote()
    assertThat(lib.noteTab("Note 1")).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(20000))

    // ... and the delay applied to the real request, not to some other call that happened to match.
    val delayed = page.evaluate("() => window.__delayedListLibraryItems || 0").asInstanceOf[Number].intValue
    assert(delayed > 0, "no ListLibraryItems request was delayed")
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
