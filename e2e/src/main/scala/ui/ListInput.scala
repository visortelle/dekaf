package ui

import com.microsoft.playwright.Locator.SelectOptionOptions
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Locator.GetByRoleOptions
import com.microsoft.playwright.options.AriaRole

case class ListInput(root: Locator):
    val addItemInput: Locator = root.getByRole(AriaRole.TEXTBOX)
    val addItemButton: Locator = root.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Add").setExact(true))

    def addItem(text: String): Unit =
        addItemInput.fill(text)
        addItemButton.click()

    def removeNthItem(nth: Int): Unit =
        root.getByRole(AriaRole.BUTTON).nth(nth).click()

    def selectNthCluster(nth: Int): Unit =
        val optionToSelect = root.getByRole(AriaRole.COMBOBOX).locator("option").nth(nth).textContent()
        root.getByRole(AriaRole.COMBOBOX).selectOption(optionToSelect)
