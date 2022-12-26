package routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker

val faker = new Faker();

object TopicPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Use namespaces page")(

        test("User can delete tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()
            val topicPage = TopicPage(page.locator("body"))

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

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topic}/messages")

            topicPage.deleteButton.click()

            val isDisabled = topicPage.deleteConfirmButton.isDisabled
            topicPage.deleteGuardInput.fill(topic)

            topicPage.forceDeleteCheckbox.click()

            val unDisabled = !topicPage.deleteConfirmButton.isDisabled
            topicPage.deleteConfirmButton.click()

            page.waitForTimeout(1000)

            val isDeleted =
                try {
                    adminClient.topics.getPartitionedTopicMetadata(s"${tenant}/${namespace}/${topic}")
                    false
                } catch {
                    case _ => true
                }

            page.waitForURL(s"tenants/${tenant}/namespaces/${namespace}/topics", new WaitForURLOptions().setTimeout(3000))

//           TODO ADD TEST FOR FORCE DELETE WHEN WILL BE POSSIBLE CHANGE CLUSTER

            assertTrue(isDeleted) &&
                assertTrue(isDisabled) &&
                assertTrue(unDisabled)
        },

    )
}
