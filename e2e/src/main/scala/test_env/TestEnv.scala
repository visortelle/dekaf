package test_env

import com.microsoft.playwright.*
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import org.apache.pulsar.client.admin.PulsarAdmin

case class PulsarCluster(
    brokersCount: Int,
    bookiesCount: Int,
    brokerConf: String
)

case class TextEnvConfig(pulsarClusters: List[PulsarCluster])

case class TestEnv(config: TextEnvConfig):
    private val publicUrl = "http://localhost:8090"
    private val isDebug = true
    private val playwright: Playwright = Playwright.create
    private val browser: Browser = playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(!isDebug))

    def createPulsarAdminClient(): PulsarAdmin =
        PulsarAdmin.builder().serviceHttpUrl("http://localhost:8080").build()

    def createNewPage(): Page =
        val newPageOptions = new NewPageOptions()
            .setViewportSize(new ViewportSize(1280, 800))
            .setBaseURL(publicUrl)
        browser.newPage(newPageOptions)

def createPulsarStandaloneEnv = TestEnv(TextEnvConfig(
    pulsarClusters = List(
        PulsarCluster(
            brokersCount = 1,
            bookiesCount = 1,
            brokerConf = ""
        )
    )
))