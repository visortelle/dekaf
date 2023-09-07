package routes.instance.resource_groups

import _root_.test_env.TestEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker
import org.apache.pulsar.common.policies.data.ResourceGroup
import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import scala.util.control.Breaks.break


val faker = new Faker()

object ResourceGroupsPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Resource groups page")(
        test("User can see resource groups") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val resourceGroupsPage = ResourceGroupsPage(page.locator("body"))

            val newResourceGroups: Map[String, ResourceGroup] = List.range(0, 20).map(i => {
                val resourceGroup = new ResourceGroup

                val resourceGroupName = s"${faker.name.lastName}-${new java.util.Date().getTime}"

                resourceGroup.setDispatchRateInBytes(faker.number.numberBetween(0, Int.MaxValue))
                resourceGroup.setDispatchRateInMsgs(faker.number.numberBetween(0, Int.MaxValue))
                resourceGroup.setPublishRateInBytes(faker.number.numberBetween(0, Int.MaxValue))
                resourceGroup.setPublishRateInMsgs(faker.number.numberBetween(0, Int.MaxValue))

                (resourceGroupName, resourceGroup)
            }).toMap

            newResourceGroups.foreach({ case (rgName, rg) =>
                adminClient.resourcegroups.createResourceGroup(rgName, rg)
            })

            page.navigate("/instance/resource-groups")

            val existResourceGroups: Map[String, ResourceGroup] = newResourceGroups.map(resourceGroup => {
                val existResourceGroup = new ResourceGroup

                val resourceGroupName = resourceGroupsPage.getResourceGroupName(resourceGroup._1)

                existResourceGroup.setDispatchRateInBytes(resourceGroupsPage.getDispatchRateInBytes(resourceGroup._1).replace(",", "").toLong)
                existResourceGroup.setDispatchRateInMsgs(resourceGroupsPage.getDispatchRateInMsgs(resourceGroup._1).replace(",", "").toInt)
                existResourceGroup.setPublishRateInBytes(resourceGroupsPage.getPublishRateInBytes(resourceGroup._1).replace(",", "").toLong)
                existResourceGroup.setPublishRateInMsgs(resourceGroupsPage.getPublishRateInMsgs(resourceGroup._1).replace(",", "").toInt)

                (resourceGroupName, existResourceGroup)
            })

            assertTrue(newResourceGroups == existResourceGroups)
        },

        test("User can open resource-groups/:resource-group/edit") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = TestEnv.createPulsarAdminClient
            val resourceGroupsPage = ResourceGroupsPage(page.locator("body"))

            val testResourceGroupName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            adminClient.resourcegroups.createResourceGroup(testResourceGroupName, new ResourceGroup())

            page.navigate("/instance/resource-groups")

            resourceGroupsPage.edit(testResourceGroupName)

            page.waitForURL(s"/instance/resource-groups/edit/${testResourceGroupName}", new WaitForURLOptions().setTimeout(3000))

            assertTrue(page.url == s"http://localhost:8090/instance/resource-groups/edit/${testResourceGroupName}")
        },

        test("User can open resource-groups/create") {
            val testEnv: TestEnv = TestEnv.createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val resourceGroupsPage = ResourceGroupsPage(page.locator("body"))

            page.navigate("/instance/resource-groups")

            resourceGroupsPage.createButton.click()

            page.waitForURL("/instance/resource-groups/create", new WaitForURLOptions().setTimeout(3000))

            assertTrue(page.url == "http://localhost:8090/instance/resource-groups/create")
        }
    )
}
