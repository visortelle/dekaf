package licensing

import zio.*
import keygen.{KeygenClient, *}

import java.util.UUID
import _root_.config.readConfig

import java.time.ZoneOffset
import java.time.temporal.ChronoField

val KeygenAccountId = "add36df4-cf52-4909-b352-51318cb23d99"
val KeygenApiUrl = "https://api.keygen.sh"

val Graffiti =
    """
      |██████  ███████ ██   ██  █████  ███████
      |██   ██ ██      ██  ██  ██   ██ ██
      |██   ██ █████   █████   ███████ █████
      |██   ██ ██      ██  ██  ██   ██ ██
      |██████  ███████ ██   ██ ██   ██ ██
      |for Apache Pulsar
      |""".stripMargin.replace("$", "▓")

object LicenseServer:
    case class InitResult(
        keygenMachine: KeygenMachine,
        keygenClient: KeygenClient
    )

    def init: Task[InitResult] = for {
        _ <- ZIO.attempt {
            println(Graffiti)
            println(
                s"Teal Tools Inc. Wilmington, Delaware, U.S. ${java.time.Instant.ofEpochMilli(buildinfo.BuildInfo.builtAtMillis).atZone(ZoneOffset.UTC).getYear}"
            )
            println(s"Product: ${buildinfo.BuildInfo.name} ${buildinfo.BuildInfo.version}")
            println(s"Built at: ${buildinfo.BuildInfo.builtAtString}")
            println(s"You can get help here: support@teal.tools")
            println(s"More products: https://teal.tools")
            println(s"More info about this product: https://dekaf.io")
        }
        config <- readConfig
        _ <- validateConfigOrDie(config)
        licenseId <- ZIO.attempt(config.licenseId.get)
        licenseToken <- ZIO.attempt(config.licenseToken.get)
        _ <- ZIO.attempt {
            val maskedToken = {
                val charsToMask = licenseToken.length - 4
                "*" * charsToMask + licenseToken.drop(charsToMask)
            }
            println(s"License ID: $licenseId")
            println(s"License Token: $maskedToken")
        }
        _ <- ZIO.logInfo(s"Started at: ${java.time.Instant.now().toString}")
        config <- readConfig
        keygenClient <- ZIO.attempt {
            new KeygenClient(
                licenseToken = config.licenseToken.get,
                keygenApiUrl = KeygenApiUrl,
                keygenAccountId = KeygenAccountId
            )
        }
        keygenLicense <- keygenClient.validateLicense(licenseId)
        product <- ZIO.attempt(ProductFamily.find(p => p.keygenProductId == keygenLicense.data.relationships.product.data.id))
        _ <- ZIO.whenCase(product) {
            case Some(p) => ZIO.logInfo(s"License successfully validated. Starting ${p.name}.")
            case _       => ZIO.logError(s"Provided license doesn't match any product. Please contact support team at https://support.dekaf.com")
        }
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
    } yield InitResult(keygenMachine, keygenClient)

    def run(initResult: InitResult): Task[Unit] =
        startLicenseHeartbeatPing(initResult.keygenMachine.data.id.get)
            .ensuring(initResult.keygenClient.deactivateMachine(initResult.keygenMachine.data.id.get).orElseSucceed(()))

    private def startLicenseHeartbeatPing(keygenMachineId: String): Task[Unit] = for {
        config <- readConfig
        keygenClient <- ZIO.attempt {
            new KeygenClient(
                licenseToken = config.licenseToken.get,
                keygenApiUrl = KeygenApiUrl,
                keygenAccountId = KeygenAccountId
            )
        }
        _ <- keygenClient
            .licenseHeartbeatPing(keygenMachineId)
            .repeat(Schedule.fixed(Duration.fromSeconds(15 * 60)))
    } yield ()
