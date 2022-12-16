package routes.instance.create_tenant

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker
import routes.InstancePage

val faker = new Faker();

object CreateTenantPageSpec extends ZIOSpecDefault:
    def spec: Spec[Any, Any] = suite("Create tenant page")(
        test("User can create tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            createTenantPage.setTenantName(tenantToCreate)

            val adminRoles = List.range(0, 20).map(i => s"${faker.company.profession}-${i}")
            adminRoles.foreach(role => createTenantPage.addAdminRole(role))

            createTenantPage.create()

            val adminClient = testEnv.createPulsarAdminClient()
            val tenants = adminClient.tenants.getTenants.asScala
            val createdTenant = adminClient.tenants.getTenantInfo(tenantToCreate)

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(tenants.contains(tenantToCreate)) &&
                assertTrue(createdTenant.getAdminRoles.asScala.toSet == adminRoles.toSet)
            // TODO - test allowed clusters input
        }
    )
