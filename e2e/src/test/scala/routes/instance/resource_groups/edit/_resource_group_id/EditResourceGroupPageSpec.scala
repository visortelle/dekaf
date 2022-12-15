package routes.instance.resource_groups.edit._resource_group_id

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import org.apache.pulsar.common.policies.data.ResourceGroup
import net.datafaker.Faker

val faker = new Faker();

object EditResourceGroupPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Edit Resource Group page")(

        test("User can delete resource group") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            val adminClient = testEnv.createPulsarAdminClient()

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
        },

        test("User can update resource group") {
            val page = pulsarStandaloneEnv.createNewPage()
            val adminClient = pulsarStandaloneEnv.createPulsarAdminClient()

            val testResourceGroupName = s"${faker.name.firstName()}-${java.util.Date().getTime}"
            adminClient.resourcegroups.createResourceGroup(testResourceGroupName, new ResourceGroup())
            val isTestResourceGroupCreated = adminClient.resourcegroups.getResourceGroups.asScala.contains(testResourceGroupName)

            page.navigate(s"/instance/resource-groups/edit/${testResourceGroupName}")
            val editResourceGroupPage = EditResourceGroupPage(page.locator("body"))

            val dispatchRateInBytes = s"${faker.number.numberBetween(0, Int.MaxValue)}"
            editResourceGroupPage.setDispatchRateInBytes(dispatchRateInBytes)

            val dispatchRateInMsgs = s"${faker.number.numberBetween(0, Int.MaxValue)}"
            editResourceGroupPage.setDispatchRateInMsgs(dispatchRateInMsgs)

            val publishRateInBytes = s"${faker.number.numberBetween(0, Int.MaxValue)}"
            editResourceGroupPage.setPublishRateInBytes(publishRateInBytes)

            val publishRateInMsgs = s"${faker.number.numberBetween(0, Int.MaxValue)}"
            editResourceGroupPage.setPublishRateInMsgs(publishRateInMsgs)

            editResourceGroupPage.saveButton.click()
            page.waitForTimeout(1000)
            val UpdatedResourceGroup = adminClient.resourcegroups.getResourceGroup(testResourceGroupName)

            page.waitForURL("/instance/resource-groups", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isTestResourceGroupCreated) &&
                assertTrue(UpdatedResourceGroup.getDispatchRateInBytes.toString == dispatchRateInBytes) &&
                assertTrue(UpdatedResourceGroup.getDispatchRateInMsgs.toString == dispatchRateInMsgs) &&
                assertTrue(UpdatedResourceGroup.getPublishRateInBytes.toString == publishRateInBytes) &&
                assertTrue(UpdatedResourceGroup.getPublishRateInMsgs.toString == publishRateInMsgs)
        }
    )
}
