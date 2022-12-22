package routes.tenants._tenant_id.namespaces

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.ResourceGroup
import net.datafaker.Faker

val faker = new Faker();

object NamespacesPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Edit Resource Group page")(
        test("User can delete tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()

            val testResourceGroupName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            adminClient.resourcegroups.createResourceGroup(testResourceGroupName, new ResourceGroup())
            val isTestResourceGroupCreated = adminClient.resourcegroups.getResourceGroups.asScala.contains(testResourceGroupName)

            page.navigate(s"/instance/resource-groups/edit/${testResourceGroupName}")
            val editResourceGroupPage = NamespacesPage(page.locator("body"))

            editResourceGroupPage.deleteButton.click()
            page.waitForTimeout(1000)
            val isTestResourceGroupDeleted = !adminClient.resourcegroups.getResourceGroups.asScala.contains(testResourceGroupName)

            page.waitForURL("/instance/resource-groups", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isTestResourceGroupCreated) && assertTrue(isTestResourceGroupDeleted)
        },

        test("User can delete properties") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val deleteProperty = Properties(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val key = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val value = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val config = TenantInfo.builder
            config.adminRoles(Set("Admin").asJava)

            val cluster = adminClient.clusters().getClusters.get(0)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.namespaces.setProperty(s"${tenant}/${namespace}", key, value)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/policies")
            val createdKey = deleteProperty.existingKey(key).innerText()
            val createdValue = deleteProperty.existingValue(value).innerText()

            deleteProperty.deleteButton(key).click()
            deleteProperty.saveButton.click()

            page.waitForTimeout(1000)
            val isDeleted = adminClient.namespaces.getProperty(s"${tenant}/${namespace}", key)

            assertTrue(createdKey == "") &&
                assertTrue(createdValue == "") &&
                assertTrue(isDeleted == null)
        },

    )
}
