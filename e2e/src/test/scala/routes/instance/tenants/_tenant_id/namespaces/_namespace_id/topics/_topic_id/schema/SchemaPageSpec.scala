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
import routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.schema.{SchemaEditorSourceSelectTypes, SchemaPage}
import zio.test.TestFailure.fail

import scala.collection.mutable.ListBuffer

val faker = new Faker()

object SchemaPageSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    given ExecutionContext = ExecutionContext.global

    //TODO - maybe(?) add tests for different schema types, topic types and namespace types
    def spec: Spec[Any, Any] = suite("Topic schema page")(
        suite("Complex types") (
            testAvroLikeSchemaType("AVRO"),
            testAvroLikeSchemaType("JSON"),
            testAvroLikeSchemaType("PROTOBUF"),
            test("Should create and delete PROTOBUF_NATIVE schema") {
                val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                val page = testEnv.createNewPage()
                val adminClient = TestEnv.createPulsarAdminClient
                val schemaPage = SchemaPage(page.locator("body"))

                val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}-${faker.lorem.word()}"
                val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
                val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
                val topicFqn = s"persistent://$tenant/$namespace/$topicBaseName"

                val config = TenantInfo.builder
                val cluster = adminClient.clusters().getClusters.get(0)

                config.adminRoles(Set("Admin").asJava)
                config.allowedClusters(Set(cluster).asJava)

                adminClient.tenants.createTenant(tenant, config.build)

                specTenantList += tenant

                adminClient.namespaces.createNamespace(s"$tenant/$namespace")
                adminClient.topics.createNonPartitionedTopic(topicFqn)

                val schema: String = "syntax = \"proto3\";\n\nmessage ExampleSchema {\n  string name = 1;\n  int32 age = 2;\n  bool items = 3;\n}"

                page.navigate(s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topicBaseName/schema")

                schemaPage.newSchemaButton.click()
                schemaPage.schemaTypeSelect.selectOption("PROTOBUF_NATIVE")

                page.waitForTimeout(1000)

                schemaPage.clearSchemaEditorInput()
                schemaPage.setSchemaEditorInput(schema)
                schemaPage.protobufEditorInputUploadButton.click()

                assertTrue(schemaPage.schemaCompatibility.textContent() == "Compatible")
                schemaPage.createSchemaButton.click()

                val isNewSchemaHasCorrectType = schemaPage.schemaListItemType(schemaPage.schemasList.head) == "PROTOBUF_NATIVE"

                assertTrue(isNewSchemaHasCorrectType)

                schemaPage.deleteButton.click()
                schemaPage.deleteGuardInput.fill(topicFqn)
                schemaPage.deleteConfirmButton.click()

                page.waitForTimeout(1000)

                schemaPage.sourceSelect.selectOption(SchemaEditorSourceSelectTypes.FILE.toString)
                schemaPage.setSchemaFile("schema/protobuf_native/example-proto-1.proto")

                assertTrue(schemaPage.schemaCompatibility.textContent() == "Compatible")
                schemaPage.createSchemaButton.click()

                schemaPage.deleteButton.click()
                schemaPage.deleteGuardInput.fill(topicFqn)
                schemaPage.deleteConfirmButton.click()

                page.waitForTimeout(1000)

                // XXX - as of now there is no way to test
                // uploading of the whole directory as Playwright does not support it yet

                assertTrue(schemaPage.isSchemaListEmpty)
            },
        ),
        suite("Primitive types") (
            testPrimitiveOrDateSchemaType("BYTES"),
            testPrimitiveOrDateSchemaType("BOOLEAN"),
            testPrimitiveOrDateSchemaType("STRING"),
            testPrimitiveOrDateSchemaType("INT8"),
            testPrimitiveOrDateSchemaType("INT16"),
            testPrimitiveOrDateSchemaType("INT32"),
            testPrimitiveOrDateSchemaType("INT64"),
            testPrimitiveOrDateSchemaType("FLOAT"),
            testPrimitiveOrDateSchemaType("DOUBLE"),
        ),
        suite("Data time") (
            testPrimitiveOrDateSchemaType("INSTANT"),
            testPrimitiveOrDateSchemaType("DATE"),
            testPrimitiveOrDateSchemaType("TIME"),
            testPrimitiveOrDateSchemaType("LOCAL_DATE"),
            testPrimitiveOrDateSchemaType("LOCAL_TIME"),
            testPrimitiveOrDateSchemaType("LOCAL_DATE_TIME")
        )
    ) @@ flaky(3) @@ parallelN(10) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )

    def testPrimitiveOrDateSchemaType(schemaType: String): Spec[Any, Any] =
        test(s"Should create and delete $schemaType schema") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val schemaPage = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}-${faker.lorem.word()}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicFqn = s"persistent://$tenant/$namespace/$topicBaseName"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"$tenant/$namespace")
            adminClient.topics.createNonPartitionedTopic(topicFqn)

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topicBaseName/schema")

            val schemaName = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            schemaPage.newSchemaButton.click()
            schemaPage.schemaTypeSelect.selectOption(schemaType)
            val isSchemaCompatible = schemaPage.schemaCompatibility.textContent() == "Compatible"
            schemaPage.createSchemaButton.click()

            page.waitForTimeout(1000)

            val isSchemaListHasOneNewSchema = schemaPage.schemasList.size == 1
            val isNewSchemaHasCorrectType = schemaPage.schemaListItemType(schemaPage.schemasList.head) == schemaType

            schemaPage.deleteButton.click()
            schemaPage.deleteGuardInput.fill(topicFqn)
            schemaPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            assertTrue(schemaPage.isSchemaListEmpty) &&
                assertTrue(isSchemaCompatible) &&
                assertTrue(isSchemaListHasOneNewSchema)
        }

    def testAvroLikeSchemaType(schemaType: String): Spec[Any, Any] =
        test(s"Should create and delete $schemaType schemas") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val schemaPage = SchemaPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}-${faker.lorem.word()}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicFqn = s"persistent://$tenant/$namespace/$topicBaseName"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"$tenant/$namespace")
            adminClient.topics.createNonPartitionedTopic(topicFqn)

            val schema: String = "{\"type\":\"record\",\"name\":\"example\",\"namespace\":\"com.example\",\"fields\":[{\"name\":\"aut\",\"type\":\"string\"},{\"name\":\"quia\",\"type\":\"string\"},{\"name\":\"sunt\",\"type\":\"string\"},{\"name\":\"voluptatibus\",\"type\":\"string\"},{\"name\":\"libero\",\"type\":\"string\"},{\"name\":\"tempora\",\"type\":\"string\"},{\"name\":\"debitis\",\"type\":\"string\"}]}"

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topicBaseName/schema")

            schemaPage.newSchemaButton.click()
            schemaPage.schemaTypeSelect.selectOption(schemaType)

            page.waitForTimeout(500)

            schemaPage.clearSchemaEditorInput()
            schemaPage.setSchemaEditorInput(schema)

            assertTrue(schemaPage.schemaCompatibility.textContent() == "Compatible")
            schemaPage.createSchemaButton.click()

            val isNewSchemaHasCorrectType = schemaPage.schemaListItemType(schemaPage.schemasList.head) == schemaType

            assertTrue(isNewSchemaHasCorrectType)

            schemaPage.deleteButton.click()
            schemaPage.deleteGuardInput.fill(topicFqn)
            schemaPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            schemaPage.sourceSelect.selectOption(SchemaEditorSourceSelectTypes.FILE.toString)
            schemaPage.setSchemaFile("schema/example-avro-schema.avsc")

            assertTrue(schemaPage.schemaCompatibility.textContent() == "Compatible")
            schemaPage.createSchemaButton.click()

            schemaPage.deleteButton.click()
            schemaPage.deleteGuardInput.fill(topicFqn)
            schemaPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            assertTrue(schemaPage.isSchemaListEmpty)
        }
