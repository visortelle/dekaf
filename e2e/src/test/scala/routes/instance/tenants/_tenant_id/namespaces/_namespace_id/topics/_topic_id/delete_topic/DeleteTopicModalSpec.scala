package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.delete_topic

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import scala.util.Random
import scala.collection.mutable.ListBuffer
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import com.microsoft.playwright.options.{AriaRole, WaitForSelectorState}
import com.microsoft.playwright.Locator.WaitForOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker
import routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.TopicPage

val faker = new Faker()

object DeleteTopicModalSpec extends ZIOSpecDefault:
    val specTenantList: ListBuffer[String] = ListBuffer()

    //TODO - add tests for topic with many producers/consumers/subscriptions
    //TODO - add test for force delete when will be possible change cluster
    def spec: Spec[Any, Any] = suite("Delete topic modal")(
        test("Should soft delete partitioned (persistent and non-persistent) without consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"
            val numberOfPartitions = Random.nextInt(30) + 2

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createPartitionedTopic(persistentTopicFqn, numberOfPartitions)
            adminClient.topics.createPartitionedTopic(nonPersistentTopicFqn, numberOfPartitions)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/overview")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(persistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/overview")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isNonPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(nonPersistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            assertTrue(isPersistentTopicDeleted) &&
              assertTrue(isNonPersistentTopicDeleted) &&
              assertTrue(isPersistentTopicDeletionDisabledByGuard) &&
              assertTrue(isNonPersistentTopicDeletionDisabledByGuard) &&
              assertTrue(isPersistentTopicDeletionEnabledOnGuardProvided) &&
              assertTrue(isNonPersistentTopicDeletionEnabledOnGuardProvided)
        },
        test("Should soft delete non-partitioned (persistent and non-persistent) without consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(persistentTopicFqn)
            adminClient.topics.createNonPartitionedTopic(nonPersistentTopicFqn)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/overview")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(persistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/overview")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isNonPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(nonPersistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            assertTrue(isPersistentTopicDeleted) &&
              assertTrue(isNonPersistentTopicDeleted) &&
              assertTrue(isPersistentTopicDeletionDisabledByGuard) &&
              assertTrue(isNonPersistentTopicDeletionDisabledByGuard) &&
              assertTrue(isPersistentTopicDeletionEnabledOnGuardProvided) &&
              assertTrue(isNonPersistentTopicDeletionEnabledOnGuardProvided)
        },
        test("Should force delete partitioned topics (persistent and non-persistent) with consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"
            val numberOfPartitions = Random.nextInt(30) + 2

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createPartitionedTopic(persistentTopicFqn, numberOfPartitions)
            adminClient.topics.createPartitionedTopic(nonPersistentTopicFqn, numberOfPartitions)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            topicPage.forceDeleteCheckbox.click()

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(persistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            topicPage.forceDeleteCheckbox.click()

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isNonPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(nonPersistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            assertTrue(isPersistentTopicDeleted) &&
                assertTrue(isNonPersistentTopicDeleted) &&
                assertTrue(isPersistentTopicDeletionDisabledByGuard) &&
                assertTrue(isNonPersistentTopicDeletionDisabledByGuard) &&
                assertTrue(isPersistentTopicDeletionEnabledOnGuardProvided) &&
                assertTrue(isNonPersistentTopicDeletionEnabledOnGuardProvided)
        },
        test("Should force delete non-partitioned topics (persistent and non-persistent) with consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(persistentTopicFqn)
            adminClient.topics.createNonPartitionedTopic(nonPersistentTopicFqn)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            topicPage.forceDeleteCheckbox.click()

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(persistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            topicPage.forceDeleteCheckbox.click()

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isNonPersistentTopicDeleted =
                try {
                    val topicFound = adminClient.lookups().lookupTopic(nonPersistentTopicFqn)

                    topicFound == null
                } catch {
                    case _: Exception => true
                }

            page.waitForURL(
                s"tenants/${tenant}/namespaces/${namespace}/topics",
                new WaitForURLOptions().setTimeout(3000)
            )

            assertTrue(isPersistentTopicDeleted) &&
                assertTrue(isNonPersistentTopicDeleted) &&
                assertTrue(isPersistentTopicDeletionDisabledByGuard) &&
                assertTrue(isNonPersistentTopicDeletionDisabledByGuard) &&
                assertTrue(isPersistentTopicDeletionEnabledOnGuardProvided) &&
                assertTrue(isNonPersistentTopicDeletionEnabledOnGuardProvided)
        },
        test("Should prevent soft delete partitioned (persistent and non-persistent) with consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"
            val numberOfPartitions = Random.nextInt(30) + 2

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createPartitionedTopic(persistentTopicFqn, numberOfPartitions)
            adminClient.topics.createPartitionedTopic(nonPersistentTopicFqn, numberOfPartitions)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val persistentTopicDeletionErrorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete topic")
            persistentTopicDeletionErrorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
            assertTrue(persistentTopicDeletionErrorModal.isVisible)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val nonPersistentTopicDeletionErrorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete topic")
            nonPersistentTopicDeletionErrorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
            assertTrue(nonPersistentTopicDeletionErrorModal.isVisible)
        },
        test("Should prevent soft delete non-partitioned (persistent and non-persistent) with consumers/producers/subscriptions") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val topicPage = TopicPage(page.locator("body"))

            val tenant = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val namespace = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val topicBaseName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            val persistentTopicFqn = s"persistent://${tenant}/${namespace}/${topicBaseName}"
            val nonPersistentTopicFqn = s"non-persistent://${tenant}/${namespace}/${topicBaseName}"

            val config = TenantInfo.builder
            val cluster = adminClient.clusters.getClusters.asScala.head

            config.adminRoles(Set("Admin").asJava)
            config.allowedClusters(Set(cluster).asJava)
            adminClient.tenants.createTenant(tenant, config.build)
            specTenantList.append(tenant)
            adminClient.namespaces.createNamespace(s"${tenant}/${namespace}")
            adminClient.topics.createNonPartitionedTopic(persistentTopicFqn)
            adminClient.topics.createNonPartitionedTopic(nonPersistentTopicFqn)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(persistentTopicFqn)

            val isPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            val persistentTopicDeletionErrorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete topic")
            persistentTopicDeletionErrorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
            assertTrue(persistentTopicDeletionErrorModal.isVisible)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topicBaseName}/messages")

            topicPage.deleteButton.click()

            val isNonPersistentTopicDeletionDisabledByGuard = topicPage.deleteConfirmButton.isDisabled

            topicPage.deleteGuardInput.fill(nonPersistentTopicFqn)

            val isNonPersistentTopicDeletionEnabledOnGuardProvided = topicPage.deleteConfirmButton.isEnabled

            topicPage.deleteConfirmButton.click()

            val nonPersistentTopicDeletionErrorModal = page.getByRole(AriaRole.ALERT).getByText("Unable to delete topic")
            nonPersistentTopicDeletionErrorModal.waitFor(WaitForOptions().setState(WaitForSelectorState.VISIBLE))
            assertTrue(nonPersistentTopicDeletionErrorModal.isVisible)
        },
    ) @@ afterAll(
        ZIO.attempt {
            val adminClient = TestEnv.createPulsarAdminClient

            specTenantList.foreach { tenant =>
                adminClient.tenants.deleteTenant(tenant, true)
            }
        }.fork
    )
