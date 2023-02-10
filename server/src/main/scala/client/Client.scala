package client

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.PulsarAdmin
import _root_.schema.Config as SchemaConfig

val config = Config(
  pulsarServiceUrl = "pulsar://localhost:6650",
  pulsarAdminUrl = "http://localhost:8080",
  schema = SchemaConfig(
    protobufNativeDepsDir = "/Users/visortelle/vcs/api-common-protos" // TODO - include to the app dist
  )
)

var clientBuilder = PulsarClient.builder().serviceUrl(config.pulsarServiceUrl)

val client = clientBuilder.build()

val adminClient = PulsarAdmin.builder().serviceHttpUrl(config.pulsarAdminUrl).build()
