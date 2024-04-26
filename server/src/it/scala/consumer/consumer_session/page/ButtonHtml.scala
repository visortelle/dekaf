package consumer.consumer_session.page

import com.microsoft.playwright.Locator

case class ButtonHtml(root: Locator):
    def click(): Unit = root.click()
