package routes.tenants._tenant_id.namespaces

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

object NamespacesPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Use namespaces page")(

        test("User can delete tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val deleteTenant = NamespacesPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            page.navigate(s"/tenants/${tenant}/namespaces/")

            deleteTenant.deleteButton.click()

            val isDisabled = deleteTenant.deleteConfirmButton.isDisabled
            deleteTenant.deleteGuardInput.fill(tenant)

            val unDisabled = !deleteTenant.deleteConfirmButton.isDisabled
            deleteTenant.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.tenants.getTenantInfo(tenant)
                    false
                } catch {
                    case err => true
                }

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

//          TODO ADD TEST FOR FORCE DELETE WHEN WILL BE POSSIBLE CHANGE CLUSTER

            assertTrue(isDeleted == true) &&
                assertTrue(isDisabled == true) &&
                assertTrue(unDisabled == true)
        },

    )
}
