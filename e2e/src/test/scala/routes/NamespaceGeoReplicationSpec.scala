package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

/** Geo Replication was previously untestable on the single-cluster dev stack (the add control hides
  * when the namespace already replicates to every available cluster). The multi-cluster fixture
  * (`createCluster` registers a second cluster's metadata) unblocks it: the tab now offers the peer,
  * and the write is verified through PulsarAdmin. */
class NamespaceGeoReplicationSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def saveButton =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))

  test("NS-18: Geo Replication adds a second cluster to the namespace's replication set") {
    val cluster2 = fixtures.createCluster()
    val tenant = fixtures.createTenant(cluster2) // tenant must allow both clusters
    val ns = fixtures.createNamespace(tenant)
    val fqn = s"$tenant/$ns"

    page.navigate(s"/tenants/$tenant/namespaces/$ns/details?category=geo-replication")

    val select = page.getByTestId("replication-cluster-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel(cluster2))
    page.getByTestId("replication-clusters-add").click()
    saveButton.click()

    eventually() {
      val clusters = admin.namespaces().getNamespaceReplicationClusters(fqn).asScala.toSet
      assert(clusters.contains(cluster2) && clusters.contains(fixtures.firstCluster),
        s"replication clusters were: $clusters")
    }
  }
