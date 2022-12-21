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

//            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
//            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val tenant = "my-tenant"
            val namespace = "my-namespace"

//            val config = TenantInfo.builder
//            config.adminRoles(Set("Admin").asJava)
//            config.allowedClusters(Set("Admin").asJava)

//            adminClient.tenants.createTenant(tenant, config.build)
//            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/policies")

            val key = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val value = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            createProperty.newKey.fill(key)
            createProperty.newValue.fill(value)

            createProperty.addButton.click()
            createProperty.saveButton.click()

            val createdKey = createProperty.existingKey(key)
            val createdValue = createProperty.existingValue(value)

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

//            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
//            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val tenant = "my-tenant"
            val namespace = "my-namespace"
            val key = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val value = s"${faker.name.firstName()}-${java.util.Date().getTime}"
//            val config = TenantInfo.builder
//            config.adminRoles(Set("Admin").asJava)
//            config.allowedClusters(Set("Admin").asJava)

//            adminClient.tenants.createTenant(tenant, config.build)
//            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.namespaces.setProperty(s"${tenant}/${namespace}", key, value)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/policies")

            val createdKey = deleteProperty.existingKey(key)
            val createdValue = deleteProperty.existingValue(value)

            deleteProperty.deleteButton(key).click()

//            val deletedKey = deleteProperty.existingKey(key)
            val isDeleted = adminClient.namespaces.getProperty(s"${tenant}/${namespace}", key)

            assertTrue(createdKey == key) &&
                assertTrue(createdValue == value) &&
//                assertTrue(deletedKey == null) &&
                assertTrue(isDeleted == null)
        }
    )
}
