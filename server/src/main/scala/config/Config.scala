package config

import zio.*
import zio.config.*
import zio.config.ConfigDescriptor
import zio.config.ConfigSource
import zio.config.magnolia.{describe, descriptor}
import zio.config.typesafe.{configValueConfigDescriptor, TypesafeConfig}
import zio.config.yaml.{YamlConfig, YamlConfigSource}

import java.nio.file.Path
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

case class PulsarInstanceConfig(
    @describe("Pulsar instance name")
    name: String,
    @describe("Optional accent color to visually distinguish this instance")
    color: Option[String],
    @describe("The URL where Pulsar broker (or proxy) serves protobuf requests. Example: pulsar://localhost:6650")
    brokerServiceUrl: String,
    @describe("The URL where Pulsar broker (or proxy) serves http requests. Example: http://localhost:8090")
    webServiceUrl: String
)

case class InternalConfig(
    @describe("The port HTTP server listens on")
    httpPort: Int,
    @describe("The port gRPC server listens on")
    grpcPort: Int
)

case class LibraryConfig(
    @describe("Path to the library directory.")
    path: String
)

case class TlsConfig(
    @describe("Path to the TLS key file.")
    tlsKeyFilePath: Option[String],
    @describe("Path to the TLS certificate file.")
    tlsCertificateFilePath: Option[String],
    @describe("Path to the trusted TLS certificate file.")
    tlsTrustCertsFilePath: Option[String],
    @describe("Configure whether the Pulsar client accept untrusted TLS certificate from broker")
    allowTlsInsecureConnection: Option[Boolean],
    @describe("""
        |It allows to validate hostname verification when client connects to broker over tls. It validates incoming x509
        |certificate and matches provided hostname(CN/SAN) with expected broker's host name. It follows RFC 2818, 3.1.
        |Server Identity hostname verification.
        |See https://tools.ietf.org/html/rfc2818
        |""".stripMargin)
    enableTlsHostnameVerification: Option[Boolean],
    @describe("If Tls is enabled, whether use KeyStore type as tls configuration parameter.False means use default pem type configuration.")
    useKeyStoreTls: Option[Boolean],
    @describe("The name of the security provider used for SSL connections. Default value is the default security provider of the JVM.")
    sslProvider: Option[String],
    @describe("The file format of the key store file.")
    tlsKeyStoreType: Option[String],
    @describe("The location of the key store file.")
    tlsKeyStorePath: Option[String],
    @describe("The store password for the key store file.")
    tlsKeyStorePassword: Option[String],
    @describe("The file format of the trust store file.")
    tlsTrustStoreType: Option[String],
    @describe("The location of the trust store file.")
    tlsTrustStorePath: Option[String],
    @describe("The store password for the trust store file.")
    tlsTrustStorePassword: Option[String],
    @describe("""
        |A list of cipher suites.
        |This is a named combination of authentication, encryption, MAC and key exchange algorithm
        |used to negotiate the security settings for a network connection using TLS or SSL network protocol.
        |By default all the available cipher suites are supported.
        |""".stripMargin)
    tlsCiphers: Option[List[String]],
    @describe("""
        |The SSL protocol used to generate the SSLContext.
        |Default setting is TLS, which is fine for most cases.
        |Allowed values in recent JVMs are TLS, TLSv1.3, TLSv1.2 and TLSv1.1.
        |""".stripMargin)
    tlsProtocols: Option[List[String]]
)

case class LicenseConfig(
    @describe("License id.")
    id: String,
    @describe("License token.")
    token: String,
)

case class Config(
    @describe("The port the server listens on.")
    port: Int,
    @describe("When running the application behind a reverse-proxy, you need to provide a public URL to let the application know how to render links and redirects correctly.")
    publicUrl: String,
    @describe("The Pulsar instance configuration.")
    pulsarInstance: PulsarInstanceConfig,
    @describe("Library contains user-defined objects like message filters, visualizations, etc.")
    library: LibraryConfig,
    @describe("You need a license to run the application. You can obtain it at https://pulsocat.com")
    license: Option[LicenseConfig],
    @describe("TLS configuration")
    tls: Option[TlsConfig] = None,
    @describe("Internal configuration. Not intended to be changed by the user.")
    internal: Option[InternalConfig] = None,
)

val defaultConfig = Config(
    internal = Some(
        InternalConfig(
            httpPort = 18090,
            grpcPort = 18091
        )
    ),
    port = 8090,
    publicUrl = "http://localhost:8091",
    pulsarInstance = PulsarInstanceConfig(
        name = "local",
        color = Some("#ff0000"),
        brokerServiceUrl = "pulsar://localhost:6650",
        webServiceUrl = "http://localhost:8080"
    ),
    library = LibraryConfig(
        path = "./library"
    ),
    license = Some(LicenseConfig(id = "", token = "")),
    tls = None,
)

val configDescriptor = descriptor[Config].default(defaultConfig)

val configSource = YamlConfigSource.fromYamlPath(Path.of("./config.yaml"))

val internalHttpPort = getFreePort
val internalGrpcPort = getFreePort

def readConfig =
    for
        configMemo <- read(configDescriptor from configSource)
            .map(_.copy(internal = Some(InternalConfig(httpPort = internalHttpPort, grpcPort = internalGrpcPort))))
            .memoize
        config <- configMemo
    yield config

def readConfigAsync = Unsafe.unsafe(implicit unsafe => Runtime.default.unsafe.runToFuture(readConfig))
