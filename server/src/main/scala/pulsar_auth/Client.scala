package pulsar_auth

import _root_.config.readConfigAsync
import io.netty.channel.epoll.EpollEventLoopGroup
import io.netty.channel.EventLoopGroup
import io.netty.channel.nio.NioEventLoopGroup
import io.netty.util.HashedWheelTimer
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.url.URL
import org.apache.pulsar.client.api.{AuthenticationFactory, PulsarClient}
import org.apache.pulsar.client.impl.PulsarClientImpl
import org.apache.pulsar.client.impl.auth.oauth2.AuthenticationFactoryOAuth2
import org.apache.pulsar.client.impl.conf.ClientConfigurationData
import org.apache.pulsar.client.util.{ExecutorProvider, ScheduledExecutorProvider}

import java.util.concurrent.TimeUnit
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}
import scala.util.{Failure, Success, Try}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))

// See https://github.com/tealtools/pulsar-ui/issues/198
def getThreadFactory(poolName: String) =
    new ExecutorProvider.ExtendedThreadFactory(poolName, Thread.currentThread().isDaemon)
val sharedTimer = new HashedWheelTimer(getThreadFactory("shared-pulsar-timer"), 1, TimeUnit.MILLISECONDS)

def makePulsarAdmin(pulsarAuth: PulsarAuth): Either[Throwable, PulsarAdmin] =
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
    val pulsarClientConfig = ClientConfigurationData()

    /* By default, for partitioned topics Pulsar client may use several threads.
    We use the "accum" js-var in for MessageFilter, to aggregate some value over consumed messages.
    GraalJS doesn't allow access to a single js variable across several JVM threads,
    so we need to use only one thread per client. */
    pulsarClientConfig.setNumIoThreads(1)
    pulsarClientConfig.setNumListenerThreads(1)
    pulsarClientConfig.setConnectionsPerBroker(1)

    pulsarClientConfig.setServiceUrl(config.pulsarBrokerUrl.get)

    tls.configureClient(pulsarClientConfig, config)

    configureAuth(pulsarAuth, pulsarClientConfig)

    // We create a single thread for each client to avoid problems with GraalJS.
    val internalExecutorProvider = ExecutorProvider(1, "shared-internal-executor")
    val externalExecutorProvider = ExecutorProvider(1, "shared-external-executor")
    val scheduledExecutorProvider = ScheduledExecutorProvider(1, "scheduled-pulsar-executor")
    val sharedEventLoopGroup: EventLoopGroup = if org.apache.commons.lang3.SystemUtils.IS_OS_LINUX
        then new EpollEventLoopGroup() // better performance on Linux
        else new NioEventLoopGroup()

    val builder = PulsarClientImpl.builder
        .conf(pulsarClientConfig)
        .internalExecutorProvider(internalExecutorProvider)
        .externalExecutorProvider(externalExecutorProvider)
        .scheduledExecutorProvider(scheduledExecutorProvider)
        .timer(sharedTimer)
        .eventLoopGroup(sharedEventLoopGroup)

    Try(builder.build) match {
        case Success(value)     => Right(value)
        case Failure(exception) => Left(new Exception("Wrong credentials for Pulsar Client"))
    }

def configureAuth(pulsarAuth: PulsarAuth, pulsarClientConfig: ClientConfigurationData) =
    val pulsarCredentials = pulsarAuth.current match
        case None => defaultPulsarAuth.credentials.get("Default")
        case Some(c) => pulsarAuth.credentials.get(c)
    pulsarCredentials match
        case None => Left(new Exception("No credentials found for Pulsar Admin"))
        case Some(c) =>
            c match
                case cr: JwtCredentials => pulsarClientConfig.setAuthentication(AuthenticationFactory.token(cr.token))
                case cr: OAuth2Credentials =>
                    pulsarClientConfig.setAuthentication(
                        AuthenticationFactoryOAuth2.clientCredentials(
                            URL.createURL(cr.issuerUrl),
                            URL.createURL(cr.privateKey),
                            cr.audience.orNull,
                            cr.scope.orNull
                        )
                    )
                case _ => Left(new Exception("Unsupported credentials type"))
