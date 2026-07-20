package knownbugs

import harness.DekafSuite
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.GetByRoleOptions
import org.apache.pulsar.common.policies.data.AuthAction
import org.apache.pulsar.client.api.MessageId
import java.util.EnumSet
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

/** Regression tests for formerly-known bugs (all fixed 2026-07-19 - see e2e/README.md §6). They keep
  * their BUG-N ids for traceability and now run in the ordinary green lane. */
class MoreKnownBugsSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  test("BUG-14: no stray console.log('overlay', …) is emitted on render") {
    // FIXED: HealthCheckContext.tsx - the render-path console.log was removed.
    val msgs = java.util.Collections.synchronizedList(new java.util.ArrayList[String]())
    page.onConsoleMessage(m => msgs.add(m.text()))
    page.navigate("/overview")
    page.waitForTimeout(2500)
    val overlayLogs = msgs.asScala.filter(_.toLowerCase.contains("overlay")).toList
    assert(overlayLogs.isEmpty, s"stray console logs present: $overlayLogs")
  }

  test("BUG-15: Export is disabled while paused with 0 messages") {
    // FIXED: ExportMessagesButton.tsx - disabled is now simply `messages.length === 0`.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Latest message")
    cs.play()
    cs.assertState("running")
    cs.pauseFromToolbar()
    cs.assertState("paused")
    assertThat(cs.exportOpen).isDisabled()
  }

  test("BUG-5: the 'Message Id' column is sortable (asc is the reverse of desc)") {
    // FIXED: ConsumerSession.tsx - messageId (and orderingKey) got sortKey + a byte-order comparator.
    // Assert the comparator actually ORDERS: sort asc, then desc, and require the row order to be
    // exactly reversed. A no-op comparator (returns 0) would leave asc == desc and fail.
    val (t, ns, topic) = fixtures.freshTopicParts()
    // Distinct keys so we can read a stable per-row identity; messageIds are monotonic per message.
    val producer = client.newProducer(org.apache.pulsar.client.api.Schema.STRING)
      .topic(s"persistent://$t/$ns/$topic").create()
    try Seq("k-a", "k-b", "k-c").foreach(k => producer.newMessage().key(k).value(s"v-$k").send())
    finally producer.close()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(3)

    cs.sortBy("messageId"); cs.assertSort("messageId:asc")
    val asc = cs.columnValues("key")
    cs.sortBy("messageId"); cs.assertSort("messageId:desc")
    val desc = cs.columnValues("key")
    assert(asc.toSet == Set("k-a", "k-b", "k-c"), s"unexpected keys: $asc")
    assert(desc == asc.reverse, s"messageId desc is not the reverse of asc (comparator is a no-op?): asc=$asc desc=$desc")
  }

  test("BUG-10: the permission revoke button is row-unique") {
    // FIXED: Permissions.tsx - update/revoke testIds are suffixed with the row's role.
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"
    val role = fixtures.unique("role")
    admin.namespaces().grantPermissionOnNamespace(fqn, role, EnumSet.of(AuthAction.produce))
    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=access-control")
    assertThat(page.getByText(role).first()).isVisible(vis(15000))
    assertThat(page.getByTestId(s"permission-revoke-button-$role")).hasCount(1)
  }

  test("BUG-1: a transport failure on a create form shows an error and does not silently 'succeed'") {
    // FIXED: the discarded-catch pattern (CreateNamespace / CreateTenantPage / CreateSubscription /
    // ResourceGroupForm - RG DeleteDialog shares it) now notifies AND stays on the form. Asserting
    // the error NOTIFICATION is what distinguishes the fix from a silent early return, which would
    // also stay on the page and create nothing - i.e. pass the old (notification-less) assertion.
    def createButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))

    // (label, setup that lands on the form + fills required inputs, RPC to abort, URL fragment to stay on)
    val tenant = fixtures.createTenant()
    val (subT, subNs, subTopic) = fixtures.freshTopicParts()
    val cases: Seq[(String, () => Unit, String, String)] = Seq(
      ("Create Namespace",
        () => { page.navigate(s"/tenants/$tenant/create-namespace"); page.getByTestId("create-namespace-name").fill(fixtures.unique("ns")) },
        ".*NamespaceService/CreateNamespace", "/create-namespace"),
      ("Create Tenant",
        () => { page.navigate("/instance/create-tenant"); page.getByTestId("tenant-name").fill(fixtures.unique("t")) },
        ".*TenantService/CreateTenant", "/create-tenant"),
      ("Create Subscription",
        () => { page.navigate(s"/tenants/$subT/namespaces/$subNs/topics/persistent/$subTopic/create-subscription"); page.getByTestId("create-subscription-name").fill(fixtures.unique("sub")) },
        ".*TopicService/CreateSubscription", "/create-subscription"),
      ("Create Resource Group",
        () => { page.navigate("/instance/resource-groups/create"); page.getByTestId("resource-group-name").fill(fixtures.unique("rg")) },
        ".*BrokersService/CreateResourceGroup", "/resource-groups/create"),
    )

    for (label, setup, abortRpc, stayFragment) <- cases do
      setup()
      val pattern = Pattern.compile(abortRpc)
      page.route(pattern, r => r.abort())
      createButton.click()
      // An error notification must appear (the whole point of the fix).
      assertThat(page.getByText(Pattern.compile("Unable to (create|delete)", Pattern.CASE_INSENSITIVE)).first())
        .isVisible(vis(10000))
      // …and we must NOT have navigated to the never-created resource.
      assert(page.url().contains(stayFragment), s"[$label] navigated away despite the failed create: ${page.url()}")
      page.unroute(pattern)
  }

  test("auto-refresh is ONE global preference shared by all tables (BUG-11 reclassified: by design)") {
    // Owner decision 2026-07-19: auto-refresh is deliberately app-global - "we either want to
    // refresh any table, or not". (BUG-11 originally called the global flag a bug; reclassified.)
    // This pins the intended semantics: flip the toggle on one table -> every table follows.
    fixtures.createTenant()
    val (t, ns, topic) = fixtures.freshTopicParts()

    // Topics table: remember the shared state.
    page.navigate(s"/tenants/$t/namespaces/$ns/topics")
    val topicsToggle = page.getByTestId("table-auto-refresh")
    assertThat(topicsToggle).isVisible(vis(15000))
    val before = topicsToggle.getAttribute("data-checked")

    // Tenants table starts in the SAME shared state; flip it there.
    page.navigate("/tenants")
    val tenantsToggle = page.getByTestId("table-auto-refresh")
    assertThat(tenantsToggle).isVisible(vis(15000))
    assertThat(tenantsToggle).hasAttribute("data-checked", before)
    tenantsToggle.click()
    assertThat(tenantsToggle).not().hasAttribute("data-checked", before)
    val flipped = tenantsToggle.getAttribute("data-checked")

    // The topics table followed: one global preference, not a per-table one.
    page.navigate(s"/tenants/$t/namespaces/$ns/topics")
    assertThat(page.getByTestId("table-auto-refresh")).hasAttribute("data-checked", flipped)
  }

  test("BUG-12: the tree loading text reads 'Navigating to the selected resource'") {
    // FIXED: NavigationTree.tsx - missing 't' typo corrected. The indicator is a sub-second
    // transient during tree navigation (a visibility wait races it), so assert the SERVED BUNDLE:
    // deterministic, and exactly what a copy regression needs.
    page.navigate("/overview")
    val bundle = page.request().get(s"${harness.Config.baseUrl}/ui/static/dist/entrypoint.js").text()
    assert(bundle.contains("Navigating to the selected resource"), "corrected loading text missing from the served bundle")
    assert(!bundle.contains("Navigating o the selected resource"), "the 'Navigating o the' typo is back in the served bundle")
  }

  test("BUG-13: the Subscription page highlights the active toolbar tab") {
    // FIXED: SubscriptionPage.tsx - Overview/Consumers buttons now carry `active` like TopicPage.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview")
    val overviewTab = page.locator("[data-testid=toolbar-button][data-tab='Overview']")
    assertThat(overviewTab).isVisible(vis(15000))
    assertThat(overviewTab).hasAttribute("data-active", "true")
  }

  test("BUG-18: pasting a topic FQN into the tree filter does not duplicate the topic segment") {
    // FIXED: NavigationTree.tsx - partition parsing now uses a fresh non-global regex match; the
    // no-match String.replace passthrough that rewrote every FQN as t/ns/topic/topic is gone.
    page.navigate("/overview")
    val filter = page.getByTestId("nav-tree-filter")
    filter.fill("persistent://public/default/some-topic")
    assertThat(filter).hasValue("public/default/some-topic",
      new com.microsoft.playwright.assertions.LocatorAssertions.HasValueOptions().setTimeout(10000))
  }
  // Note: BUG-2/7 (fixed, Monaco/deep-dialog) are covered by jest component tests, and BUG-8/9/17
  // (fixed, server-side) by server LibraryBugRegressionsTest - not driveable from this e2e harness.
  // See e2e/README.md §6.
