package routes.instance.resource_groups.edit._resource_group_id

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.pulsarStandaloneEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.ResourceGroup
import net.datafaker.Faker

val faker = new Faker();

object EditResourceGroupPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Edit Resource Group page")(
        test("User can delete resource group") {
            val page = pulsarStandaloneEnv.createNewPage()
            val adminClient = pulsarStandaloneEnv.createPulsarAdminClient()

            val testResourceGroupName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            adminClient.resourcegroups.createResourceGroup(testResourceGroupName, new ResourceGroup())
            val isTestResourceGroupCreated = adminClient.resourcegroups.getResourceGroups.asScala.contains(testResourceGroupName)


            page.navigate(s"/instance/resource-groups/edit/${testResourceGroupName}")
            val editResourceGroupPage = EditResourceGroupPage(page.locator("body"))

            editResourceGroupPage.deleteButton.click()
            page.waitForTimeout(1000)
            val isTestResourceGroupDeleted = !adminClient.resourcegroups.getResourceGroups.asScala.contains(testResourceGroupName)

            page.waitForURL("/instance/resource-groups", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isTestResourceGroupCreated) && assertTrue(isTestResourceGroupDeleted)
        }
    )
}
