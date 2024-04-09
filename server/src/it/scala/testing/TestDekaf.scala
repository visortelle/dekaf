package testing

import zio.*
import zio.process.Command
import zio.test.TestSystem
import sttp.client4.quick.*
import sttp.client4.Response

case class TestDekaf(
    stop: UIO[Unit]
)

object TestDekaf:
    val live: TaskLayer[TestDekaf] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                for {
                    port <- ZIO.succeed(getFreePort)
                    // we should make Main app configurable and testable without running it as a child process
                    process <- Command("sbt", "run")
                        .env(Map("DEKAF_PORT" -> port.toString))
                        .inheritIO
                        .successfulExitCode
                        .forkScoped
                        .interruptible

                    _ <- ZIO.succeed {
                        scala.util.Try {
                            quickRequest
                                .get(uri"http://127.0.0.1:$port/health")
                                .send()
                        }
                    }
                        .repeatUntil(_.isSuccess)
                    _ <- ZIO.logInfo("Dekaf is up and running")
                } yield TestDekaf(
                    stop = process.interrupt.unit
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
