package routes.tenants._tenant_id.namespaces._namespace_id.topics.permissions

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

object PermissionsPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Use can change permissions")(

        test("User can revoke permissions") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val permissionsPage = PermissionsPage(page.locator("body"))

            val permission = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.namespaces.grantPermissionOnNamespace(s"${tenant}/${namespace}", permission, Set().asJava)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/permissions/")

            permissionsPage.revokeButton.click()
            permissionsPage.revokeConfirmButton.click()

            page.waitForTimeout(1000)

            val isRevoked = adminClient.namespaces.getPermissions(s"${tenant}/${namespace}").get(permission)

            assertTrue(isRevoked == null)
        },

    )
}
