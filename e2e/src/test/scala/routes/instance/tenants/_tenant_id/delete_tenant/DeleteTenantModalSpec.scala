package routes.instance.tenants._tenant_id.delete_tenant

import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import routes.tenants._tenant_id.TenantPage
import com.microsoft.playwright.Locator.WaitForOptions
import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import java.util.UUID
import scala.concurrent.duration.{Duration, SECONDS, TimeUnit}
import scala.collection.mutable.ListBuffer
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*

val faker = new Faker()

object DeleteTenantModalSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()
    given ExecutionContext = ExecutionContext.global

    //TODO - add test for delete when will be possible to change cluster
    def spec: Spec[Any, Any] = suite("Delete tenant modal")(
        test("Should soft delete tenant with no namespaces") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val tenantPage = TenantPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/namespaces/")

            tenantPage.deleteButton.click()

            val isTenantDeletionDisabledByGuard = tenantPage.deleteConfirmButton.isDisabled
            tenantPage.deleteGuardInput.fill(tenant)

            val isTenantDeletionEnabledOnGuardProvided = tenantPage.deleteConfirmButton.isEnabled
            tenantPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.tenants.getTenantInfo(tenant)
                    false
                } catch {
                    case _: Exception => true
                }

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
                assertTrue(isTenantDeletionDisabledByGuard) &&
                assertTrue(isTenantDeletionEnabledOnGuardProvided)
        },
        test("Should force delete tenant with no namespaces") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val tenantPage = TenantPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/namespaces/")

            tenantPage.deleteButton.click()

            val isTenantDeletionDisabledByGuard = tenantPage.deleteConfirmButton.isDisabled
            tenantPage.deleteGuardInput.fill(tenant)

            val isTenantDeletionEnabledOnGuardProvided = tenantPage.deleteConfirmButton.isEnabled

            tenantPage.deleteForceButton.click()

            tenantPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.tenants.getTenantInfo(tenant)
                    false
                } catch {
                    case _: Exception => true
                }

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
                assertTrue(isTenantDeletionDisabledByGuard) &&
                assertTrue(isTenantDeletionEnabledOnGuardProvided)
        },
        test("Should force delete tenant with namespaces") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val tenantPage = TenantPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespacesFqns= faker
                .collection(() => s"${tenant}/${faker.name.firstName()}-${java.util.Date().getTime}")
                .len(10, 20)
                .generate()
                .asInstanceOf[java.util.List[String]]
                .asScala
                .toSeq

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            val createNamespacesFuture = Future.sequence(namespacesFqns.map(namespaceFqn =>
                adminClient.namespaces
                    .createNamespaceAsync(namespaceFqn)
                    .asScala
            ))
            Await.result(createNamespacesFuture, Duration(5, SECONDS))

            page.navigate(s"/tenants/${tenant}/namespaces/")

            tenantPage.deleteButton.click()

            val isTenantDeletionDisabledByGuard = tenantPage.deleteConfirmButton.isDisabled
            tenantPage.deleteGuardInput.fill(tenant)

            val isTenantDeletionEnabledOnGuardProvided = tenantPage.deleteConfirmButton.isEnabled

            tenantPage.deleteForceButton.click()

            tenantPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.tenants.getTenantInfo(tenant)
                    false
                } catch {
                    case _: Exception => true
                }

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
                assertTrue(isTenantDeletionDisabledByGuard) &&
                assertTrue(isTenantDeletionEnabledOnGuardProvided)
        },
        test("Should prevent the soft deletion of a tenant with namespaces") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val tenantPage = TenantPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespacesFqns: Seq[String] = faker
                .collection(() => s"${tenant}/${faker.name.firstName()}-${java.util.Date().getTime}")
                .len(10, 20)
                .generate()
                .asInstanceOf[java.util.List[String]]
                .asScala
                .toSeq

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            val createNamespacesFuture = Future.sequence(namespacesFqns.map(namespaceFqn =>
                adminClient.namespaces
                    .createNamespaceAsync(namespaceFqn)
                    .asScala
            ))
            Await.result(createNamespacesFuture, Duration(5, SECONDS))

            page.navigate(s"/tenants/${tenant}/namespaces/")

            tenantPage.deleteButton.click()

            val isTenantDeletionDisabledByGuard = tenantPage.deleteConfirmButton.isDisabled
            tenantPage.deleteGuardInput.fill(tenant)

            val isTenantDeletionEnabledOnGuardProvided = tenantPage.deleteConfirmButton.isEnabled
            tenantPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete tenant")

            errorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))

            assertTrue(errorModal.isVisible)
        }
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
