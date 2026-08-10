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
                    // The circe message must stay OUT of the log: for malformed JSON, jawn's
                    // message quotes the raw input at the failure offset (`expected : got
                    // '"eyJhb...'`), and a decode failure's message carries the cursor path -
                    // i.e. the credential names. The input here is the credential cookie
                    // (tokens, private keys), so log only the failure kind and position.
                    val safeDetail = err match
                        case ParsingFailure(_, cause: org.typelevel.jawn.ParseException) =>
                            s"not valid JSON (line ${cause.line}, column ${cause.col})"
                        case _: ParsingFailure  => "not valid JSON"
                        case _: DecodingFailure => "valid JSON, but not a valid PulsarAuth document"
                    logger.warn(s"Unable to parse cookie: $safeDetail")
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
    val cookieName = "pulsar_auth"

    // The ENTIRE serialized JSON is URL-encoded here, exactly once; parsePulsarAuthCookie
    // URL-decodes the whole value exactly once. A lossless pair, with no raw remainder that
    // could terminate the header value.
    //
    // The previous scheme encoded individual FIELDS (the OAuth2 fields and authParams) and wrote
    // the surrounding JSON raw - but JSON does not escape `;`, and two strings travel here that
    // are not charset-validated anywhere: `authPluginClassName` (free text from the
    // /pulsar-auth/add BODY; only the name path segment is validated) and the credential NAMES
    // (parsePulsarAuthCookie accepts any keys from a hand-crafted cookie, and
    // setCookieAndSuccess echoes them back). A `;` in either truncated the stored cookie at the
    // browser - the next request failed to parse, a silent credential corruption - and promoted
    // the remainder to REAL cookie attributes (`Domain=evil.example`). setCookieAndSuccess also
    // re-injects the operator-configured Default credentials into every response, so one bad
    // configured value rewrote the Set-Cookie header for every user.
    //
    // Legacy cookies written by the per-field scheme still parse: the read path is unchanged,
    // and a legacy value is raw JSON whose only `%xx`/`+` sequences sit inside the fields the
    // old writer encoded - one whole-value decode yields exactly what the old reader saw.
    val cookieValue = URLEncoder.encode(pulsarAuth.asJson.noSpaces, UTF_8)

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
