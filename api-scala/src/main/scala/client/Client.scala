package client

import org.apache.pulsar.client.api.{Consumer, MessageListener, PulsarClient}
import org.apache.pulsar.client.admin.{PulsarAdmin}

case class Config(pulsarServiceUrl: String, pulsarAdminUrl: String, grpcPort: Int)
val config = Config(
    pulsarServiceUrl = "pulsar://localhost:6650",
    pulsarAdminUrl = "http://localhost:8080",
    grpcPort = 8090
)
val client = PulsarClient.builder().serviceUrl(config.pulsarServiceUrl).build()
val adminClient = PulsarAdmin.builder().serviceHttpUrl(config.pulsarAdminUrl).build()
