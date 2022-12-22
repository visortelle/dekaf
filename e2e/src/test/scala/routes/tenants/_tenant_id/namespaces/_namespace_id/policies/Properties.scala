package routes.tenants._tenant_id.namespaces._namespace_id.policies

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.TenantInfo

val faker = new Faker();

object PropertiesTest extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Edit namespace properties")(
        test("User can create properties") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val createProperty = Properties(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            config.adminRoles(Set("Admin").asJava)

            val cluster = adminClient.clusters().getClusters.get(0)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/policies")

            val key = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val value = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            createProperty.newKey.fill(key)
            createProperty.newValue.fill(value)

            createProperty.addButton.click()
            createProperty.saveButton.click()

            val createdKey = createProperty.existingKey(key).innerText()
            val createdValue = createProperty.existingValue(value).innerText()

            page.waitForTimeout(1000)
            val savedPropertyValue = adminClient.namespaces.getProperty(s"${tenant}/${namespace}", key)

            assertTrue(createdKey == key) &&
                assertTrue(createdValue == value)
                assertTrue(savedPropertyValue == value)
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
        test ("User can edit properties") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val editProperty = Properties(page.locator("body"))

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

            val newKey = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val newValue = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            editProperty.existingKey(key).fill(newKey)
            editProperty.existingValue(value).fill(newValue)

            editProperty.saveButton.click()

            page.waitForTimeout(1000)
            val isEditedValue = adminClient.namespaces.getProperty(s"${tenant}/${namespace}", newKey)

            assertTrue(isEditedValue == newValue)
        }
    )
}
