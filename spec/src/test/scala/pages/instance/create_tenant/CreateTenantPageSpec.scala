package pages.instance.create_tenant

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*
import scala.jdk.CollectionConverters.*
import _root_.pages.instance.InstancePage
import _root_.pages.instance.create_tenant.CreateTenantPage
import _root_.test_env.pulsarStandaloneEnv
import net.datafaker.Faker

val faker = new Faker();

object CreateTenantPageSpec extends ZIOSpecDefault:
    def spec: Spec[Any, Any] = suite("Create tenant page")(
        test("User can create tenant") {
            val page = pulsarStandaloneEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            createTenantPage.setTenantName(tenantToCreate)

            val adminRoles = List.range(0, 10).map(i => s"${faker.company.profession}-${i}")
            adminRoles.foreach(role => createTenantPage.addAdminRole(role))

            createTenantPage.create()

            val adminClient = pulsarStandaloneEnv.createPulsarAdminClient()
            val tenants = adminClient.tenants.getTenants.asScala
            val createdTenant = adminClient.tenants.getTenantInfo(tenantToCreate)

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(tenants.contains(tenantToCreate)) &&
                assertTrue(createdTenant.getAdminRoles.asScala.toSet == adminRoles.toSet)
            // TODO - test allowed clusters input
        }
    )
