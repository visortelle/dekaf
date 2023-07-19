package licensing

import zio.*

import java.util.UUID
import _root_.config.readConfig

import java.time.ZoneOffset
import java.time.temporal.ChronoField

val KeygenAccountId = "add36df4-cf52-4909-b352-51318cb23d99"
val KeygenApiUrl = "https://api.keygen.sh"

val Graffiti =
    """
      | _______             __                                          __
      ||       \           |  \                                        |  \
      || $$$$$$$\ __    __ | $$  _______   ______    _______  ______  _| $$_
      || $$__/ $$|  \  |  \| $$ /       \ /      \  /       \|      \|   $$ \
      || $$    $$| $$  | $$| $$|  $$$$$$$|  $$$$$$\|  $$$$$$$ \$$$$$$\\$$$$$$
      || $$$$$$$ | $$  | $$| $$ \$$    \ | $$  | $$| $$      /      $$ | $$ __
      || $$      | $$__/ $$| $$ _\$$$$$$\| $$__/ $$| $$_____|  $$$$$$$ | $$|  \
      || $$       \$$    $$| $$|       $$ \$$    $$ \$$     \\$$    $$  \$$  $$
      | \$$        \$$$$$$  \$$ \$$$$$$$   \$$$$$$   \$$$$$$$ \$$$$$$$   \$$$$  for Apache Pulsar
      |""".stripMargin.replace("$", "▓")

object LicenseServer extends ZIOAppDefault:
    def beforeRun: ZIO[Any, Throwable, Unit] = for {
        _ <- ZIO.attempt({
            println(Graffiti)
            println(s"Teal Tools Inc. Wilmington, Delaware, U.S. ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).atZone(ZoneOffset.UTC).getYear}")
            println(s"Product: ${buildinfo.BuildInfo.name} ${buildinfo.BuildInfo.version} ${buildinfo.BuildInfo.builtAtString}")
            println(s"More info about this product: https://pulsocat.com")
            println(s"More products: https://teal.tools")
        })
        config <- readConfig
        _ <- ZIO.attempt {
            config.licenseKey match
                case None | Some("") =>
                    println("License key isn't set in the application config. You can get your license key at https://pulsocat.com")
                    println("Exit 1")
                    java.lang.System.exit(1)
                case Some(lk) =>
                    val charsToMask = lk.length - 4
                    val maskedLicenseKey = "*" * charsToMask + lk.drop(charsToMask)
                    println(s"License key: ${maskedLicenseKey}")
        }
        _ <- ZIO.attempt({
            println(s"Started at: ${java.time.Instant.now().toString}")
        })
    } yield ()

    def run: IO[Throwable, Unit] = for {
        sessionId <- ZIO.attempt(UUID.randomUUID().toString)
        _ <- ZIO.logInfo(s"License session id: $sessionId")
        config <- readConfig
        licenseKey <- ZIO.succeed(config.licenseKey.get)
    } yield ()
