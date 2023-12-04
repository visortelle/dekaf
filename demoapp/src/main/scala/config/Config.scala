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
    pulsarBrokerUrl: Option[String],
    pulsarWebUrl: Option[String],
    auth: Option[AuthConfig]
)

val defaultConfig = Config(
    pulsarBrokerUrl = Some("pulsar://localhost:6650"),
    pulsarWebUrl = Some("http://localhost:8080"),
    auth = None
)

val yamlConfigDescriptor = descriptor[Config]
val envConfigDescriptor = descriptor[Config].mapKey(key => s"DEKAF_${toUpperSnakeCase(key)}")

def readConfig =
    for
        yamlConfigSource <- ZIO.attempt(YamlConfigSource.fromYamlPath(Path.of("./config.yaml")))
        envConfigSource <- ZIO.attempt(ConfigSource.fromSystemEnv(None, None))
        yamlConfig <- read(yamlConfigDescriptor.from(yamlConfigSource)).orElseSucceed(defaultConfig)
        envConfig <- read(envConfigDescriptor.from(envConfigSource))
        defaultConfig <- ZIO.succeed(defaultConfig)

        config <- ZIO.succeed {
            mergeConfigs(defaultConfig, mergeConfigs(envConfig, yamlConfig))
        }
    yield config

def readConfigAsync = Unsafe.unsafe(implicit unsafe => Runtime.default.unsafe.runToFuture(readConfig))

def toUpperSnakeCase(s: String) =
    s.replaceAll("([A-Z]+)([A-Z][a-z])", "$1_$2").replaceAll("([a-z\\d])([A-Z])", "$1_$2").toUpperCase
