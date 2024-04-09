package testing

import zio.*
import com.microsoft.playwright.*
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import org.apache.pulsar.client.admin.PulsarAdmin

case class PulsarStandalone(
    brokerConf: String
)

case class TestEnv(config: PulsarStandalone):
    private val publicBaseUrl = "http://localhost:8090"
    private val isDebug = true
    private val playwright: Playwright = Playwright.create
    private val browser: Browser = playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(!isDebug))

    val pulsarAdmin: PulsarAdmin = PulsarAdmin.builder().serviceHttpUrl("http://localhost:8080").build()

    def start(): Unit =
        val page = createNewPage()
        page.navigate(publicBaseUrl)

    def stop(): Unit =
        browser.close()

    def createNewPage(): Page =
        val newPageOptions = new NewPageOptions()
            .setViewportSize(new ViewportSize(1280, 800))
            .setBaseURL(publicBaseUrl)
        browser.newPage(newPageOptions)

object TestEnv:
    def make(config: Option[PulsarStandalone] = None): TestEnv =
        config match
            case Some(c) => TestEnv(c)
            case None    => TestEnv(PulsarStandalone(brokerConf = ""))
