package pulsar_auth

import org.apache.pulsar.client.api.{AuthenticationFactory, ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.api.{ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminBuilder}
import _root_.schema.Config as SchemaConfig
import _root_.config.{Config, readConfigAsync}

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
            case cr: JwtCredentials => builder.authentication(AuthenticationFactory.token(cr.token))
            case _ => Left(new Exception("Unsupported credentials type"))

    Right(builder.build)

def makePulsarClient(pulsarAuth: PulsarAuth): Either[Throwable, PulsarClient] =
    var builder = PulsarClient.builder.serviceUrl(config.pulsarInstance.brokerServiceUrl)

    builder = config.tls match
        case Some(tlsConfig) => tls.configureClient(builder, tlsConfig)
        case None            => builder

    val pulsarCredentials = pulsarAuth.current match
        case None => defaultPulsarAuth.credentials.get("Default")
        case Some(c) => pulsarAuth.credentials.get(c)
    pulsarCredentials match
        case None => Left(new Exception("No credentials found for Pulsar Client"))
        case Some(c) => c match
            case cr: JwtCredentials => builder.authentication(AuthenticationFactory.token(cr.token))
            case _ => Left(new Exception(s"Unsupported credentials type"))

    Right(builder.build)
