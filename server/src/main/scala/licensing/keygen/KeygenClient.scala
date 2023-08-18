package licensing.keygen

import io.circe.*
import io.circe.syntax.*
import sttp.client4
import sttp.client4.circe.*
import sttp.client4.httpclient.zio.*
import sttp.client4.{ResponseException, *}
import zio.*

class KeygenClient(
    licenseToken: String,
    keygenApiUrl: String,
    keygenAccountId: String
):
    private val keygenApiBase = s"$keygenApiUrl/v1/accounts/$keygenAccountId"
    private val headers = Map(
        "Content-Type" -> "application/vnd.api+json",
        "Accept" -> "application/vnd.api+json",
        "Authorization" -> s"Bearer $licenseToken"
    )

    def activateMachine(machine: KeygenMachine): Task[KeygenMachine] = for {
        _ <- ZIO.logInfo("Activating current application instance.")
        httpBackend <- HttpClientZioBackend()
        res <- basicRequest
            .post(uri"$keygenApiBase/machines")
            .headers(headers)
            .body(machine.asJson.toString)
            .response(asJsonEither[KeygenErrorRes, KeygenMachine].getEither)
            .send(httpBackend)
        resultZIO =
            res.body match
                case Left(err) =>
                    if err.errors.exists(err => err.code.getOrElse("") == "MACHINE_LIMIT_EXCEEDED")
                    then
                        val errMessage =
                            "Your license restricts the number of application instances that can run simultaneously, and this limit has been surpassed. You can increase the limit at https://pulsocat.com"
                        ZIO.fail(new Exception(errMessage))
                    else ZIO.fail(new Exception(err.errors.asJson.toString))
                case Right(v) => ZIO.succeed(v)
        result <- resultZIO
        _ <- ZIO.logInfo(s"Current application instance successfully activated: ${result.data.id.get}.")
    } yield result

    def deactivateMachine(machineId: String): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Deactivating current application instance: $machineId")
        httpBackend <- HttpClientZioBackend()
        res <- basicRequest
            .delete(uri"$keygenApiBase/machines/$machineId")
            .headers(headers)
            .response(asJsonEither[KeygenErrorRes, Unit])
            .send(httpBackend)
        resultZIO =
            if res.code.isSuccess
            then ZIO.succeed(())
            else ZIO.fail(new Exception("Failed to deactivate current application instance."))
        _ <- ZIO.logInfo(s"Current application instance has been successfully deactivated.")
        result <- resultZIO
    } yield result

    def validateLicense(licenseId: String): Task[KeygenLicense] = for {
        _ <- ZIO.logInfo("Validating license.")
        httpBackend <- HttpClientZioBackend()
        nonce <- Random.nextInt
        body <- ZIO.attempt(s"""
              |{
              |  "meta": {
              |    "nonce": $nonce
              |  }
              |}
              |""".stripMargin)
        res <- basicRequest
            .post(uri"$keygenApiBase/licenses/$licenseId/actions/validate")
            .headers(headers)
            .body(body)
            .response(asJsonEither[KeygenErrorRes, KeygenLicense])
            .send(httpBackend)
        result <- ZIO.fromEither(res.body)
    } yield result

    def licenseHeartbeatPing(machineId: String, onFail: Task[Unit]): Task[Unit] = for {
        _ <- ZIO.logInfo("License session heartbeat ping.")
        httpBackend <- HttpClientZioBackend()
        res <- basicRequest
            .post(uri"$keygenApiBase/machines/$machineId/actions/ping-heartbeat")
            .headers(headers)
            .send(httpBackend)
        _ <- onFail.unless(res.code.isSuccess)
    } yield ()
