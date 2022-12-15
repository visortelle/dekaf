package routes.instance.delete_resource_group

import zio.*
import zio.test.*
import zio.test.Assertion.*
import zio.test.TestAspect.*

import scala.jdk.CollectionConverters.*
import _root_.test_env.pulsarStandaloneEnv
import com.microsoft.playwright.Page.WaitForURLOptions
import net.datafaker.Faker

val faker = new Faker();

object DeleteResourceGroupPageSpec extends ZIOSpecDefault {
    def spec: Spec[Any, Any] = suite("Delete resource group")(
        test("User can delete resource group") {
            val page = pulsarStandaloneEnv.createNewPage()
            page.navigate("/instance/resource-groups")

            val resourceGroupsPage = DeleteResourceGroupPage(page.locator("body"))
            val editableResourceGroup = resourceGroupsPage.editableResourceGroup
            resourceGroupsPage.edit()

            page.waitForURL(s"/instance/resource-groups/${editableResourceGroup}", new WaitForURLOptions().setTimeout(3000))

            val resourceGroup = resourceGroupsPage.resourceGroup
            resourceGroupsPage.delete()

            page.waitForURL("/instance/resource-groups", new WaitForURLOptions().setTimeout(3000))

            val secondResourceGroup = resourceGroupsPage.editableResourceGroup

//            println(editableResourceGroup.textContent())
//            println(resourceGroup.textContent())
//            println(editableResourceGroup.textContent())
//            println(secondResourceGroup.textContent())

            assertTrue(editableResourceGroup.textContent() == resourceGroup.textContent()) &&
                assertTrue(editableResourceGroup.textContent() != secondResourceGroup.textContent())
            // TODO - test allowed clusters input
        }
    )
}
