package licensing.keygen

import io.circe.*
import io.circe.parser.parse
import io.circe.syntax.*
import zio.*
import zio.http.*

class KeygenClient(
    licenseToken: String,
    keygenApiUrl: String,
    keygenAccountId: String
):
    private val keygenApiBase = s"$keygenApiUrl/v1/accounts/$keygenAccountId"

    private val baseHeaders = Headers(
        Header.Custom("Content-Type", "application/vnd.api+json"),
        Header.Custom("Accept", "application/vnd.api+json")
    )
    private val authHeaders = Headers(Header.Authorization.Bearer(s"$licenseToken"))
    private val headers = baseHeaders ++ authHeaders

    def activateMachine(machine: KeygenMachine): ZIO[Client, Throwable, KeygenMachine] = for {
        _ <- ZIO.logInfo("Activating current application instance.")
        url <- ZIO.attempt(s"$keygenApiBase/machines")
        body <- ZIO.attempt(machine.asJson.toString)
        res <- Client.request(url, method = Method.POST, headers = headers, Body.fromString(body))
        data <- res.body.asString
        resultZIO =
            if res.status.isSuccess
            then ZIO.succeed(parse(data).getOrElse(Json.Null).as[KeygenMachine].toTry.get)
            else
                val errors = parse(data).getOrElse(Json.Null).as[KeygenErrorRes].toTry.get
                val errMessage =
                    if errors.errors.exists(err => err.code.getOrElse("") == "MACHINE_LIMIT_EXCEEDED")
                    then "Your license restricts the number of application instances that can run simultaneously, and this limit has been surpassed. You can increase the limit at https://pulsocat.com"
                    else data
                ZIO.fail(new Exception(errMessage))
        result <- resultZIO
        _ <- ZIO.logInfo(s"Current application instance successfully activated: ${result.data.id.get}.")
    } yield result

    def deactivateMachine(machineId: String): ZIO[Client, Throwable, Unit] = for {
        _ <- ZIO.logInfo(s"Deactivating current application instance: ${machineId}")
        url <- ZIO.attempt(s"$keygenApiBase/machines/${machineId}")
        res <- Client.request(url, method = Method.DELETE, headers = headers)
        data <- res.body.asString
        resultZIO =
            if res.status.isSuccess
            then ZIO.succeed(())
            else ZIO.fail(new Exception(data))
        result <- resultZIO
        _ <- ZIO.logInfo(s"Current application instance has been successfully unregistered.")
    } yield result

    def validateLicense(licenseId: String): ZIO[Client, Throwable, KeygenLicense] = for {
        _ <- ZIO.logInfo("Validating license.")
        url <- ZIO.attempt(s"$keygenApiBase/licenses/$licenseId/actions/validate")
        nonce <- Random.nextInt
        body <- ZIO.attempt(s"""
              |{
              |  "meta": {
              |    "nonce": $nonce
              |  }
              |}
              |""".stripMargin)
        res <- Client.request(url, method = Method.POST, headers, Body.fromString(body))
        data <- res.body.asString
        result <- ZIO.fromTry(parse(data).getOrElse(Json.Null).as[KeygenLicense].toTry)
    } yield result

    def licenseHeartbeatPing(machineId: String): ZIO[Client, Throwable, Unit] = for {
        _ <- ZIO.logDebug("License session heartbeat ping.")
        url <- ZIO.attempt(s"$keygenApiBase/machines/$machineId/actions/ping-heartbeat")
        res <- Client.request(url, method = Method.POST, headers)
        _ <- ZIO.whenCase(res.status) {
            case Status.Ok => ZIO.succeed(())
            case _ =>
                ZIO.logError("License session heartbeat failed. Exit 1") *>
                    ZIO.succeed(java.lang.System.exit(1))
        }
    } yield ()
