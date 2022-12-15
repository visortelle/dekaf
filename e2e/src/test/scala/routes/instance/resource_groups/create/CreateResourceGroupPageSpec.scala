package routes.instance.resource_groups.create

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.{TestEnv, createPulsarStandaloneEnv}
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker

val faker = new Faker();

object CreateResourceGroupPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Create tenant page")(
        test("User can create tenant") {
            val testEnv: TestEnv = createPulsarStandaloneEnv
            val page = testEnv.createNewPage()
            page.navigate("/instance/resource-groups")

            val resourceGroupsPage = CreateResourceGroupPage(page.locator("body"))
            resourceGroupsPage.moveToCreate()

            val isCreateButtonDisabledIfNoResourceGroupName = resourceGroupsPage.createButton.isDisabled

            val resourceGroupName = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            resourceGroupsPage.setResourceGroupName(resourceGroupName)

            val dispatchRateInBytes = s"${faker.number.randomNumber}"
            resourceGroupsPage.setDispatchRateInBytes(dispatchRateInBytes)

            val dispatchRateInMsgs = s"${faker.number.randomNumber}"
            resourceGroupsPage.setDispatchRateInMsgs(dispatchRateInMsgs)

            val publishRateInBytes = s"${faker.number.randomNumber}"
            resourceGroupsPage.setPublishRateInBytes(publishRateInBytes)

            val publishRateInMsgs = s"${faker.number.randomNumber}"
            resourceGroupsPage.setPublishRateInMsgs(publishRateInMsgs)

            resourceGroupsPage.create()

            val adminClient = testEnv.createPulsarAdminClient()
            val resourceGroups = adminClient.resourcegroups.getResourceGroups.asScala

            page.waitForURL("/instance/resource-groups", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoResourceGroupName) &&
                assertTrue(resourceGroups.contains(resourceGroupName))
        }
    )
}
