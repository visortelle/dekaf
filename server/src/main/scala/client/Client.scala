package client

import org.apache.pulsar.client.api.{ClientBuilder, Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin, PulsarAdminBuilder}
import _root_.schema.Config as SchemaConfig
import _root_.config.{Config, readConfigAsync}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

def createClientBuilder(config: Config): ClientBuilder =
    var builder = PulsarClient.builder.serviceUrl(config.pulsarInstance.brokerServiceUrl)
    builder = config.tls match
        case Some(tlsConfig) => tls.configureClient(builder, tlsConfig)
        case None            => builder
    builder

val client =
    val config = Await.result(readConfigAsync, Duration(10, SECONDS))
    createClientBuilder(config).build

def createAdminClientBuilder(config: Config): PulsarAdminBuilder =
    var builder = PulsarAdmin.builder.serviceHttpUrl(config.pulsarInstance.webServiceUrl)
    builder = config.tls match
        case Some(tlsConfig) => tls.configureAdminClient(builder, tlsConfig)
        case None            => builder
    builder

val adminClient =
    val config = Await.result(readConfigAsync, Duration(10, SECONDS))
    createAdminClientBuilder(config).build
