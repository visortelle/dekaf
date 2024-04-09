package testing

import main.Main
import zio.*
import zio.test.TestSystem
import sttp.client4.quick.*

case class TestDekaf(
    stop: UIO[Unit],
    publicBaseUrl: String
)

object TestDekaf:
    val live: ULayer[TestDekaf] =
        ZLayer.scoped:
            ZIO.acquireRelease(
                for {
                    port <- ZIO.succeed(getFreePort)
                    _ <- TestSystem.putEnv("DEKAF_PORT", port.toString)

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
                    publicBaseUrl = s"http://127.0.0.1:$port/"
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
