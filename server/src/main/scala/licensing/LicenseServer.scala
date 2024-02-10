package licensing

import zio.{System as SystemZIO, *}
import keygen.{KeygenClient, *}

import java.util.UUID
import _root_.config.readConfig

import java.time.ZoneOffset
import java.time.temporal.ChronoField

val KeygenAccountId = "add36df4-cf52-4909-b352-51318cb23d99"
val KeygenApiUrl = "https://api.keygen.sh"

val desktopFreeLicenseId = "33a8cc38-5062-4f30-91d6-31b0797ea9d0"
val desktopFreeLicenseToken = "prod-f6339ce7067c062724ca5e2bb2d36690b3637aed1c5f93e740148d4f1f2e4f6av3"

val Graffiti =
    """
      |########  ######## ##    ##    ###    ########
      |##     ## ##       ##   ##    ## ##   ##
      |##     ## ##       ##  ##    ##   ##  ##
      |##     ## ######   #####    ##     ## ######
      |##     ## ##       ##  ##   ######### ##
      |##     ## ##       ##   ##  ##     ## ##
      |########  ######## ##    ## ##     ## ##
      |for Apache Pulsar
      |""".stripMargin.trim.replace("$", "▓")

object LicenseServer:
    case class InitResult(
        keygenMachine: KeygenMachine,
        keygenClient: KeygenClient,
        productInfo: LicenseInfo
    )

    def init: Task[InitResult] = for {
        _ <- ZIO.attempt {
            println(Graffiti)
            println(s"${buildinfo.BuildInfo.name} ${buildinfo.BuildInfo.version}")
            println(
                s"Teal Tools Inc. Wilmington, Delaware, U.S. ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).atZone(ZoneOffset.UTC).getYear}"
            )
            println(s"https://teal.tools")
            println(s"Built at: ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).toString}")
            println(s"More info: https://dekaf.io")
            println(s"Java version: ${System.getProperty("java.version")}")
        }
        config <- readConfig
        _ <- validateConfigOrDie(config)
        licenseId <- ZIO.attempt(config.licenseId.getOrElse(desktopFreeLicenseId))
        licenseToken <- ZIO.attempt(config.licenseToken.getOrElse(desktopFreeLicenseToken))
        _ <- ZIO.attempt {
            val maskedToken = {
                val charsToMask = licenseToken.length - 4
                "*" * charsToMask + licenseToken.drop(charsToMask)
            }
            println(s"License ID: ${if licenseId.isEmpty || licenseId == desktopFreeLicenseId then "<not_provided>" else licenseId}")
            println(s"License Token: ${if licenseToken.isEmpty || licenseToken == desktopFreeLicenseToken then "<not_provided>" else maskedToken}")
        }
        _ <- ZIO.logInfo(s"Started at: ${java.time.Instant.now().toString}")
        
        config <- readConfig
        keygenClient <- ZIO.attempt {
            new KeygenClient(
                licenseToken = licenseToken,
                keygenApiUrl = KeygenApiUrl,
                keygenAccountId = KeygenAccountId
            )
        }
        keygenLicense <- keygenClient.validateLicense(licenseId)
        maybeProductInfo <- ZIO.attempt(AvailableLicenses.find(p => p.keygenProductId == keygenLicense.data.relationships.product.data.id))
        productInfo <- ZIO.whenCase(maybeProductInfo) {
            case Some(p) => ZIO.logInfo(s"License successfully validated. Starting ${p.productName}.").as(p)
            case _       => ZIO.fail(new Exception(s"Provided license doesn't match any product. Please contact support team at https://support.dekaf.com"))
        }.map(_.get)
        _ <- ZIO.succeed(Licensing.licenseInfo = productInfo)
        sessionFingerprint <- ZIO.attempt(UUID.randomUUID().toString)
        _ <- ZIO.logInfo(s"License session fingerprint: $sessionFingerprint")
        keygenMachine <- keygenClient
            .activateMachine(
                KeygenMachine(
                    data = KeygenMachineData(
                        id = None,
                        `type` = "machines",
                        attributes = KeygenMachineDataAttributes(
                            fingerprint = sessionFingerprint,
                            name = sessionFingerprint,
                            metadata = Map()
                        ),
                        relationships = KeygenMachineRelationships(
                            license = KeygenLinkage(
                                data = KeygenLinkageData(
                                    `type` = "licenses",
                                    id = keygenLicense.data.id.get
                                )
                            )
                        )
                    )
                )
            )
    } yield InitResult(keygenMachine, keygenClient, productInfo)

    def run(initResult: InitResult): Task[Unit] =
        startLicenseHeartbeatPing(initResult.keygenMachine.data.id.get)
            .ensuring(initResult.keygenClient.deactivateMachine(initResult.keygenMachine.data.id.get).orElseSucceed(()))

    private def startLicenseHeartbeatPing(keygenMachineId: String): Task[Unit] = for {
        config <- readConfig
        keygenClient <- ZIO.attempt {
            new KeygenClient(
                licenseToken = config.licenseToken.getOrElse(desktopFreeLicenseToken),
                keygenApiUrl = KeygenApiUrl,
                keygenAccountId = KeygenAccountId
            )
        }
        _ <- keygenClient
            .licenseHeartbeatPing(keygenMachineId)
            .repeat(Schedule.fixed(Duration.fromSeconds(20 * 60)))
    } yield ()
