package pulsar_auth

import org.apache.pulsar.client.api.{AuthenticationFactory, ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminBuilder}
import _root_.schema.Config as SchemaConfig
import _root_.config.{Config, readConfigAsync}
import _root_.client.tls

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))

def makeAdminClient(pulsarAuth: PulsarAuth): Either[Throwable, PulsarAdmin] =
    var builder = PulsarAdmin.builder.serviceHttpUrl(config.pulsarInstance.webServiceUrl)

    builder = config.tls match
        case Some(tlsConfig) => tls.configureAdminClient(builder, tlsConfig)
        case None            => builder

    val pulsarCredentials = pulsarAuth.current match
        case None => defaultPulsarAuth.credentials.get("Default")
        case Some(c) => pulsarAuth.credentials.get(c)
    pulsarCredentials match
        case None => Left(new Exception("No credentials found for Pulsar Admin"))
        case Some(c) => c match
            case cr: JwtCredentials => configureJwtAuth(builder, cr)

    Right(builder.build)

def configureJwtAuth(builder: PulsarAdminBuilder, credentials: JwtCredentials): PulsarAdminBuilder =
    builder.authentication(AuthenticationFactory.token(credentials.token))
