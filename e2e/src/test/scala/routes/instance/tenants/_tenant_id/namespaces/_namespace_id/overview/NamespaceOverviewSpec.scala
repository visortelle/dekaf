package routes.instance.tenants._tenant_id.namespaces._namespace_id.overview

import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.TenantInfo
import routes.tenants._tenant_id.namespaces._namespace_id.overview.NamespaceOverviewPage
import test_env.TestEnv
import zio.ZIO
import zio.test.TestAspect.{afterAll, failing, flaky, forked, timed, timeout}
import zio.test.{Spec, ZIOSpecDefault, assertTrue}
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import com.microsoft.playwright.Locator.WaitForOptions
import zio.test.TestFailure.fail

import java.util.UUID
import java.util.concurrent.TimeUnit
import scala.jdk.FutureConverters.*
import scala.jdk.CollectionConverters.*
import scala.collection.mutable.ListBuffer
import scala.concurrent.duration.{Duration, SECONDS}
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.util.Random

val faker = new Faker()
object NamespaceOverviewSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    given ExecutionContext = ExecutionContext.global

    def spec: Spec[Any, Any] = suite("Namespace overview page") (
        test("Should display correct namespace fqn") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            val displayedNamespaceFqn = namespaceOverviewPage.namespaceFqn.textContent()

            assertTrue(displayedNamespaceFqn == s"$tenant/$namespace")
        },
        test("Should unload all bundles in every cluster") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            namespaceOverviewPage.clusterTabs.map(clusterTabWrapper =>
                clusterTabWrapper.click()

                namespaceOverviewPage.unloadAllButton.click()
                namespaceOverviewPage.confirmButton.click()

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to unload namespace")
                assertTrue(errorModal.isHidden)
            )

            assertTrue(namespaceOverviewPage.clusterTabs.size == clusters.size)
        },
        test("Should clear whole backlog in every cluster") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            namespaceOverviewPage.clusterTabs.map(clusterTabWrapper =>
                clusterTabWrapper.click()

                namespaceOverviewPage.clearWholeBacklogButton.click()
                namespaceOverviewPage.guardInput.fill("Confirm clearing of namespace backlog")
                namespaceOverviewPage.confirmButton.click()

                val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to clear backlog")
                assertTrue(errorModal.isHidden)
            )

            assertTrue(namespaceOverviewPage.clusterTabs.size == clusters.size)
        },
        test("Should split all initially existing bundles in every cluster") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            namespaceOverviewPage.clusterTabs.foreach(clusterTabWrapper =>
                clusterTabWrapper.click()
                namespaceOverviewPage.bundleRangesNames.foreach(bundleRange =>
                    namespaceOverviewPage.bundleSplitButton(bundleRange).click()
                    val isUnloadSplitBundles = Random.nextBoolean()
                    if (isUnloadSplitBundles) {
                        namespaceOverviewPage.unloadSplitBundlesButton.click()
                    }
                    namespaceOverviewPage.confirmButton.click()

                    val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unload split bundles")
                    assertTrue(errorModal.isHidden)
                )
            )

            assertTrue(namespaceOverviewPage.clusterTabs.size == clusters.size)
        },
        test("Should unload every individual bundle in every cluster") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            namespaceOverviewPage.clusterTabs.foreach(clusterTabWrapper =>
                clusterTabWrapper.click()
                namespaceOverviewPage.bundleRangesNames.foreach(bundleRange =>
                    namespaceOverviewPage.bundleUnloadButton(bundleRange).click()
                    namespaceOverviewPage.confirmButton.click()

                    val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to unload bundle namespace")
                    assertTrue(errorModal.isHidden)
                )
            )

            assertTrue(namespaceOverviewPage.clusterTabs.size == clusters.size)
        },
        test("Should clear backlog of each individual bundle in every cluster") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val namespaceOverviewPage = NamespaceOverviewPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val clusters = adminClient.clusters.getClusters.asScala

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(clusters.head).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList += tenant

            val numOfBundles = Random.nextInt(4) + 2
            adminClient.namespaces.createNamespace(s"$tenant/$namespace")

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

            val createPartitionedTopicsFuture = Future.sequence(
                partitionedTopicsNames.map { topic =>
                    val topicPersistence = scala.util.Random.nextBoolean() match
                        case true => "persistent"
                        case false => "non-persistent"
                    val partitionsCount = scala.util.Random.nextInt(10) + 2

                    adminClient
                        .topics()
                        .createPartitionedTopicAsync(s"$topicPersistence://$tenant/$namespace/$topic", partitionsCount)
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
                        .createNonPartitionedTopicAsync(s"$topicPersistence://$tenant/$namespace/$topic")
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

            page.navigate(s"/tenants/$tenant/namespaces/$namespace/overview")
            page.waitForTimeout(1000)

            namespaceOverviewPage.clusterTabs.foreach(clusterTabWrapper =>
                clusterTabWrapper.click()
                namespaceOverviewPage.bundleRangesNames.foreach(bundleRange =>
                    namespaceOverviewPage.bundleClearBacklogButton(bundleRange).click()
                    namespaceOverviewPage.guardInput.fill("Confirm clearing of bundle backlog")
                    namespaceOverviewPage.confirmButton.click()

                    val errorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to unload bundle namespace")
                    assertTrue(errorModal.isHidden)
                )
            )

            assertTrue(namespaceOverviewPage.clusterTabs.size == clusters.size)
        } @@ timeout(zio.Duration(15, TimeUnit.SECONDS)) @@ flaky,
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )


