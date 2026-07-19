package features.library

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

class LibraryCrudSpec extends DekafSuite:

  private def overviewUrl(t: String, ns: String, topic: String): String =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview"

  private def openTopicOverview(): (String, String, String) =
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(overviewUrl(t, ns, topic))
    (t, ns, topic)

  test("LIB-8: create a consumer-session-config via the Save dialog persists (P0)") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("consumer-session-config", "my-saved-session")
    // reload -> the LibraryService re-fetch reports it under this topic scope
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("consumer-session-config")).containsText("1")
  }

  test("LIB-12: deleting a library item removes it (P0)") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "to-delete")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    assertThat(browser.result("to-delete")).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(10000))
    browser.deleteItem("to-delete")
    assertThat(browser.result("to-delete")).hasCount(0)
    // reload -> gone from the source of truth (no "N found" for the type)
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("message-filter")).hasCount(0)
  }

  test("LIB-13: creating with an empty name is intercepted (nothing is created)") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    lib.typeRow("message-filter").getByTestId("lib-create-item").click()
    val dlg = LibrarySaveDialog(page)
    dlg.saveButton.click()                      // "Create" with the default empty name
    assertThat(dlg.nameInput).isVisible()        // name is intercepted by the Set-Name dialog
    assertThat(dlg.nameConfirm).isDisabled()     // Confirm blocked while the name is empty (the intercept)
    // Reload to abandon the stacked dialogs and confirm nothing was persisted.
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("message-filter")).hasCount(0)   // never created
  }

  test("LIB-9: editing renames a library item") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "old-name")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    browser.editItem("old-name")                       // opens the Save dialog for the existing item
    val dlg = LibrarySaveDialog(page)
    page.getByTestId("lib-item-rename").click()         // in-editor rename -> Set-Name dialog
    dlg.nameInput.fill("new-name")
    dlg.nameConfirm.click()
    dlg.saveButton.click()                              // "Save"
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser2 = lib.browseType("message-filter")
    assertThat(browser2.result("new-name")).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(10000))
    assertThat(browser2.result("old-name")).hasCount(0)
  }

  test("LIB-10: Save as New clones the item under a new id/name") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "original")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    lib.browseType("message-filter").editItem("original")
    LibrarySaveDialog(page).saveAsNew("cloned")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    assertThat(browser.result("original")).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(10000))
    assertThat(browser.result("cloned")).hasCount(1)
  }

  test("LIB-11: Overwrite Another saves the current item under a target id") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "source")
    lib.createItemNamed("message-filter", "target")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    lib.browseType("message-filter").editItem("source")
    LibrarySaveDialog(page).overwriteAnotherButton.click()
    val ow = LibraryOverwriteDialog(page)
    ow.select("target")                                 // choose the item to overwrite
    ow.overwriteButton.click()
    // "source"'s content is now stored under target's id -> two items carry the "source" name, "target" is gone
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    assertThat(browser.result("source")).hasCount(2, new LocatorAssertions.HasCountOptions().setTimeout(10000))
    assertThat(browser.result("target")).hasCount(0)
  }
