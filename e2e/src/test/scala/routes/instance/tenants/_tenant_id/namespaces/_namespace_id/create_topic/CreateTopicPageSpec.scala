package routes.instance.tenants._tenant_id.namespaces._namespace_id.create_topic

import test_env.TestEnv
import zio.ZIO
import zio.test.TestAspect.afterAll
import zio.test.{Spec, ZIOSpecDefault}
import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.{SelectOptionOptions, WaitForURLOptions}
import com.microsoft.playwright.options.AriaRole
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.TenantInfo
import routes.instance.InstancePage
import routes.tenants._tenant_id.namespaces._namespace_id.create_topic.CreateTopicPage
import zio.test.TestFailure.fail

import scala.collection.mutable.ListBuffer

val faker = new Faker()
object CreateTopicPageSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    def spec: Spec[Any, Any] = suite("Create topic page")(
        suite("Functionality") (
            suite("Without properties") (
                test("Should create persistent non-partitioned topic without properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create persistent partitioned topic without properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create non-persistent partitioned topic without properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create non-persistent non-partitioned topic without properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
            ),
            suite("With properties") (
                test("Should create persistent non-partitioned topic with properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

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
                            createTopicPage.topicProperties.newKey.fill(key)
                            createTopicPage.topicProperties.newValue.fill(value)

                            createTopicPage.topicProperties.addPropertyButton.click()
                    }

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create persistent partitioned topic with properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

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
                            createTopicPage.topicProperties.newKey.fill(key)
                            createTopicPage.topicProperties.newValue.fill(value)

                            createTopicPage.topicProperties.addPropertyButton.click()
                    }

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create non-persistent partitioned topic with properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

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
                            createTopicPage.topicProperties.newKey.fill(key)
                            createTopicPage.topicProperties.newValue.fill(value)

                            createTopicPage.topicProperties.addPropertyButton.click()
                    }

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
                test("Should create non-persistent non-partitioned topic with properties") {
                    val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
                    val page = testEnv.createNewPage()
                    val adminClient = TestEnv.createPulsarAdminClient
                    val createTopicPage = CreateTopicPage(page.locator("body"))

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

                    page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/create-topic")

                    val isCreateTopicButtonDisabledWithoutName = createTopicPage.topicCreateButton.isDisabled
                    createTopicPage.topicNameInput.fill(topicBaseName)

                    val isCreateTopicButtonEnabledWithNameProvided = createTopicPage.topicCreateButton.isEnabled

                    createTopicPage.topicPartitioningSelect.selectOption("partitioned")
                    createTopicPage.topicPartitionsCountInput.fill(faker.random().nextInt(2, 20).toString)

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
                            createTopicPage.topicProperties.newKey.fill(key)
                            createTopicPage.topicProperties.newValue.fill(value)

                            createTopicPage.topicProperties.addPropertyButton.click()
                    }

                    createTopicPage.topicCreateButton.click()

                    page.waitForURL(s"/tenants/${tenant}/namespaces/${namespace}/topics", WaitForURLOptions().setTimeout(3000))

                    val isTopicFound =
                        try
                            adminClient.lookups().lookupPartitionedTopic(topicFqn)
                            true
                        catch
                            case _: Exception =>
                                fail(s"Topic \"${topicFqn}\" was not created")
                                false

                    assertTrue(isCreateTopicButtonDisabledWithoutName) &&
                      assertTrue(isCreateTopicButtonEnabledWithNameProvided) &&
                      assertTrue(isTopicFound)
                },
            ),
        )
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
