package pulsar_auth

import cats.syntax.functor.*
import io.circe.*
import io.circe.Decoder.Result
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.parser.decode
import io.circe.syntax.*

import java.net.{URLDecoder, URLEncoder}
import java.nio.charset.StandardCharsets.UTF_8
import scala.jdk.CollectionConverters.*
import scala.util.matching.Regex


val validCredentialsName: Regex = "^[a-zA-Z0-9_-]+$".r

type EmptyCredentialsType = "empty"
type OAuth2CredentialsType = "oauth2"
type JwtCredentialsType = "jwt"

type DefaultCredentialsName = "Default" | "DefaultOAuth2" | "DefaultJwt"

type CredentialsName = String
type CredentialsType = EmptyCredentialsType | OAuth2CredentialsType | JwtCredentialsType
type Credentials = EmptyCredentials | OAuth2Credentials | JwtCredentials

case class EmptyCredentials(
    `type`: EmptyCredentialsType
)
case class OAuth2Credentials(
                                `type`: OAuth2CredentialsType,
                                issuerUrl: String,
                                privateKey: String,
                                audience: Option[String],
                                scope: Option[String]
)

case class JwtCredentials(
                             `type`: JwtCredentialsType,
                             token: String
)

case class PulsarAuth(
                         current: Option[String],
                         credentials: Map[CredentialsName, Credentials]
)

given emptyCredentialsEncoder: Encoder[EmptyCredentials] = deriveEncoder[EmptyCredentials]
given emptyCredentialsDecoder: Decoder[EmptyCredentials] = deriveDecoder[EmptyCredentials]

given oauth2CredentialsEncoder: Encoder[OAuth2Credentials] = deriveEncoder[OAuth2Credentials]
given oauth2CredentialsDecoder: Decoder[OAuth2Credentials] = Decoder.instance:
    cursor =>
        for
            issuerUrl <- cursor.downField("issuerUrl").as[String]
            _ <- Either.cond(
                issuerUrl.matches("^https?://.*$"),
                (),
                DecodingFailure("Invalid issuerUrl format", cursor.history)
            )
            privateKey <- cursor.downField("privateKey").as[String]
            audience <- cursor.downField("audience").as[Option[String]]
            scope <- cursor.downField("scope").as[Option[String]]
        yield OAuth2Credentials(
            `type` = "oauth2",
            issuerUrl = issuerUrl,
            privateKey = privateKey,
            audience = audience,
            scope = scope
        )


given jwtCredentialsEncoder: Encoder[JwtCredentials] = deriveEncoder[JwtCredentials]
given jwtCredentialsDecoder: Decoder[JwtCredentials] = Decoder.instance:
    cursor =>
        for
            token <- cursor.downField("token").as[String]
            _ <- Either.cond(
                token.matches("^[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*$"),
                (),
                DecodingFailure("Invalid JWT token format", cursor.history)
            )
        yield JwtCredentials(`type` = "jwt", token = token)

given credentialsEncoder: Encoder[Credentials] = Encoder.instance {
    case c: EmptyCredentials  => c.asJson
    case c: OAuth2Credentials => c.asJson
    case c: JwtCredentials    => c.asJson
}

given credentialsDecoder: Decoder[Credentials] = Decoder.instance:
    cursor =>
            val decoders = List[Decoder[Credentials]](
                Decoder[EmptyCredentials].widen,
                Decoder[OAuth2Credentials].widen,
                Decoder[JwtCredentials].widen
            )

            decoders
                .map(decoder => decoder.tryDecode(cursor))
                .collectFirst { case Right(value) => Right(value) }
                .getOrElse(Left(DecodingFailure("Incorrect credentials provided.", cursor.history)))

given pulsarAuthEncoder: Encoder[PulsarAuth] = deriveEncoder[PulsarAuth]
given pulsarAuthDecoder: Decoder[PulsarAuth] = deriveDecoder[PulsarAuth]

val defaultPulsarAuth = PulsarAuth(
    credentials = Map("Default" -> EmptyCredentials(`type` = "empty")),
    current = Some("Default")
)

def parsePulsarAuthJson(json: Option[String]): Either[Throwable, PulsarAuth] =
    json match
        case None => Right(defaultPulsarAuth)
        case Some(encodedValue) =>
            val v = URLDecoder.decode(encodedValue, UTF_8)

            decode[PulsarAuth](v) match
                case Left(err) =>
                    println(s"Unable to parse cookie: ${err.getMessage}")
                    Left(new Exception(s"Unable to parse pulsar_auth cookie."))
                case Right(pulsarAuth) => Right(
                    PulsarAuth(
                        current = pulsarAuth.current,
                        credentials = pulsarAuth.credentials.map((name, credentials) => credentials match
                            case cr: EmptyCredentials => (name, cr)
                            case cr: OAuth2Credentials => (
                                name,
                                cr.copy(
                                    issuerUrl = URLDecoder.decode(cr.issuerUrl, UTF_8),
                                    privateKey = "data:application/json;base64," + URLDecoder.decode(cr.privateKey, UTF_8),
                                    audience = cr.audience.map(audience => URLDecoder.decode(audience, UTF_8)),
                                    scope = cr.scope.map(scope => URLDecoder.decode(scope, UTF_8))
                                )
                            )
                            case cr: JwtCredentials => (name, cr)
                        )
                    )
                )

def pulsarAuthToCookie(pulsarAuth: PulsarAuth): String =
    val pulsarAuthWithoutEncodingMetadata = pulsarAuth.copy(
        credentials = pulsarAuth.credentials.map((name, credentials) => credentials match
            case cr: OAuth2Credentials => (
                name,
                cr.copy(
                    issuerUrl = URLEncoder.encode(cr.issuerUrl, UTF_8),
                    privateKey = URLEncoder.encode(cr.privateKey.replace("data:application/json;base64,", ""), UTF_8),
                    audience = cr.audience.map(audience => URLEncoder.encode(audience, UTF_8)),
                    scope = cr.scope.map(scope => URLEncoder.encode(scope, UTF_8))
                )
            )
            case _ => (name, credentials)
        )
    )

    val cookieName = "pulsar_auth"
    val cookieValue = pulsarAuthWithoutEncodingMetadata.asJson.noSpaces

    // TODO - set secure flag when https is enabled
    s"$cookieName=$cookieValue; Path=/; HttpOnly; Max-Age=31536000; "
