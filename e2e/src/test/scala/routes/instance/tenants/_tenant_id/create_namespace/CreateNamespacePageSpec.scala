package routes.instance.tenants._tenant_id.create_namespace

import com.microsoft.playwright.Locator.WaitForOptions
import net.datafaker.Faker

import scala.jdk.CollectionConverters.*
import org.apache.pulsar.common.policies.data.TenantInfo
import com.microsoft.playwright.Page.{SelectOptionOptions, WaitForURLOptions}
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import routes.tenants._tenant_id.create_namespace.CreateNamespacePage
import test_env.TestEnv
import zio.ZIO
import zio.test.TestAspect.afterAll
import zio.test.TestFailure.fail
import zio.test.{Spec, ZIOSpecDefault, assertTrue}

import java.util
import scala.collection.mutable.ListBuffer

val faker = new Faker()

object CreateNamespacePageSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    def spec: Spec[Any, Any]  = suite("Create namespace page")(
        test("Should create namespace without properties") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val createNamespacePage = CreateNamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/create-namespace")

            val isCreateNamespaceButtonDisabledWithoutName = createNamespacePage.createNamespaceButton.isDisabled
            createNamespacePage.namespaceNameInput.fill(namespace)

            page.waitForTimeout(1000)

            val isCreateNamespaceButtonEnabledWithNameProvided = createNamespacePage.createNamespaceButton.isEnabled

            createNamespacePage.bundlesCountInput.click()
            createNamespacePage.bundlesCountInput.fill(faker.random().nextInt(2, 100).toString)

            createNamespacePage.createNamespaceButton.click()

            page.waitForURL(s"/tenants/${tenant}/namespaces", WaitForURLOptions().setTimeout(3000))

            val namespaces =
                try
                    adminClient.namespaces().getNamespaces(tenant)
                catch
                    case _: Exception =>
                        fail(s"Namespace \"${namespace}\" was not created")
                        new java.util.ArrayList[String]()

            assertTrue(isCreateNamespaceButtonDisabledWithoutName) &&
              assertTrue(isCreateNamespaceButtonEnabledWithNameProvided) &&
              assertTrue(namespaces.asScala.contains(s"${tenant}/${namespace}"))
        },
        test("Should create namespace with properties") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val createNamespacePage = CreateNamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/create-namespace")

            val isCreateNamespaceButtonDisabledWithoutName = createNamespacePage.createNamespaceButton.isDisabled
            createNamespacePage.namespaceNameInput.fill(namespace)

            page.waitForTimeout(1000)

            val isCreateNamespaceButtonEnabledWithNameProvided = createNamespacePage.createNamespaceButton.isEnabled

            createNamespacePage.bundlesCountInput.click()
            createNamespacePage.bundlesCountInput.fill(faker.random().nextInt(2, 100).toString)

            val properties = faker.collection(
                  () => faker.lorem().characters(5, 20) -> faker.lorem().characters(5, 20)
              )
              .len(1, 20)
              .generate()
              .asInstanceOf[java.util.List[(String, String)]]
              .asScala
              .toMap

            properties.foreach {
                case (key: String, value: String) =>
                    createNamespacePage.namespaceProperties.newKey.fill(key)
                    createNamespacePage.namespaceProperties.newValue.fill(value)

                    createNamespacePage.namespaceProperties.addPropertyButton.click()
            }

            createNamespacePage.createNamespaceButton.click()

            page.waitForURL(s"/tenants/${tenant}/namespaces", WaitForURLOptions().setTimeout(3000))

            val namespaces =
                try
                    adminClient.namespaces().getNamespaces(tenant)
                catch
                    case _: Exception =>
                        fail(s"Namespace \"${namespace}\" was not created")
                        new java.util.ArrayList[String]()

            assertTrue(isCreateNamespaceButtonDisabledWithoutName) &&
              assertTrue(isCreateNamespaceButtonEnabledWithNameProvided) &&
              assertTrue(namespaces.asScala.contains(s"${tenant}/${namespace}"))
        },
        test("Should create namespace with replication among all clusters without properties") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val createNamespacePage = CreateNamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/create-namespace")

            val isCreateNamespaceButtonDisabledWithoutName = createNamespacePage.createNamespaceButton.isDisabled
            createNamespacePage.namespaceNameInput.fill(namespace)

            page.waitForTimeout(1000)

            val isCreateNamespaceButtonEnabledWithNameProvided = createNamespacePage.createNamespaceButton.isEnabled

            createNamespacePage.bundlesCountInput.click()
            createNamespacePage.bundlesCountInput.fill(faker.random().nextInt(2, 100).toString)

            createNamespacePage.replicationClustersSelectListInput.removeNthItem(0)

            List.range(1, createNamespacePage.root.getByRole(AriaRole.COMBOBOX).locator("option").count())
              .foreach(i =>
                  createNamespacePage.replicationClustersSelectListInput.selectNthCluster(i)

                  if createNamespacePage.replicationClustersSelectListInput.addItemButton.isEnabled then
                      createNamespacePage.replicationClustersSelectListInput.addItemButton.click()
              )

            createNamespacePage.createNamespaceButton.click()

            page.waitForURL(s"/tenants/${tenant}/namespaces", WaitForURLOptions().setTimeout(3000))

            val namespaces =
                try
                    adminClient.namespaces().getNamespaces(tenant)
                catch
                    case _: Exception =>
                        fail(s"Namespace \"${namespace}\" was not created")
                        new java.util.ArrayList[String]()

            assertTrue(isCreateNamespaceButtonDisabledWithoutName) &&
              assertTrue(isCreateNamespaceButtonEnabledWithNameProvided) &&
              assertTrue(namespaces.asScala.contains(s"${tenant}/${namespace}"))
        },
        test("Should create namespace with replication among all clusters with properties") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val createNamespacePage = CreateNamespacePage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters().getClusters.get(0)

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)

            adminClient.tenants.createTenant(tenant, config.build)

            specTenantList += tenant

            page.navigate(s"/tenants/${tenant}/create-namespace")

            val isCreateNamespaceButtonDisabledWithoutName = createNamespacePage.createNamespaceButton.isDisabled
            createNamespacePage.namespaceNameInput.fill(namespace)

            page.waitForTimeout(1000)

            val isCreateNamespaceButtonEnabledWithNameProvided = createNamespacePage.createNamespaceButton.isEnabled

            createNamespacePage.bundlesCountInput.click()
            createNamespacePage.bundlesCountInput.fill(faker.random().nextInt(2, 100).toString)

            createNamespacePage.replicationClustersSelectListInput.removeNthItem(0)

            List.range(1, createNamespacePage.root.getByRole(AriaRole.COMBOBOX).locator("option").count())
              .foreach(i =>
                  createNamespacePage.replicationClustersSelectListInput.selectNthCluster(i)

                  if createNamespacePage.replicationClustersSelectListInput.addItemButton.isEnabled then
                      createNamespacePage.replicationClustersSelectListInput.addItemButton.click()
              )

            val properties = faker.collection(
                  () => faker.lorem().characters(5, 20) -> faker.lorem().characters(5, 20)
              )
              .len(1, 20)
              .generate()
              .asInstanceOf[java.util.List[(String, String)]]
              .asScala
              .toMap

            properties.foreach {
                case (key: String, value: String) =>
                    createNamespacePage.namespaceProperties.newKey.fill(key)
                    createNamespacePage.namespaceProperties.newValue.fill(value)

                    createNamespacePage.namespaceProperties.addPropertyButton.click()
            }

            createNamespacePage.createNamespaceButton.click()

            page.waitForURL(s"/tenants/${tenant}/namespaces", WaitForURLOptions().setTimeout(3000))

            val namespaces =
                try
                    adminClient.namespaces().getNamespaces(tenant)
                catch
                    case _: Exception =>
                        fail(s"Namespace \"${namespace}\" was not created")
                        new java.util.ArrayList[String]()

            assertTrue(isCreateNamespaceButtonDisabledWithoutName) &&
              assertTrue(isCreateNamespaceButtonEnabledWithNameProvided) &&
              assertTrue(namespaces.asScala.contains(s"${tenant}/${namespace}"))
        },
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
