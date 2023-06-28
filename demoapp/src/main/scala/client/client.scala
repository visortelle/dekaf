package client

import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.PulsarClient
import org.apache.pulsar.client.api.AuthenticationFactory
import _root_.config.config

val adminClient = PulsarAdmin.builder
  .serviceHttpUrl(config.webServiceUrl)
  .authentication(AuthenticationFactory.token(config.auth.jwt))
  .build

val pulsarClient = PulsarClient.builder
  .serviceUrl(config.brokerServiceUrl)
  .authentication(AuthenticationFactory.token(config.auth.jwt))
  .build
