package testing

import main.Main
import zio.*
import zio.test.TestSystem
import sttp.client4.quick.*
import com.microsoft.playwright.{BrowserType, Page, Playwright}
import com.microsoft.playwright.Browser.NewPageOptions
import com.microsoft.playwright.options.ViewportSize
import com.tools.teal.pulsar.ui.library.v1.library.{LibraryServiceGrpc, SaveLibraryItemRequest}
import com.tools.teal.pulsar.ui.library.v1.library.LibraryServiceGrpc.LibraryServiceStub
import io.grpc.{ManagedChannel, ManagedChannelBuilder}
import library.LibraryItem

case class TestDekaf(
    stop: UIO[Unit],
    publicBaseUrl: String,
    openRootPage: Task[Page],
    saveLibraryItem: (item: LibraryItem) => Task[Unit],
    getGrpcClient: Task[GrpcClient]
)

object TestDekaf:
    def live: URLayer[TestPulsar, TestDekaf] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                for {
                    _ <- TestSystem.putEnv("DEKAF_LICENSE_ID", sys.env("DEKAF_LICENSE_ID"))
                    _ <- TestSystem.putEnv("DEKAF_LICENSE_TOKEN", sys.env("DEKAF_LICENSE_TOKEN"))

                    port <- ZIO.succeed(getFreePort)
                    _ <- TestSystem.putEnv("DEKAF_PORT", port.toString)

                    internalHttpPort <- ZIO.succeed(getFreePort)
                    internalGrpcPort <- ZIO.succeed(getFreePort)
                    _ <- TestSystem.putEnv("DEKAF_INTERNAL_HTTP_PORT", internalHttpPort.toString)
                    _ <- TestSystem.putEnv("DEKAF_INTERNAL_GRPC_PORT", internalGrpcPort.toString)

                    publicBaseUrl <- ZIO.succeed(s"http://127.0.0.1:$port/")
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
                    grpcClient <- ZIO.succeed {
                        val channel = ManagedChannelBuilder.forAddress("127.0.0.1", internalGrpcPort).usePlaintext().build
                        GrpcClient.fromChannel(channel)
                    }
                } yield TestDekaf(
                    stop = program.interrupt *> ZIO.logInfo("Dekaf stopped"),
                    publicBaseUrl = publicBaseUrl,
                    openRootPage = ZIO.attempt {
                        val playwright = Playwright.create
                        val browserOptions = new BrowserType.LaunchOptions()
                            .setHeadless(!TestRuntime.isOpenBrowser)

                        val browser = playwright.chromium.launch(browserOptions)

                        val pageOptions = new NewPageOptions()
                            .setViewportSize(new ViewportSize(1280, 800))
                            .setBaseURL(publicBaseUrl)
                        val page = browser.newPage(pageOptions)
                        page.onConsoleMessage(msg => println(s"Message from browser console: ${msg.`type`} ${msg.text}"))

                        page
                    },
                    getGrpcClient = ZIO.succeed(grpcClient),
                    saveLibraryItem = (item: LibraryItem) => saveLibraryItem(grpcClient, item)
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

case class GrpcClient(
    library: LibraryServiceStub
)

object GrpcClient:
    def fromChannel(channel: ManagedChannel): GrpcClient =
        GrpcClient(
            library = com.tools.teal.pulsar.ui.library.v1.library.LibraryServiceGrpc.stub(channel)
        )

def saveLibraryItem(client: GrpcClient, item: LibraryItem): Task[Unit] = for {
    req <- ZIO.succeed {
        val libraryItemPb = LibraryItem.toPb(item)
        SaveLibraryItemRequest(item = Some(libraryItemPb))
    }

    // XXX - The library item saves successfully, but the request still fails.
    // Need to investigate the reason.
    _ <- ZIO.fromFuture(_ => client.library.saveLibraryItem(req)).orElseSucceed(())
} yield ()
