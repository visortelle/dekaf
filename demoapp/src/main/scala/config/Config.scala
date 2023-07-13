package config

import zio.*
import zio.config.*
import zio.config.ConfigDescriptor
import zio.config.ConfigSource
import zio.config.magnolia.{describe, descriptor}
import zio.config.typesafe.{configValueConfigDescriptor, TypesafeConfig}
import zio.config.yaml.{YamlConfig, YamlConfigSource}

import java.nio.file.Path

case class OAuth2Config(
    issuerUrl: String,
    privateKey: String,
    audience: Option[String],
    scope: Option[String]
)

case class JwtConfig(token: String)

case class AuthConfig(oauth2: Option[OAuth2Config], jwt: Option[JwtConfig])

case class Config(
    brokerServiceUrl: String,
    webServiceUrl: String,
    auth: Option[AuthConfig] = None
)

val defaultConfig = Config(
    brokerServiceUrl = "pulsar://localhost:6650",
    webServiceUrl = "http://localhost:8080",
    auth = None
)

val configDescriptor = descriptor[Config].default(defaultConfig)

val configSource = YamlConfigSource.fromYamlPath(Path.of("./config.yaml"))

def readConfig =
    for config <- read(configDescriptor from configSource)
    yield config

def readConfigAsync = Unsafe.unsafe(implicit unsafe => Runtime.default.unsafe.runToFuture(readConfig))
