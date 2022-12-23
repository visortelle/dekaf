package routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import net.datafaker.Faker

val faker = new Faker();

object SchemaPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Use schema topic")(

        test("User can delete json schema") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val deleteSchema = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topic = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(s"${tenant}/${namespace}/${topic}")

            val schemaName =  s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val schema1 = "{\"type\":\"record\",\"name\":\"User1\",\"namespace\":\"com.foo\",\"fields\":[{\"name\":\"file1\",\"type\":\"string\"}]}"
            val schema2 = "{\"type\":\"record\",\"name\":\"User2\",\"namespace\":\"com.foo\",\"fields\":[{\"name\":\"file1\",\"type\":\"string\"}]}"
            val schema3 = "{\"type\":\"record\",\"name\":\"User3\",\"namespace\":\"com.foo\",\"fields\":[{\"name\":\"file1\",\"type\":\"string\"}]}"
            val schema4 = "{\"type\":\"record\",\"name\":\"User4\",\"namespace\":\"com.foo\",\"fields\":[{\"name\":\"file1\",\"type\":\"string\"}]}"
            val schema5 = "{\"type\":\"record\",\"name\":\"User5\",\"namespace\":\"com.foo\",\"fields\":[{\"name\":\"file1\",\"type\":\"string\"}]}"

            val convertedSchema = (schema: String) =>
                schema.split("").map(symbol => symbol.getBytes).flatten

            val createSchemaInfo = (schema: String) =>
                SchemaInfo.builder
                    .name(schemaName)
                    .`type`(SchemaType.AVRO)
                    .properties(Map().asJava)
                    .schema(convertedSchema(schema))
                    .build()

            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", createSchemaInfo(schema1))
            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", createSchemaInfo(schema2))
            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", createSchemaInfo(schema3))
            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", createSchemaInfo(schema4))
            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", createSchemaInfo(schema5))

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topic}/schema")

            deleteSchema.deleteButton.click()
            deleteSchema.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.schemas.getSchemaInfo(schemaName)
                    false
                } catch {
                    case err => true
                }

            assertTrue(isDeleted == true)
        },

        test("User can delete common schema") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val deleteSchema = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topic = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(s"${tenant}/${namespace}/${topic}")

            val schemaName = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val schemaInfo = SchemaInfo.builder
                .name(schemaName)
                .`type`(SchemaType.INT32)
                .build()

            adminClient.schemas.createSchema(s"${tenant}/${namespace}/${topic}", schemaInfo)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topic}/schema")

            deleteSchema.deleteButton.click()
            deleteSchema.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.schemas.getSchemaInfo(schemaName)
                    false
                } catch {
                    case err => true
                }

            assertTrue(isDeleted == true)
        },
    )
}
