package routes.instance

import com.microsoft.playwright.*
import com.microsoft.playwright.Locator.GetByRoleOptions
import com.microsoft.playwright.options.AriaRole

case class InstancePage(root: Locator):
    val createTenantButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create tenant").setExact(true))
