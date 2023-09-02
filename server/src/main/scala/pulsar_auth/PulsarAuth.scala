package pulsar_auth

import cats.syntax.functor.*
import io.circe.*
import io.circe.Decoder.Result
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.parser.decode
import io.circe.syntax.*
import org.apache.commons.codec.binary.Base64

import java.net.{URLDecoder, URLEncoder}
import java.nio.charset.StandardCharsets.UTF_8
import scala.util.matching.Regex

val DefaultCredentialsName = "Default"

val validCredentialsName: Regex = "^[a-zA-Z0-9_-]+$".r

type EmptyCredentialsType = "empty"
type OAuth2CredentialsType = "oauth2"
type JwtCredentialsType = "jwt"

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
                issuerUrl.matches("^(http://.*|https://.*)$"),
                (),
                DecodingFailure("Invalid issuer url format", cursor.history)
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
    credentials = getDefaultCredentialsFromConfig,
    current = Some("Default")
)

def getDefaultCredentialsFromConfig: Map[CredentialsName, Credentials] =
    val rawDefaultCredentials: Credentials = config.defaultPulsarAuth match
        case Some(jsonValue: String) =>
            decode[OAuth2Credentials](jsonValue)
                .orElse(decode[JwtCredentials](jsonValue))
                .getOrElse(EmptyCredentials(`type` = "empty"))
        case _ => EmptyCredentials(`type` = "empty")

    Map { "Default" -> rawDefaultCredentials }

def parsePulsarAuthCookie(json: Option[String]): Either[Throwable, PulsarAuth] =
    val clientPulsarAuth = json match
        case None => Right(defaultPulsarAuth)
        case Some(encodedValue) =>
            val v = URLDecoder.decode(encodedValue, UTF_8)

            decode[PulsarAuth](v) match
                case Left(err) =>
                    println(s"Unable to parse cookie: ${err.getMessage}")
                    Left(new Exception(s"Unable to parse pulsar_auth cookie."))
                case Right(pulsarAuth) => Right(
                    pulsarAuth
                )

    clientPulsarAuth

def pulsarAuthToCookie(pulsarAuth: PulsarAuth): String =
    val pulsarAuthWithoutEncodingMetadata = pulsarAuth.copy(
        credentials = pulsarAuth.credentials.map((name, credentials) => credentials match
            case cr: OAuth2Credentials => (
                name,
                cr.copy(
                    issuerUrl = URLEncoder.encode(cr.issuerUrl, UTF_8),
                    privateKey = URLEncoder.encode(cr.privateKey, UTF_8),
                    audience = cr.audience.map(audience => URLEncoder.encode(audience, UTF_8)),
                    scope = cr.scope.map(scope => URLEncoder.encode(scope, UTF_8))
                )
            )
            case _ => (name, credentials)
        )
    )

    val cookieName = "pulsar_auth"
    val cookieValue = pulsarAuthWithoutEncodingMetadata.asJson.noSpaces

    val cookiePath = config.publicBaseUrl.map({
        java.net.URI.create(_).getPath match
            case "" => "/"
            case path => path
    }).getOrElse("/")

    s"$cookieName=$cookieValue; Path=${cookiePath}; HttpOnly; Max-Age=31536000; "
