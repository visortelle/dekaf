package routes.instance.create_tenant

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import com.microsoft.playwright.options.AriaRole
import net.datafaker.Faker
import routes.instance.InstancePage

import scala.collection.mutable.ListBuffer

val faker = new Faker()

object CreateTenantPageSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    def spec: Spec[Any, Any] = suite("Create tenant page")(
        test("Should create tenant") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            specTenantList += tenantToCreate
            createTenantPage.setTenantName(tenantToCreate)

            createTenantPage.create()

            val adminClient = TestEnv.createPulsarAdminClient
            val tenants = adminClient.tenants.getTenants.asScala

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(tenants.contains(tenantToCreate))
        },
        test("Should create tenant with admin roles") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            specTenantList += tenantToCreate
            createTenantPage.setTenantName(tenantToCreate)

            val adminRoles = List.range(0, 20).map(i => s"${faker.company.profession}-${i}")
            adminRoles.foreach(role => createTenantPage.addAdminRole(role))

            createTenantPage.create()

            val adminClient = TestEnv.createPulsarAdminClient
            val tenants = adminClient.tenants.getTenants.asScala
            val createdTenant = adminClient.tenants.getTenantInfo(tenantToCreate)

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(tenants.contains(tenantToCreate)) &&
                assertTrue(createdTenant.getAdminRoles.asScala.toSet == adminRoles.toSet)
        },
        test("Should create tenant with all available allowed clusters") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            specTenantList += tenantToCreate
            createTenantPage.setTenantName(tenantToCreate)

            createTenantPage.clustersSelectListInput.removeNthItem(0)

            List.range(1, createTenantPage.root.getByRole(AriaRole.COMBOBOX).locator("option").count())
                .foreach(i =>
                    createTenantPage.clustersSelectListInput.selectNthCluster(i)

                    if createTenantPage.clustersSelectListInput.addItemButton.isEnabled then
                        createTenantPage.clustersSelectListInput.addItemButton.click()
                )

            createTenantPage.create()

            val adminClient = TestEnv.createPulsarAdminClient
            val tenants = adminClient.tenants.getTenants.asScala
            val createdTenant = adminClient.tenants.getTenantInfo(tenantToCreate)

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(tenants.contains(tenantToCreate))
        },
        test("Should restrict from creating tenant without allowed clusters chosen") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/create-tenant")

            val createTenantPage = CreateTenantPage(page.locator("body"))
            val isCreateButtonDisabledIfNoTenantName = createTenantPage.createButton.isDisabled

            val tenantToCreate = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            specTenantList += tenantToCreate
            createTenantPage.setTenantName(tenantToCreate)

            createTenantPage.clustersSelectListInput.removeNthItem(0)

            page.waitForTimeout(1000)

            assertTrue(isCreateButtonDisabledIfNoTenantName) &&
                assertTrue(createTenantPage.createButton.isDisabled)
        }
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
