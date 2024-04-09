package testing

import main.Main
import zio.*
import zio.test.TestSystem
import sttp.client4.quick.*
import com.microsoft.playwright.{BrowserType, Page, Playwright}
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize

case class TestDekaf(
    stop: UIO[Unit],
    publicBaseUrl: String,
    openRootPage: Task[Page]
)

val isDebug = !sys.env.get("CI").contains("true")

object TestDekaf:
    lazy private val playwright = Playwright.create
    lazy private val browser = playwright.chromium.launch(new BrowserType.LaunchOptions().setHeadless(!isDebug))

    val live: URLayer[TestPulsar, TestDekaf] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                for {
                    port <- ZIO.succeed(getFreePort)
                    publicBaseUrl <- ZIO.succeed(s"http://127.0.0.1:$port/")
                    _ <- TestSystem.putEnv("DEKAF_PORT", port.toString)
                    _ <- TestSystem.putEnv("DEKAF_PUBLIC_BASE_URL", publicBaseUrl)

                    pulsar <- ZIO.service[TestPulsar]
                    _ <- TestSystem.putEnv("DEKAF_PULSAR_WEB_URL", pulsar.pulsarWebUrl)
                    _ <- TestSystem.putEnv("DEKAF_PULSAR_BROKER_URL", pulsar.pulsarBrokerUrl)

                    program <- Main.app.forkScoped.interruptible
                    _ <- ZIO.succeed {
                        scala.util.Try {
                            quickRequest
                                .get(uri"http://127.0.0.1:$port/health")
                                .send()
                        }
                    }.repeatUntil(_.isSuccess)
                    _ <- ZIO.logInfo("Dekaf is up and running")
                } yield TestDekaf(
                    stop = program.interrupt *> ZIO.logInfo("Dekaf stopped"),
                    publicBaseUrl = publicBaseUrl,
                    openRootPage = ZIO.attempt(browser.newPage(new NewPageOptions().setViewportSize(new ViewportSize(1280, 800)).setBaseURL(publicBaseUrl)))
                )
            )(dekaf => dekaf.stop)

def getFreePort =
    import java.net.ServerSocket

    var freePort = 0
    val s = new ServerSocket(0)

    try freePort = s.getLocalPort
    catch {
        case e: Exception => e.printStackTrace()
    } finally if (s != null) s.close()

    freePort
