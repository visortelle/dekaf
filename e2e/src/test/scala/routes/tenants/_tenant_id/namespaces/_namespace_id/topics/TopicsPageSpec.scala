package routes.tenants._tenant_id.namespaces._namespace_id.topics

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker

val faker = new Faker();

object TopicsPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Use namespaces page")(

        test("User can delete tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val deleteNamespace = TopicsPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics")

            deleteNamespace.deleteButton.click()

            val isDisabled = deleteNamespace.deleteConfirmButton.isDisabled
            deleteNamespace.deleteGuardInput.fill(namespace)

            val unDisabled = !deleteNamespace.deleteConfirmButton.isDisabled
            deleteNamespace.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.namespaces.getNamespaceResourceGroup(s"${tenant}/${namespace}")
                    false
                } catch {
                    case err => true
                }

            page.waitForURL(s"tenants/${tenant}/namespaces", new WaitForURLOptions().setTimeout(3000))

//           TODO ADD TEST FOR FORCE DELETE WHEN WILL BE POSSIBLE CHANGE CLUSTER

            assertTrue(isDeleted == true) &&
                assertTrue(isDisabled == true) &&
                assertTrue(unDisabled == true)
        },

    )
}
