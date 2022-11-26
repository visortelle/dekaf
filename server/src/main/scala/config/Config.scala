package config

import zio.*
import zio.config.*
import zio.config.ConfigDescriptor
import zio.config.ConfigSource
import zio.config.magnolia.{describe, descriptor}
import zio.config.typesafe.{configValueConfigDescriptor, TypesafeConfig}
import zio.config.yaml.{YamlConfig, YamlConfigSource}
import java.nio.file.Path

case class PulsarInstanceConfig(
    @describe("Pulsar instance name")
    name: String,
    @describe("Optional accent color to visually distinguish this instance")
    color: Option[String],
    @describe("The URL where Pulsar broker (or proxy) serves protobuf requests. Example: pulsar://localhost:6650")
    brokerServiceUrl: String,
    @describe("The URL where Pulsar broker (or proxy) serves http requests. Example: http://localhost:8080")
    webServiceUrl: String
)

case class UiConfig(
    @describe("When running X-Ray behind a reverse-proxy, you need to provide a public URL to let X-Ray know how to render links and redirects correctly.")
    publicUrl: String,
    @describe("X-Ray will send API requests to this endpoint.")
    apiUrl: String
)

case class ServerConfig(
    @describe("The port HTTP server listens on")
    httpPort: Int,
    @describe("The port gRPC server listens on")
    grpcPort: Int
)

case class Config(
                     grpcPort: Int,
                     httpPort: Int,
                     publicUrl: String,
//    ui: UiConfig,
//    serverConfig: ServerConfig,
    @describe("The Pulsar instances configuration")
    pulsarInstances: List[PulsarInstanceConfig]
)

val defaultConfig = Config(
  grpcPort = 8090,
  httpPort = 8091,
  publicUrl = "http://localhost:8091",
  pulsarInstances = List(
    PulsarInstanceConfig(
      name = "local",
      color = Some("#ff0000"),
      brokerServiceUrl = "pulsar://localhost:6650",
      webServiceUrl = "http://localhost:8080"
    )
  )
)

val configDescriptor = descriptor[Config].default(defaultConfig)

val yamlConfigSource = YamlConfigSource.fromYamlPath(Path.of("./config.yaml"))

val configSource = yamlConfigSource

val readConfig = read(configDescriptor from configSource)
