package routes.instance.resource_groups

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.pulsarStandaloneEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker
import routes.InstancePage

val faker = new Faker();

object ResourceGroupsPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Create tenant page")(
        test("User can create tenant") {
            val page = pulsarStandaloneEnv.createNewPage()
            page.navigate("/instance/resource-groups")

            val resourceGroupsPage = ResourceGroupsPage(page.locator("body"))
            resourceGroupsPage.moveToCreate()

            val isCreateButtonDisabledIfNoResourceGroupName = resourceGroupsPage.createButton.isDisabled

            val resourceGroupName = s"${faker.name.lastName}-${new java.util.Date().getTime}"
            resourceGroupsPage.setResourceGroupName(resourceGroupName)

            val dispatchRateInBytes = s"${faker.hashCode + 1}"
            resourceGroupsPage.setDispatchRateInBytes(dispatchRateInBytes)

            val dispatchRateInMsgs = s"${faker.hashCode + 2}"
            resourceGroupsPage.setDispatchRateInMsgs(dispatchRateInMsgs)

            val publishRateInBytes = s"${faker.hashCode + 3}"
            resourceGroupsPage.setPublishRateInBytes(publishRateInBytes)

            val publishRateInMsgs = s"${faker.hashCode + 4}"
            resourceGroupsPage.setPublishRateInMsgs(publishRateInMsgs)
            resourceGroupsPage.create()

            val adminClient = pulsarStandaloneEnv.createPulsarAdminClient()
            val resourceGroups = adminClient.resourcegroups.getResourceGroups.asScala

            page.waitForURL("/", new WaitForURLOptions().setTimeout(3000))

            assertTrue(isCreateButtonDisabledIfNoResourceGroupName) &&
                assertTrue(resourceGroups.contains(resourceGroupName))
            // TODO - test allowed clusters input
        }
    )
}
