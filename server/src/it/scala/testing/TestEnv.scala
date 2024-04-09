package testing

import zio.*
import com.microsoft.playwright.*
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import org.apache.pulsar.client.admin.PulsarAdmin

case class TestEnv(
    createNewPage: () => Page
)

val isDebug = !sys.env.get("CI").contains("true")

object TestEnv:
    def live: URLayer[TestDekaf & TestPulsarContainer, TestEnv] = ZLayer.fromZIO(for {
        playwright <- ZIO.succeed(Playwright.create)
        browser <- ZIO.succeed(playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(isDebug)))
        app <- ZIO.service[TestDekaf]
        rootPageUrl <- ZIO.succeed(app.publicBaseUrl)
    } yield TestEnv(
        createNewPage = () => browser.newPage(new NewPageOptions().setViewportSize(new ViewportSize(1280, 800)).setBaseURL(rootPageUrl))
    ))
