package pulsar_auth

import org.apache.pulsar.client.api.{AuthenticationFactory, ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.api.{ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminBuilder}
import _root_.schema.Config as SchemaConfig
import _root_.config.{readConfigAsync, Config}
import org.apache.pulsar.client.api.url.URL
import org.apache.pulsar.client.impl.auth.oauth2.AuthenticationFactoryOAuth2

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.util.{Failure, Success, Try}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))

def makeAdminClient(pulsarAuth: PulsarAuth): Either[Throwable, PulsarAdmin] =
    var builder = PulsarAdmin.builder.serviceHttpUrl(config.pulsarHttpUrl.get)

    builder = tls.configureAdminClient(builder, config)

    val pulsarCredentials = pulsarAuth.current match
        case None    => defaultPulsarAuth.credentials.get("Default")
        case Some(c) => pulsarAuth.credentials.get(c)
    pulsarCredentials match
        case None => Left(new Exception("No credentials found for Pulsar Admin"))
        case Some(c) =>
            c match
                case cr: JwtCredentials => builder.authentication(AuthenticationFactory.token(cr.token))
                case cr: OAuth2Credentials =>
                    builder.authentication(
                        AuthenticationFactoryOAuth2.clientCredentials(
                            URL.createURL(cr.issuerUrl),
                            URL.createURL(cr.privateKey),
                            cr.audience.orNull,
                            cr.scope.orNull
                        )
                    )
                case _ => Left(new Exception("Unsupported credentials type"))

    Try(builder.build) match {
        case Success(value)     => Right(value)
        case Failure(exception) => Left(new Exception("Wrong credentials for Pulsar Admin"))
    }

def makePulsarClient(pulsarAuth: PulsarAuth): Either[Throwable, PulsarClient] =
    var builder = PulsarClient.builder
        /* By default, for partitioned topics Pulsar client may use several threads.
        We use the "accum" js-var in for MessageFilter, to aggregate some value over consumed messages.
        GraalJS doesn't allow access to a single js variable across several JVM threads,
        so we need to use only one thread per client. */
        .listenerThreads(1)
        .ioThreads(1)
        .serviceUrl(config.pulsarBrokerUrl.get)

    builder = tls.configureClient(builder, config)

    val pulsarCredentials = pulsarAuth.current match
        case None    => defaultPulsarAuth.credentials.get("Default")
        case Some(c) => pulsarAuth.credentials.get(c)
    pulsarCredentials match
        case None => Left(new Exception("No credentials found for Pulsar Admin"))
        case Some(c) =>
            c match
                case cr: JwtCredentials => builder.authentication(AuthenticationFactory.token(cr.token))
                case cr: OAuth2Credentials =>
                    for
                        audience <- cr.audience
                        scope <- cr.scope
                    yield builder.authentication(
                        AuthenticationFactoryOAuth2.clientCredentials(
                            URL.createURL(cr.issuerUrl),
                            URL.createURL(cr.privateKey),
                            audience,
                            scope
                        )
                    )
                case _ => Left(new Exception("Unsupported credentials type"))

    Try(builder.build) match {
        case Success(value)     => Right(value)
        case Failure(exception) => Left(new Exception("Wrong credentials for Pulsar Client"))
    }
