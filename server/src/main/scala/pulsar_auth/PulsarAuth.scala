package pulsar_auth

import java.net.HttpCookie
import io.circe.*
import io.circe.parser.decode
import io.circe.Decoder.Result
import io.circe.syntax.*
import cats.syntax.functor.*
import io.circe.generic.auto.*
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import scala.jdk.CollectionConverters.*

type EmptyCredentialsType = "empty"
type OAuth2CredentialsType = "oauth2"
type JwtCredentialsType = "jwt"
type CredentialsType = EmptyCredentialsType | OAuth2CredentialsType | JwtCredentialsType

case class EmptyCredentials(
     `type`: EmptyCredentialsType,
)

given emptyCredentialsEncoder: Encoder[EmptyCredentials] = deriveEncoder[EmptyCredentials]
given emptyCredentialsDecoder: Decoder[EmptyCredentials] = deriveDecoder[EmptyCredentials]

case class OAuth2Credentials(
    `type`: EmptyCredentialsType,
    issuerUrl: String,
    privateKey: String,
    audience: Option[String],
    scope: Option[String]
)

given oauth2CredentialsEncoder: Encoder[OAuth2Credentials] = deriveEncoder[OAuth2Credentials]
given oauth2CredentialsDecoder: Decoder[OAuth2Credentials] = deriveDecoder[OAuth2Credentials]

case class JwtCredentials(
    `type`: JwtCredentialsType,
    token: String
)

given jwtCredentialsEncoder: Encoder[JwtCredentials] = deriveEncoder[JwtCredentials]
given jwtCredentialsDecoder: Decoder[JwtCredentials] = deriveDecoder[JwtCredentials]

type Credentials = EmptyCredentials | OAuth2Credentials | JwtCredentials

given credentialsEncoder: Encoder[Credentials] = Encoder.instance {
    case empty@EmptyCredentials(_) => empty.asJson
    case oauth2@OAuth2Credentials(_, _, _, _, _) => oauth2.asJson
    case jwt@JwtCredentials(_, _) => jwt.asJson
}

given credentialsDecoder: Decoder[Credentials] = List[Decoder[Credentials]](
    Decoder[EmptyCredentials].widen,
    Decoder[OAuth2Credentials].widen,
    Decoder[JwtCredentials].widen,
).reduceLeft(_ or _)

type CredentialsName = String
case class PulsarAuth(
    use: Option[String],
    credentials: Map[CredentialsName, Credentials]
)

val defaultPulsarAuth = PulsarAuth(credentials = Map.empty, use = None)

given pulsarAuthEncoder: Encoder[PulsarAuth] = deriveEncoder[PulsarAuth]
given pulsarAuthDecoder: Decoder[PulsarAuth] = deriveDecoder[PulsarAuth]

def parsePulsarAuthJson(json: Option[String]): Either[Throwable, PulsarAuth] =
    json match
        case None => Right(defaultPulsarAuth)
        case Some(v) =>
            decode[PulsarAuth](v) match
                case Left(err)       =>
                    println(s"Unable to parse cookie: ${err.getMessage}")
                    Left(new Exception(s"Unable to parse pulsar_auth cookie."))
                case Right(pulsarAuth) => Right(pulsarAuth)

def pulsarAuthToCookie(pulsarAuth: PulsarAuth): String =
    val cookieName = "pulsar_auth"
    val cookieValue = pulsarAuth.asJson.noSpaces
    s"${cookieName}=${cookieValue}; Path=/; HttpOnly; Secure"
