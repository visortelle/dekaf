package testing

import zio.*
import com.microsoft.playwright.*
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import org.apache.pulsar.client.admin.PulsarAdmin

case class TestDekafPage(
    getPage: () => Page
)

val isDebug = !sys.env.get("CI").contains("true")

object TestDekafPage:
    def live: URLayer[TestDekaf, TestDekafPage] = ZLayer.fromZIO(for {
        playwright <- ZIO.succeed(Playwright.create)
        browser <- ZIO.succeed(playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(isDebug)))
        app <- ZIO.service[TestDekaf]
        rootPageUrl <- ZIO.succeed(app.publicBaseUrl)
    } yield TestDekafPage(
        getPage = () => browser.newPage(new NewPageOptions().setViewportSize(new ViewportSize(1280, 800)).setBaseURL(rootPageUrl))
    ))
