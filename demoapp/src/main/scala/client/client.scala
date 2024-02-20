package client

import _root_.config.{readConfigAsync, AuthConfig, JwtConfig, OAuth2Config}
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{Authentication, AuthenticationFactory, PulsarClient}
import org.apache.pulsar.client.impl.auth.oauth2.AuthenticationFactoryOAuth2

import java.net.URI
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

val config = Await.result(readConfigAsync, Duration(10, SECONDS))

val authentication: Option[Authentication] = config.auth match
    case Some(AuthConfig(_, Some(JwtConfig(token)))) => Some(AuthenticationFactory.token(token))
    case Some(AuthConfig(Some(OAuth2Config(issuerUrl, privateKey, audience, scope)), _)) =>
        val auth = AuthenticationFactoryOAuth2.clientCredentials(
            new URI(issuerUrl).toURL,
            new URI(privateKey).toURL,
            audience.orNull,
            scope.orNull
        )
        Some(auth)
    case _ => None

val adminClient =
    val builder = PulsarAdmin.builder
        .serviceHttpUrl(config.pulsarWebUrl.get)
    authentication.foreach(builder.authentication)
    builder.build

val pulsarClient =
    val builder = PulsarClient.builder
        .serviceUrl(config.pulsarBrokerUrl.get)
        .connectionsPerBroker(16)
    authentication.foreach(builder.authentication)
    builder.build
