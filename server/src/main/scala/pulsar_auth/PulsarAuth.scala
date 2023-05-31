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

case class EmptyCredentials(
     `type`: "empty",
)

given emptyCredentialsEncoder: Encoder[EmptyCredentials] = deriveEncoder[EmptyCredentials]
given emptyCredentialsDecoder: Decoder[EmptyCredentials] = deriveDecoder[EmptyCredentials]

case class OAuth2Credentials(
    `type`: "oauth2",
    issuerUrl: String,
    privateKey: String,
    audience: Option[String],
    scope: Option[String]
)

given oauth2CredentialsEncoder: Encoder[OAuth2Credentials] = deriveEncoder[OAuth2Credentials]
given oauth2CredentialsDecoder: Decoder[OAuth2Credentials] = deriveDecoder[OAuth2Credentials]

case class JwtCredentials(
    `type`: "jwt",
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
    credentials: Map[CredentialsName, Credentials]
)

given pulsarAuthEncoder: Encoder[PulsarAuth] = deriveEncoder[PulsarAuth]
given pulsarAuthDecoder: Decoder[PulsarAuth] = deriveDecoder[PulsarAuth]

def pulsarAuthFromCookie(cookieValue: Option[String]): Either[Throwable, PulsarAuth] =
    cookieValue match
        case None => Right(PulsarAuth(credentials = Map.empty))
        case Some(v) =>
            decode[PulsarAuth](v) match
                case Left(error)       => Left(new Exception(s"Unable to parse pulsar_auth cookie: $error"))
                case Right(pulsarAuth) => Right(pulsarAuth)

def pulsarAuthToCookie(pulsarAuth: PulsarAuth): String =
    val cookieName = "pulsar_auth"
    val cookieValue = pulsarAuth.asJson.noSpaces
    s"${cookieName}=${cookieValue}; Path=/; HttpOnly; Secure"
