package routes.instance.tenants._tenant_id.namespaces._namespace_id.permissions

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker
import routes.tenants._tenant_id.namespaces._namespace_id.topics.permissions.PermissionsPage

val faker = new Faker()

object NamespacePermissionsSpec extends ZIOSpecDefault { //TODO
    def spec: Spec[Any, Any] = suite("Namespace permissions page")(

        test("User can revoke permissions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
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
