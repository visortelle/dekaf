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
        url <- ZIO.attempt(s"$keygenApiBase/machines")
        res <- Client.request(url, method = Method.POST, headers = headers)
        data <- res.body.asString
        result <- ZIO.fromTry(parse(data).getOrElse(Json.Null).as[KeygenMachine].toTry)
    } yield result

    def validateLicense(licenseId: String, licenseToken: String): ZIO[Client, Throwable, KeygenLicense] = for {
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
