package features.library

import com.microsoft.playwright.{Locator, Page}
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** Component object for the Library sidebar (mounted in the RightPanel of resource overview pages). */
final case class LibrarySidebar(page: Page):
  // Outer tabs
  val libraryTab: Locator               = page.getByTestId("lib-tab-library")
  val notesTab: Locator                 = page.getByTestId("lib-tab-notes")
  // Library sub-tabs
  val consumerSessionsSubtab: Locator   = page.getByTestId("lib-subtab-consumer-sessions")
  val allItemsSubtab: Locator           = page.getByTestId("lib-subtab-all-items")
  // Consumer Sessions sub-tab
  val newConsumerSessionButton: Locator = page.getByTestId("lib-new-consumer-session")
  // Notes
  val createFirstNoteButton: Locator    = page.getByTestId("lib-create-first-note")
  val newNoteButton: Locator            = page.getByTestId("lib-new-note")
  val noteTabs: Locator                 = page.getByTestId("lib-note-tab")

  def openLibraryTab(): Unit = libraryTab.click()
  def openNotesTab(): Unit   = notesTab.click()
  def openConsumerSessionsSubtab(): Unit = consumerSessionsSubtab.click()
  def openAllItemsSubtab(): Unit         = allItemsSubtab.click()

  /** From the Notes tab: create a note (first-note button when empty, else the "+" new-note button). */
  def createNote(): Unit =
    if createFirstNoteButton.isVisible then createFirstNoteButton.click()
    else newNoteButton.click()

  /** A note tab addressed by its visible title. */
  def noteTab(name: String): Locator =
    noteTabs.filter(new Locator.FilterOptions().setHasText(name))

  // ----- All Items sub-tab -----

  /** A managed-type row (itemType = the kebab enum, e.g. "message-filter", "consumer-session-config"). */
  def typeRow(itemType: String): Locator = page.getByTestId(s"lib-type-row-$itemType")

  /** Wait until a type row's count has actually LOADED (`data-loaded=true`) - the UI collapses an
    * undefined/errored count to 0, so a bare `hasCount(0)` could otherwise pass before the fetch. */
  def awaitTypeLoaded(itemType: String, timeoutMs: Double = 15000): Unit =
    assertThat(page.locator(s"[data-testid=lib-type-row-$itemType][data-loaded=true]"))
      .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(timeoutMs))

  /** The "N found" element inside a type row: hasCount(0) when the type has none (NoData "-"). */
  def typeFound(itemType: String): Locator = typeRow(itemType).getByTestId("lib-item-count")

  // ----- "Search in Contexts" (All Items sub-tab) -----
  val addContextButton: Locator       = page.getByTestId("lib-add-context")
  val matcherCategorySelects: Locator = page.getByTestId("lib-matcher-category")
  val matcherNamespaceInputs: Locator = page.getByTestId("lib-matcher-namespace")

  def addSearchContext(): Unit = addContextButton.click()

  /** Full create flow via the row "Create" button -> Save dialog -> name dialog. Waits for the dialog to close. */
  def createItemNamed(itemType: String, name: String): Unit =
    openAllItemsSubtab()
    typeRow(itemType).getByTestId("lib-create-item").click()
    val dlg = LibrarySaveDialog(page)
    dlg.saveButton.click()          // "Create" with an empty name -> opens the Set-Name dialog
    dlg.nameInput.fill(name)
    dlg.nameConfirm.click()          // sets the name and saves; both dialogs close
    assertThat(dlg.saveButton).hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(15000))

  /** Open the Browse dialog for a type by clicking its "N found" (requires count >= 1). */
  def browseType(itemType: String): LibraryBrowser =
    openAllItemsSubtab()
    typeFound(itemType).click()
    LibraryBrowser(page)
