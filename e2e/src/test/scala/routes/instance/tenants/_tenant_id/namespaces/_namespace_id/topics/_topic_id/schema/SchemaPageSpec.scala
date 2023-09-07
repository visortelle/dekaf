package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv

import scala.concurrent.duration.{Duration, SECONDS, TimeUnit}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}
import net.datafaker.Faker
import routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema.SchemaPage
import zio.test.TestFailure.fail

import scala.collection.mutable.ListBuffer

val faker = new Faker()

object SchemaPageSpec extends ZIOSpecDefault {
    val specTenantList: ListBuffer[String] = ListBuffer()

    given ExecutionContext = ExecutionContext.global

    //TODO - add tests for different schema types, topic types and namespace types
    def spec: Spec[Any, Any] = suite("Topic schema page")(

        test("Should create and delete AVRO schemas for non-partitioned topic") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val schemaPage = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(topicFqn)

            val schemaName =  s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val schemas = faker.collection(
                  () => "{" +
                    "\"type\":\"record\"," +
                    s"\"name\":\"${faker.name().username()}\"," +
                    s"\"namespace\":\"${faker.internet().domainSuffix()}.${faker.internet().domainWord()}\"," +
                    s"\"fields\":[{\"name\":\"${faker.name().firstName()}${java.util.Date().getTime}\",\"type\":\"string\"}]" +
                    "}"
              )
              .len(10, 20)
              .generate()
              .asInstanceOf[java.util.List[String]]
              .asScala
              .toSeq

            def convertedSchema = (schema: String) =>
                schema.split("").flatMap(symbol => symbol.getBytes)

            def createSchemaInfo = (schema: String) =>
                SchemaInfo.builder
                    .name(schemaName)
                    .`type`(SchemaType.AVRO)
                    .properties(Map().asJava)
                    .schema(convertedSchema(schema))
                    .build()

            val createSchemasFuture = Future.sequence(
                schemas.map(x =>
                    adminClient
                      .schemas
                      .createSchemaAsync(topicFqn, createSchemaInfo(x))
                      .asScala
                )
            )
            try
                Await.result(createSchemasFuture, Duration(30, SECONDS))
            catch
                case e: Exception =>
                    fail(s"Failed to create schemas: ${e.getMessage}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/schema")

            schemaPage.deleteButton.click()
            schemaPage.deleteGuardInput.fill(topicFqn)
            schemaPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.schemas.getSchemaInfo(schemaName)
                    false
                } catch {
                    case _: Exception => true
                }

            assertTrue(isDeleted)
        },
        test("Should create and delete INT32 schema for non-partitioned topic") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val schemaPage = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(topicFqn)

            val schemaName = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val schemaInfo = SchemaInfo.builder
                .name(schemaName)
                .`type`(SchemaType.INT32)
                .build()

            adminClient.schemas.createSchema(topicFqn, schemaInfo)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/schema")

            schemaPage.deleteButton.click()
            schemaPage.deleteGuardInput.fill(topicFqn)
            schemaPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.schemas.getSchemaInfo(schemaName)
                    false
                } catch {
                    case _: Exception => true
                }

            assertTrue(isDeleted)
        },
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
}
