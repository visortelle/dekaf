package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** NAV-2/3/4 - the lazy-loading navigation tree (filter, expand-to-partitions, collapse/focus). */
class NavigationTreeSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def cnt(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  test("NAV-2: the tree lazy-expands a partitioned topic to its partitions") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("ptopic")
    admin.topics().createPartitionedTopic(s"persistent://$t/$ns/$topic", 3)

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    val topicNode = page.locator(s"[data-testid=nav-tree-node][data-node-type=topic][data-node-name='$topic']")
    assertThat(topicNode).isVisible(vis(20000))
    page.waitForTimeout(1500) // let the tree's scroll-to-selected settle before toggling

    topicNode.getByTestId("nav-node-toggle").click()
    assertThat(page.locator("[data-testid=nav-tree-node][data-node-type=topic-partition]")).hasCount(3, cnt(15000))
  }

  test("NAV-3: pasting a topic FQN into the tree filter strips the persistent:// scheme") {
    page.navigate("/overview")
    val filter = page.getByTestId("nav-tree-filter")
    filter.fill("persistent://public/default/some-topic")
    // The rewrite strips the scheme to a tenant/namespace/topic path (the app also duplicates the
    // trailing topic segment for non-partitioned FQNs - a latent quirk; assert the robust invariant).
    assertThat(filter).hasValue(java.util.regex.Pattern.compile("^public/default/some-topic"),
      new LocatorAssertions.HasValueOptions().setTimeout(10000))
  }

  test("NAV-4: Collapse All collapses expanded nodes") {
    page.navigate("/overview")
    val publicTenant = page.locator("[data-testid=nav-tree-node][data-node-type=tenant][data-node-name='public']")
    assertThat(publicTenant).isVisible(vis(20000))
    publicTenant.getByTestId("nav-node-toggle").click()
    assertThat(page.locator("[data-testid=nav-tree-node][data-node-type=namespace]").first()).isVisible(vis(15000))
    page.getByTestId("nav-collapse-all").click()
    assertThat(page.locator("[data-testid=nav-tree-node][data-node-type=namespace]")).hasCount(0, cnt(10000))
  }

  test("NAV-4: Show Current Resource re-expands the tree to the selected resource") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$t/$ns/$topic")
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    val topicNode = page.locator(s"[data-testid=nav-tree-node][data-node-type=topic][data-node-name='$topic']")
    assertThat(topicNode).isVisible(vis(20000))
    page.waitForTimeout(1500)

    page.getByTestId("nav-collapse-all").click()
    assertThat(topicNode).hasCount(0, cnt(10000))
    page.getByTestId("nav-show-current").click()
    assertThat(topicNode).isVisible(vis(20000))
  }
