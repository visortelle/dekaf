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

case class ProducerLoadMultipliersConfig(
  @describe("Base multiplier for all producers. If not set, will be set to 1.0")
  baseMultiplier: Option[Double],
  @describe("Multiplier for producers for topics with the highest amount of messages/s. If not set, will be set to 1.0")
  overloaded: Option[Double],
  @describe("Multiplier for producers with the high amount of messages/s. If not set, will be set to 1.0")
  heavilyLoaded: Option[Double],
  @describe("Multiplier for producers with the moderate amount of messages/s. If not set, will be set to 1.0")
  moderatelyLoaded: Option[Double],
  @describe("Multiplier for producers with the low amount of messages/s. If not set, will be set to 1.0")
  lightlyLoaded: Option[Double],
)

case class TopicSubscriptionAmountConfig(
  @describe("Amount of subscriptions for topic category with the highest amount of messages/s. If not set, will be random in range [1, 5]")
  overloaded: Option[Int],
  @describe("Amount of subscriptions for topic category with the high amount of messages/s. If not set, will be random in range [1, 5]")
  heavilyLoaded: Option[Int],
  @describe("Amount of subscriptions for topic category with the moderate amount of messages/s. If not set, will be random in range [1, 5]")
  moderatelyLoaded: Option[Int],
  @describe("Amount of subscriptions for topic category with the low amount of messages/s. If not set, will be random in range [1, 5]")
  lightlyLoaded: Option[Int],
)

case class TopicConsumersAmountConfig(
  @describe("Amount of consumers for subscriptions for topic category with the highest amount of messages/s. If not set, will be random in range [1, 10]")
  overloaded: Option[Int],
  @describe("Amount of consumers for subscriptions for topic category with the high amount of messages/s. If not set, will be random in range [1, 10]")
  heavilyLoaded: Option[Int],
  @describe("Amount of consumers for subscriptions for topic category with the moderate amount of messages/s. If not set, will be random in range [1, 10]")
  moderatelyLoaded: Option[Int],
  @describe("Amount of consumers for subscriptions for topic category with the low amount of messages/s. If not set, will be random in range [1, 10]")
  lightlyLoaded: Option[Int],
)

case class TopicProducersAmountConfig(
  @describe("Amount of producers for topic category with the highest amount of messages/s. If not set, will be always 1")
  overloaded: Option[Int],
  @describe("Amount of producers for topic category with the high amount of messages/s. If not set, will be always 1")
  heavilyLoaded: Option[Int],
  @describe("Amount of producers for topic category with the moderate amount of messages/s. If not set, will be always 1")
  moderatelyLoaded: Option[Int],
  @describe("Amount of producers for topic category with the low amount of messages/s. If not set, will be always 1")
  lightlyLoaded: Option[Int],
)

case class LoadConfig(
  @describe("Toggle option for enabling/disabling non-persistent topics")
  enableNonPersistentTopics: Option[Boolean],
  @describe("Toggle option for enabling/disabling partitioned topics")
  enablePartitionedTopics: Option[Boolean],
  @describe("Config to control producers load for different topic categories by multipliers.")
  producerLoadMultiplier: Option[ProducerLoadMultipliersConfig],
  @describe(
    """Set the amount of subscriptions for different topic categories.
      |If not set, the amount of subscriptions will be random in range [1, 5]
      |""".stripMargin)
  subscriptionAmount: Option[TopicSubscriptionAmountConfig],
  @describe(
    """Set the amount of consumers for subscriptions for different topic categories.
      |If not set, the amount of consumers will be random in range [1, 10]
      |""".stripMargin)
  consumersAmount: Option[TopicConsumersAmountConfig],
  /*@describe(
    """Set the amount of producers for different topic categories.
      |If not set, there will be only one producer for each topic.
      |""".stripMargin)
  producersAmount: Option[TopicProducersAmountConfig],*/
  @describe("Set the amount of workers (which is a consumer-producer pair). If not set, will be random in range [1, 10]")
  workersAmount: Option[Int],
)

case class Config(
  @describe("The URL where Pulsar broker (or proxy) serves protobuf requests.")
  pulsarBrokerUrl: Option[String],
  @describe("The URL where Pulsar broker (or proxy) serves http requests.")
  pulsarWebUrl: Option[String],
  @describe("Config to enable authentication to Pulsar instance for the demo app.")
  auth: Option[AuthConfig],

  @describe(
    """Load config to manipulate load on the demo app.
      |Topics are divided into different load categories.
      |Each load category is assigned based on the context of the topic.
      |This config enables the configuration of each category's own amount of subscriptions, consumers, and producers.
      |""".stripMargin)
  loadConfig: Option[LoadConfig],
)

val defaultConfig = Config(
  pulsarBrokerUrl = Some("pulsar://localhost:6650"),
  pulsarWebUrl = Some("http://localhost:8080"),
  auth = None,

  loadConfig = Some(
    LoadConfig(
      enableNonPersistentTopics = Some(true),
      enablePartitionedTopics = Some(true),
      producerLoadMultiplier = Some(
        ProducerLoadMultipliersConfig(
          baseMultiplier = Some(1.0),
          overloaded = Some(1.0),
          heavilyLoaded = Some(1.0),
          moderatelyLoaded = Some(1.0),
          lightlyLoaded = Some(1.0),
        )
      ),
      subscriptionAmount = Some(
        TopicSubscriptionAmountConfig(
          overloaded = None,
          heavilyLoaded = None,
          moderatelyLoaded = None,
          lightlyLoaded = None,
        )
      ),
      consumersAmount = Some(
        TopicConsumersAmountConfig(
          overloaded = None,
          heavilyLoaded = None,
          moderatelyLoaded = None,
          lightlyLoaded = None,
        )
      ),
      workersAmount = None,
      /*producersAmount = Some(
        TopicProducersAmountConfig(
          overloaded = None,
          heavilyLoaded = None,
          moderatelyLoaded = None,
          lightlyLoaded = None,
        )
      ),*/
    )
  )
)

val yamlConfigDescriptor = descriptor[Config]
val envConfigDescriptor = descriptor[Config].mapKey(key => s"DEKAF_DEMOAPP_${toUpperSnakeCase(key)}")

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
