package features.consumersession

import harness.DekafSuite
import features.library.{LibraryBrowser, LibrarySaveDialog}
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** CS-33 - saving a projection to the Library and applying it to a *different* projection.
  * Picking used to do nothing visible: the browse dialog stayed open, and the projection list
  * looked the replaced item up by the id of the newly picked projection, which never matched
  * any row, so the pick was dropped. See #339. */
class CsProjectionLibrarySpec extends DekafSuite:
  private val visible = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)
  private val gone    = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private val applied = new LocatorAssertions.HasValueOptions().setTimeout(20000)

  test("CS-33: a projection picked from the library replaces the projection being edited") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.revealAdvanced()

    val savedLabel  = s"saved-${System.currentTimeMillis}"
    val libraryItem = s"projection-${System.currentTimeMillis}"

    // Each projection has its own library panel, as do the projection list and a
    // projection's target - hence addressing panels by the item type they manage.
    def projectionPanel(i: Int) = cs.sessionProjections.getByTestId("lib-panel-value-projection").nth(i)

    // A projection saved to the library...
    cs.addProjection()
    cs.projectionLabel.nth(0).fill(savedLabel)
    projectionPanel(0).hover()
    projectionPanel(0).getByTestId("lib-save").click()
    val saveDialog = LibrarySaveDialog(page)
    saveDialog.saveButton.click()          // "Create" with an empty name opens the Set-Name dialog
    saveDialog.nameInput.fill(libraryItem)
    saveDialog.nameConfirm.click()
    assertThat(saveDialog.saveButton).hasCount(0, gone)

    // ...and applied to a second, unrelated projection. It carries a different id, which is
    // precisely what the old id-based lookup could not handle.
    cs.addProjection()
    val secondLabel = s"second-${System.currentTimeMillis}"
    cs.projectionLabel.nth(1).fill(secondLabel)

    projectionPanel(1).hover()
    projectionPanel(1).getByTestId("lib-item-count").click()
    val browser = LibraryBrowser(page)
    assertThat(browser.selectButton).isVisible(visible)
    browser.filter(libraryItem)
    browser.result(libraryItem).click()
    browser.selectButton.click()

    // The dialog used to stay open, and the picked projection used to be dropped.
    assertThat(browser.selectButton).hasCount(0, gone)
    assertThat(cs.projectionLabel.nth(1)).hasValue(savedLabel, applied)
    assertThat(cs.projectionLabel.nth(0)).hasValue(savedLabel, applied)
  }
