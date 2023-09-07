package routes.instance.tenants._tenant_id.namespaces._namespace_id.delete_namespace

import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.TenantInfo
import test_env.TestEnv
import zio.test.{Spec, ZIOSpecDefault, assertTrue, *}
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import routes.tenants._tenant_id.namespaces._namespace_id.topics.NamespacePage
import com.microsoft.playwright.Locator.WaitForOptions
import zio.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import java.util.UUID
import scala.collection.mutable.ListBuffer
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration.{Duration, SECONDS}
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*
import zio.test.TestFailure.fail

val faker = new Faker()

object DeleteNamespaceModalSpec extends ZIOSpecDefault {
    val specTenantList: ListBuffer[String] = ListBuffer()

    given ExecutionContext = ExecutionContext.global

    //TODO - add test for delete when will be possible to change cluster
    def spec: Spec[Any, Any] = suite("Delete namespace modal")(
        test("Should soft delete namespace without topics") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespacePage = NamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics")

            namespacePage.deleteButton.click()

            val isNamespaceDeletionDisabledByGuard = namespacePage.deleteConfirmButton.isDisabled
            namespacePage.deleteGuardInput.fill(namespace)

            val isNamespaceDeletionEnabledOnGuardProvided = namespacePage.deleteConfirmButton.isEnabled

            namespacePage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.namespaces.getNamespaceResourceGroup(s"${tenant}/${namespace}")
                    false
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(s"tenants/${tenant}/namespaces", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
                assertTrue(isNamespaceDeletionDisabledByGuard) &&
                assertTrue(isNamespaceDeletionEnabledOnGuardProvided)
        } @@ flaky,
        test("Should force delete namespace without topics") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespacePage = NamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics")

            namespacePage.deleteButton.click()

            val isNamespaceDeletionDisabledByGuard = namespacePage.deleteConfirmButton.isDisabled
            namespacePage.deleteGuardInput.fill(namespace)

            val isNamespaceDeletionEnabledOnGuardProvided = namespacePage.deleteConfirmButton.isEnabled

            namespacePage.deleteForceButton.click()

            namespacePage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.namespaces.getNamespaceResourceGroup(s"${tenant}/${namespace}")
                    false
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(s"tenants/${tenant}/namespaces", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
              assertTrue(isNamespaceDeletionDisabledByGuard) &&
              assertTrue(isNamespaceDeletionEnabledOnGuardProvided)
        },
        test("Should force delete namespace with topics") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespacePage = NamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val partitionedTopicsNames = faker.collection(
                  () => s"${UUID.randomUUID().toString}",
              )
              .len(5, 400)
              .generate()
              .asInstanceOf[java.util.List[String]]
              .asScala
              .toSeq
            val nonPartitionedTopicsNames = faker.collection(
                  () => s"${UUID.randomUUID().toString}",
              )
              .len(5, 2000)
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

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            val createPartitionedTopicsFuture = Future.sequence(
                partitionedTopicsNames.map { topic =>
                    val topicPersistence = scala.util.Random.nextBoolean() match
                        case true => "persistent"
                        case false => "non-persistent"
                    val partitionsCount = scala.util.Random.nextInt(10) + 2

                    adminClient
                      .topics()
                      .createPartitionedTopicAsync(s"${topicPersistence}://${tenant}/${namespace}/${topic}", partitionsCount)
                      .asScala
                }
            )
            val createNonPartitionedTopicsFuture = Future.sequence(
                nonPartitionedTopicsNames.map { topic =>
                    val topicPersistence = scala.util.Random.nextBoolean() match
                        case true => "persistent"
                        case false => "non-persistent"

                    adminClient
                      .topics()
                      .createNonPartitionedTopicAsync(s"${topicPersistence}://${tenant}/${namespace}/${topic}")
                      .asScala
                }
            )

            val createTopicsFuture = Future.sequence(
                Seq(createPartitionedTopicsFuture, createNonPartitionedTopicsFuture)
            )
              .map(_.flatten)
            try
                Await.result(createTopicsFuture, Duration(30, SECONDS))
            catch
                case _: Exception =>
                    fail("Failed to create topics")


            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics")

            namespacePage.deleteButton.click()

            val isNamespaceDeletionDisabledByGuard = namespacePage.deleteConfirmButton.isDisabled
            namespacePage.deleteGuardInput.fill(namespace)

            val isNamespaceDeletionEnabledOnGuardProvided = namespacePage.deleteConfirmButton.isEnabled

            namespacePage.deleteForceButton.click()

            namespacePage.deleteConfirmButton.click()

            page.waitForTimeout(3000)

            val isDeleted =
                try {
                    !adminClient
                      .namespaces
                      .getNamespaces(s"${tenant}")
                      .asScala
                      .contains(s"${tenant}/${namespace}")
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(s"tenants/${tenant}/namespaces", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isDeleted) &&
              assertTrue(isNamespaceDeletionDisabledByGuard) &&
              assertTrue(isNamespaceDeletionEnabledOnGuardProvided)
        } @@ flaky,
        test("Should prevent from soft delete namespace with topics") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespacePage = NamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val partitionedTopicsNames = faker.collection(
                  () => s"${UUID.randomUUID().toString}",
              )
              .len(5, 40)
              .generate()
              .asInstanceOf[java.util.List[String]]
              .asScala
              .toSeq
            val nonPartitionedTopicsNames = faker.collection(
                  () => s"${UUID.randomUUID().toString}",
              )
              .len(5, 20)
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

            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")

            val createPartitionedTopicsFuture = Future.sequence(
                partitionedTopicsNames.map { topic =>
                    val topicPersistence = scala.util.Random.nextBoolean() match
                        case true => "persistent"
                        case false => "non-persistent"
                    val partitionsCount = scala.util.Random.nextInt(10) + 2

                    adminClient
                      .topics()
                      .createPartitionedTopicAsync(s"${topicPersistence}://${tenant}/${namespace}/${topic}", partitionsCount)
                      .asScala
                }
            )
            val createNonPartitionedTopicsFuture = Future.sequence(
                nonPartitionedTopicsNames.map { topic =>
                    val topicPersistence = scala.util.Random.nextBoolean() match
                        case true => "persistent"
                        case false => "non-persistent"

                    adminClient
                      .topics()
                      .createNonPartitionedTopicAsync(s"${topicPersistence}://${tenant}/${namespace}/${topic}")
                      .asScala
                }
            )

            val createTopicsFuture = Future.sequence(
                  Seq(createPartitionedTopicsFuture, createNonPartitionedTopicsFuture)
              )
              .map(_.flatten)
            try
                Await.result(createTopicsFuture, Duration(30, SECONDS))
            catch
                case _: Exception =>
                    fail("Failed to create topics")


            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics")

            namespacePage.deleteButton.click()

            val isNamespaceDeletionDisabledByGuard = namespacePage.deleteConfirmButton.isDisabled
            namespacePage.deleteGuardInput.fill(namespace)

            val isNamespaceDeletionEnabledOnGuardProvided = namespacePage.deleteConfirmButton.isEnabled

            namespacePage.deleteConfirmButton.click()

            val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete namespace")

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
}
