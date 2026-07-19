package features.library

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.SelectOption

class LibraryBrowseSpec extends DekafSuite:

  private def overviewUrl(t: String, ns: String, topic: String): String =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview"

  private def openTopicOverview(): (String, String, String) =
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(overviewUrl(t, ns, topic))
    (t, ns, topic)

  test("LIB-3: Library sub-tab selection survives outer-tab switches") {
    openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    assertThat(lib.newConsumerSessionButton).isVisible()      // consumer-sessions is the default sub-tab
    lib.openAllItemsSubtab()
    assertThat(lib.newConsumerSessionButton).hasCount(0)       // consumer-sessions content unmounted
    lib.openNotesTab()
    lib.openLibraryTab()                                        // leave and return to the Library outer tab
    assertThat(lib.newConsumerSessionButton).hasCount(0)       // All Items sub-tab was preserved
    assertThat(lib.typeRow("message-filter")).isVisible()
  }

  test("LIB-4: All Items lists the 13 managed types, NoData on a fresh context") {
    openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.openAllItemsSubtab()
    assertThat(page.locator("[data-testid^='lib-type-row-']")).hasCount(13)
    assertThat(lib.typeRow("consumer-session-config")).isVisible()
    assertThat(lib.typeRow("deserializer")).isVisible()
    lib.awaitTypeLoaded("message-filter")                      // wait for a real loaded count, not undefined→0
    assertThat(lib.typeFound("message-filter")).hasCount(0)    // fresh scope -> no "N found", NoData shown
  }

  test("LIB-5: the library re-fetches when navigating to a different scope") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "scoped-here")
    page.navigate(overviewUrl(t, ns, topic))
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("message-filter")).containsText("1")   // present in this topic scope
    openTopicOverview()                                             // a different fresh topic
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("message-filter")).hasCount(0)         // re-fetched, out of scope
  }

  test("LIB-19: Browse filters results client-side by name") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "alpha-filter")
    lib.createItemNamed("message-filter", "beta-filter")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    assertThat(browser.results).hasCount(2, new LocatorAssertions.HasCountOptions().setTimeout(10000))
    browser.filter("alpha")
    assertThat(browser.result("alpha-filter")).hasCount(1)
    assertThat(browser.result("beta-filter")).hasCount(0)
  }

  test("LIB-20: Browse sorts results by name ascending/descending") {
    val (t, ns, topic) = openTopicOverview()
    val lib = LibrarySidebar(page)
    lib.openLibraryTab()
    lib.createItemNamed("message-filter", "aaa-first")
    lib.createItemNamed("message-filter", "zzz-last")
    page.navigate(overviewUrl(t, ns, topic)); lib.openLibraryTab()
    val browser = lib.browseType("message-filter")
    browser.sortBy("Name-asc")
    assertThat(browser.results.first()).containsText("aaa-first")
    browser.sortBy("Name-desc")
    assertThat(browser.results.first()).containsText("zzz-last")
  }

  // LIB-6 - cross-category cascade. Faithful to resourceMatchers.scala (strict same-category .test),
  // NOT the plan's "all topics in N" wording: a NamespaceMatcher never matches a TopicMatcher target,
  // so the observable reveal is giving the search a NAMESPACE-category context.
  test("LIB-6: a namespace-scoped item is hidden on a child topic until a namespace search context is added") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")

    // Arrange: create a message-filter scoped to the NAMESPACE (derive-from-context on the namespace overview).
    page.navigate(s"/tenants/$t/namespaces/$ns/overview")
    val libNs = LibrarySidebar(page)
    libNs.openLibraryTab()
    libNs.createItemNamed("message-filter", "ns-scoped")

    // On a CHILD topic the namespace-scoped item is NOT listed by default (topic context != namespace context).
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    val lib = LibrarySidebar(page)
    lib.openLibraryTab(); lib.openAllItemsSubtab()
    assertThat(lib.typeFound("message-filter")).hasCount(0)

    // Add a search context and switch its category to Namespace(s) -> derives this topic's namespace.
    lib.addSearchContext()
    assertThat(lib.matcherCategorySelects).hasCount(2)
    lib.matcherCategorySelects.last().selectOption(new SelectOption().setValue("namespace-matcher"))
    assertThat(lib.matcherNamespaceInputs.last()).hasValue(ns)

    // Revealed: the namespace-scoped item now matches the search.
    assertThat(lib.typeFound("message-filter")).containsText("1")
  }
