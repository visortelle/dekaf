package pulsar_auth

import cats.syntax.functor.*
import io.circe.*
import io.circe.Decoder.Result
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.parser.decode
import io.circe.syntax.*
import org.apache.commons.codec.binary.Base64
import com.typesafe.scalalogging.Logger

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

case class AuthParamsStringCredentials(
    `type`: AuthParamsStringCredentialsType,
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
        `type` = "oauth2",
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
    yield JwtCredentials(`type` = "jwt", token = token)

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
                .orElse(decode[AuthParamsStringCredentials](jsonValue))
                .getOrElse(EmptyCredentials(`type` = "empty"))
        case _ => EmptyCredentials(`type` = "empty")

    Map("Default" -> rawDefaultCredentials)

def parsePulsarAuthCookie(json: Option[String]): Either[Throwable, PulsarAuth] =
    val clientPulsarAuth = json match
        case None => Right(defaultPulsarAuth)
        case Some(encodedValue) =>
            // URLDecoder throws IllegalArgumentException on malformed percent-encoding ("%", "%ZZ",
            // "a%2"), and it used to sit OUTSIDE this Either - so a hand-edited cookie produced a
            // server error instead of the intended 400.
            val v =
                try URLDecoder.decode(encodedValue, UTF_8)
                catch
                    case err: IllegalArgumentException =>
                        logger.warn(s"Malformed percent-encoding in cookie: ${err.getMessage}")
                        return Left(new Exception("Unable to parse pulsar_auth cookie."))

            decode[PulsarAuth](v) match
                case Left(err) =>
                    logger.warn(s"Unable to parse cookie: ${err.getMessage}")
                    Left(new Exception(s"Unable to parse pulsar_auth cookie."))
                case Right(pulsarAuth) => Right(
                        pulsarAuth
                    )

    clientPulsarAuth

/** The cookie-hardening inputs are parameters (defaulting to the process config, so the single
  * production call site is unchanged) purely so they can be varied in tests - the package-level
  * `config` val is loaded once per process and cannot be. */
def pulsarAuthToCookie(
    pulsarAuth: PulsarAuth,
    publicBaseUrl: Option[String] = config.publicBaseUrl,
    cookieSecure: Option[Boolean] = config.cookieSecure,
    cookieSameSite: Option[String] = config.cookieSameSite
): String =
    val pulsarAuthWithoutEncodingMetadata = pulsarAuth.copy(
        credentials = pulsarAuth.credentials.map((name, credentials) =>
            credentials match
                case cr: OAuth2Credentials => (
                        name,
                        cr.copy(
                            issuerUrl = URLEncoder.encode(cr.issuerUrl, UTF_8),
                            privateKey = URLEncoder.encode(cr.privateKey, UTF_8),
                            audience = cr.audience.map(audience => URLEncoder.encode(audience, UTF_8)),
                            scope = cr.scope.map(scope => URLEncoder.encode(scope, UTF_8))
                        )
                    )
                // parsePulsarAuthCookie URL-DECODES the whole cookie value, so anything written
                // raw comes back mangled: a `+` in authParams turned into a space and `%xx` was
                // eaten. authParams carries tokens/passwords, so encode it like the OAuth2 fields.
                case cr: AuthParamsStringCredentials => (
                        name,
                        cr.copy(authParams = URLEncoder.encode(cr.authParams, UTF_8))
                    )
                case _ => (name, credentials)
        )
    )

    val cookieName = "pulsar_auth"
    val cookieValue = pulsarAuthWithoutEncodingMetadata.asJson.noSpaces

    val cookiePath = publicBaseUrl.map {
        java.net.URI.create(_).getPath match
            case ""   => "/"
            case path => path
    }.getOrElse("/")

    val cookieSecureValue = cookieSecure match
        case Some(true) => "Secure; "
        case _          => ""

    s"$cookieName=$cookieValue; Path=$cookiePath; HttpOnly; Max-Age=31536000; $cookieSecureValue${sameSiteAttribute(cookieSecure, cookieSameSite)}"

/** Render the SameSite attribute, the cookie's built-in CSRF control.
  *
  * The value is matched case-insensitively and trimmed: it arrives from a YAML key or the
  * DEKAF_COOKIE_SAME_SITE environment variable, where `Lax`, `STRICT` and a stray trailing space are
  * all ordinary things for an operator to write. A strict lowercase match silently fell through to
  * "", emitting NO SameSite attribute at all - so a capitalised value looked configured but left the
  * cookie on the browser default. Anything still unrecognised after normalisation is logged loudly
  * for the same reason: dropping the attribute must never be the quiet outcome of a typo.
  */
def sameSiteAttribute(cookieSecure: Option[Boolean], cookieSameSite: Option[String]): String =
    cookieSameSite.map(_.trim.toLowerCase) match
        case None | Some("") => ""
        case Some("lax")     => "SameSite=Lax; "
        case Some("strict")  => "SameSite=Strict; "
        case Some("none") =>
            // Browsers reject SameSite=None unless the cookie is also Secure, so emitting it on a
            // plain-HTTP deployment would drop the cookie entirely and break auth.
            if cookieSecure.contains(true) then "SameSite=None; "
            else
                logger.warn("cookieSameSite=none requires cookieSecure=true; omitting SameSite (browsers reject None without Secure).")
                ""
        case Some(other) =>
            logger.warn(s"Unknown cookieSameSite value '$other' (expected lax, strict or none); omitting SameSite.")
            ""
