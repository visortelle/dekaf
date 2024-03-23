package pulsar_auth

import cats.syntax.functor.*
import com.typesafe.scalalogging.Logger
import io.circe.*
import io.circe.Decoder.Result
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.parser.decode
import io.circe.syntax.*
import io.javalin.http.{Cookie, SameSite}

import java.net.{URLDecoder, URLEncoder}
import java.nio.charset.StandardCharsets.UTF_8
import scala.util.matching.Regex

val DefaultCredentialsName = "Default"

val validCredentialsName: Regex = "^[a-zA-Z0-9_-]+$".r

type EmptyCredentialsType = "empty"
type OAuth2CredentialsType = "oauth2"
type JwtCredentialsType = "jwt"
type AuthParamsStringCredentialsType = "authParamsString"

type CredentialsName = String
type CredentialsType = EmptyCredentialsType | OAuth2CredentialsType | JwtCredentialsType | AuthParamsStringCredentialsType
type Credentials = EmptyCredentials | OAuth2Credentials | JwtCredentials | AuthParamsStringCredentials

val logger = Logger("pulsar-auth")

case class EmptyCredentials(
    `type`: EmptyCredentialsType = "empty"
)

case class OAuth2Credentials(
    `type`: OAuth2CredentialsType = "oauth2",
    issuerUrl: String,
    privateKey: String,
    audience: Option[String],
    scope: Option[String]
)

case class JwtCredentials(
    `type`: JwtCredentialsType = "jwt",
    token: String
)

case class AuthParamsStringCredentials(
    `type`: AuthParamsStringCredentialsType = "authParamsString",
    authPluginClassName: String,
    authParams: String
)

case class PulsarAuth(
    current: Option[String],
    credentials: Map[CredentialsName, Credentials]
)

given emptyCredentialsEncoder: Encoder[EmptyCredentials] = deriveEncoder[EmptyCredentials]
given emptyCredentialsDecoder: Decoder[EmptyCredentials] = deriveDecoder[EmptyCredentials]

given oauth2CredentialsEncoder: Encoder[OAuth2Credentials] = deriveEncoder[OAuth2Credentials]
given oauth2CredentialsDecoder: Decoder[OAuth2Credentials] = Decoder.instance: cursor =>
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
        issuerUrl = issuerUrl,
        privateKey = privateKey,
        audience = audience,
        scope = scope
    )

given jwtCredentialsEncoder: Encoder[JwtCredentials] = deriveEncoder[JwtCredentials]
given jwtCredentialsDecoder: Decoder[JwtCredentials] = Decoder.instance: cursor =>
    for
        token <- cursor.downField("token").as[String]
        _ <- Either.cond(
            token.matches("^[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*$"),
            (),
            DecodingFailure("Invalid JWT token format", cursor.history)
        )
    yield JwtCredentials(token = token)

given authParamsStringCredentialsEncoder: Encoder[AuthParamsStringCredentials] = deriveEncoder[AuthParamsStringCredentials]
given authParamsStringCredentialsDecoder: Decoder[AuthParamsStringCredentials] = deriveDecoder[AuthParamsStringCredentials]

given credentialsEncoder: Encoder[Credentials] = Encoder.instance {
    case c: EmptyCredentials            => c.asJson
    case c: OAuth2Credentials           => c.asJson
    case c: JwtCredentials              => c.asJson
    case c: AuthParamsStringCredentials => c.asJson
}

given credentialsDecoder: Decoder[Credentials] = Decoder.instance: cursor =>
    val decoders = List[Decoder[Credentials]](
        Decoder[EmptyCredentials].widen,
        Decoder[OAuth2Credentials].widen,
        Decoder[JwtCredentials].widen,
        Decoder[AuthParamsStringCredentials].widen
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
                .getOrElse(EmptyCredentials())
        case _ => EmptyCredentials()

    Map("Default" -> rawDefaultCredentials)

def pulsarAuthFromCookie(json: Option[String]): Either[Throwable, PulsarAuth] =
    val clientPulsarAuth = json match
        case None => Right(defaultPulsarAuth)
        case Some(encodedValue) =>
            val urlDecodedPulsarAuth = URLDecoder.decode(encodedValue, UTF_8)

            decode[PulsarAuth](urlDecodedPulsarAuth) match
                case Left(err) =>
                    logger.warn(s"Unable to parse cookie: ${err.getMessage}")
                    Left(new Exception(s"Unable to parse pulsar_auth cookie."))
                case Right(pulsarAuth) => Right(pulsarAuth)

    clientPulsarAuth

def pulsarAuthToCookie(pulsarAuth: PulsarAuth): Cookie =
    def withNewDefaultAuth(pulsarAuth: PulsarAuth): PulsarAuth =
        // Dekaf admin can change default credentials,
        // so we need deliver new default credentials to users.
        pulsarAuth.copy(credentials =
            pulsarAuth.credentials + (
                DefaultCredentialsName -> defaultPulsarAuth.credentials(DefaultCredentialsName)
                )
        )

    val pulsarAuthJson = withNewDefaultAuth(pulsarAuth).asJson.noSpaces
    val encodedPulsarAuth = URLEncoder.encode(pulsarAuthJson, UTF_8)

    val cookieName = "pulsar_auth"
    val cookieValue = encodedPulsarAuth
    val cookiePath = config.publicBaseUrl.map { url =>
        java.net.URI.create(url).getPath match
            case ""   => "/"
            case path => path
    }.getOrElse("/")
    val maxAge: Int = 31536000
    val isSecureCookie = config.cookieSecure.getOrElse(false)
    val protocolVersion = 0
    val isHttpOnly = true
    val sameSite = (config.cookieSecure, config.cookieSameSite) match
        case (_, Some("lax")) => SameSite.LAX
        case (_, Some("strict")) => SameSite.STRICT
        case (Some(true), Some("none")) => SameSite.NONE
        case _ => SameSite.LAX

    Cookie(
        cookieName,
        cookieValue,
        cookiePath,
        maxAge,
        isSecureCookie,
        protocolVersion,
        isHttpOnly,
        null,
        null,
        sameSite
    )
