package routes

import harness.DekafSuite
import com.microsoft.playwright.Page
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import com.microsoft.playwright.Page.{GetByRoleOptions, GetByTextOptions}
import org.apache.pulsar.client.api.MessageId

/** Render-smoke for read-only views that were previously uncovered. They carry no mutation, so a
  * defect surfaces as a blank page / crashed ErrorBoundary rather than a wrong value - assert the
  * view's stable anchor renders (heading / known label / testId), no 404, no blank. */
class StatsRenderSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def heading(name: String) =
    page.getByRole(AriaRole.HEADING, new GetByRoleOptions().setName(name).setExact(true))
  private def exactText(s: String) = page.getByText(s, new GetByTextOptions().setExact(true))

  test("INS-9: instance overview renders the Clusters section with cluster detail") {
    page.navigate("/overview")
    assertThat(heading("Clusters")).isVisible(vis(15000))
    // "Cluster Name" only renders once the cluster row's data actually loaded (Cluster returns null
    // until then), and the value shown must be the broker's real cluster name per the admin oracle.
    assertThat(page.getByText("Cluster Name").first()).isVisible(vis(10000))
    assertThat(exactText(fixtures.firstCluster).first()).isVisible(vis(10000))
  }

  test("INS-10: instance overview renders the Internal Broker Configuration table") {
    page.navigate("/overview")
    assertThat(heading("Internal Broker Configuration")).isVisible(vis(15000))
  }

  test("TOP-11: topic Statistics tab renders topic stats") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    exactText("Statistics").first().click()
    // Stats-panel-ONLY labels - "Producers"/"Subscriptions" also exist as toolbar nav buttons on
    // every topic route, so they can't prove the panel rendered.
    assertThat(exactText("Msg Rate In").first()).isVisible(vis(15000))
    assertThat(exactText("Storage Size").first()).isVisible(vis(10000))
  }

  test("TOP-12: topic Internal Statistics tab renders the managed-ledger stats") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    admin.topics().createSubscription(fqn, fixtures.unique("sub"), MessageId.earliest)
    fixtures.produceStrings(fqn, 3)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    exactText("Internal Statistics").first().click()
    assertThat(heading("Managed Ledger Internal Stats")).isVisible(vis(15000))
    assertThat(heading("Ledgers")).isVisible(vis(10000))
    assertThat(heading("Cursors")).isVisible(vis(10000))
  }

  test("SUB-7: subscription overview renders the Statistics section") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview")
    // the subscription must render and its Statistics panel with it (a stat row that is always present)
    assertThat(page.getByText(sub).first()).isVisible(vis(15000))
    assertThat(page.getByText("Msg Rate Out").first()).isVisible(vis(10000))
  }
