package licensing.keygen

import io.circe.*
import io.circe.parser.parse
import io.circe.syntax.*
import zio.*
import zio.http.*

type KeygenProductShortName = "CE" | "SE" | "EE"
val KeygenProducts = Map[KeygenProductShortName, String](
    "CE" -> "da840454-c4a1-4655-ac5d-695e7621afd7", // Community Edition
    "SE" -> "7da73e26-c1bf-4aef-aca0-9bfb3bfc4f90", // Standard Edition
    "EE" -> "653220a5-a0d8-46ac-8a6a-ae5db2d46e8e" // Enterprise Edition
)

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
