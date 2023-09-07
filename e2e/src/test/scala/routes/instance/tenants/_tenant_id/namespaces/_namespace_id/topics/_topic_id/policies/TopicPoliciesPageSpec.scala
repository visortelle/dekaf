package routes.instance.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.policies

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.{ResourceGroup, TenantInfo}
import net.datafaker.Faker
import routes.tenants._tenant_id.namespaces._namespace_id.topics._topic_id.TopicPage

val faker = new Faker()

object TopicPoliciesPageSpec extends ZIOSpecDefault { // TODO - clean up by deleting tenant, namespace, and topic
    def spec: Spec[Any, Any] = suite("Delete topic modal")(
        test("Should restrict from opening the topic policies page for non-persistent topic") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
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

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/non-persistent/${topic}/messages")

            val buttonHidden =
                try {
                    val buttonExist = topicPage.policiesButton.innerText()
                    false
                } catch {
                    case _: Exception =>
                        true
                }

            assertTrue(buttonHidden)
        },

        test("User can open the topic policies page for persistent topic") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
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
            adminClient.topics.createPartitionedTopic(s"${tenant}/${namespace}/${topic}", 1)

            page.navigate(s"/tenants/${tenant}/namespaces/${namespace}/topics/persistent/${topic}/messages")

            val buttonHidden =
                try {
                    val buttonExist = topicPage.policiesButton.innerText()
                    true
                } catch {
                    case _: Exception =>
                        false
                }

            assertTrue(buttonHidden)
        },
    )
}
