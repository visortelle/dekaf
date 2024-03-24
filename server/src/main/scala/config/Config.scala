package config

import zio.{Config, *}
import zio.config.*
import zio.config.magnolia.{describe, descriptor}
import zio.config.yaml.YamlConfigSource
import licensing.{AvailableLicenses, LicenseInfo, ProductCode}
import _root_.envoy

import java.nio.file.Path

case class Config(
    @describe("The port the server listens on.")
    port: Option[Int] = Some(8090),
    @describe(
        "When running the application behind a reverse-proxy, you need to provide a public URL to let the application know how to render links and making redirects correctly."
    )
    publicBaseUrl: Option[String] = Some("http://localhost:8090"),
    @describe("When running the application behind a reverse-proxy, it may be useful to specify a base path.")
    basePath: Option[String] = Some("/"),
    @describe("Use http or https.")
    protocol: Option[String] = Some("http"),
    @describe("TLS certificate file path.")
    tlsCertificateFilePath: Option[String] = None,
    @describe("TLS key file path.")
    tlsKeyFilePath: Option[String] = None,
    @describe("Determines whether the user is forced to send the cookie over a valid HTTPS secure connection.")
    cookieSecure: Option[Boolean] = None,
    @describe("Determines whether the user agent should block the transmission of a cookie with cross-site requests.")
    cookieSameSite: Option[String] = None,
    //
    @describe("Path to the persistent data directory.")
    dataDir: Option[String] = Some(s"${java.nio.file.Paths.get(".").toAbsolutePath}/data"),
    //
    @describe("License id.")
    licenseId: Option[String] = None,
    @describe("License token.")
    licenseToken: Option[String] = None,
    //
    @describe("Pulsar instance name")
    pulsarName: Option[String] = Some("default"),
    @describe("Optional accent color to visually distinguish this instance")
    pulsarColor: Option[String] = Some("transparent"),
    @describe("Pulsar web service URL.")
    pulsarWebUrl: Option[String] = Some("http://localhost:8080"),
    @describe("Pulsar service URL.")
    pulsarBrokerUrl: Option[String] = Some("pulsar://localhost:6650"),
    @describe("Advertised listener name.")
    pulsarListenerName: Option[String] = None,

    //
    @describe("Path to the TLS key file.")
    pulsarTlsKeyFilePath: Option[String] = None,
    @describe("Path to the TLS certificate file.")
    pulsarTlsCertificateFilePath: Option[String] = None,
    @describe("Path to the trusted TLS certificate file.")
    pulsarTlsTrustCertsFilePath: Option[String] = None,
    @describe("Configure whether the Pulsar client accept untrusted TLS certificate from broker")
    pulsarAllowTlsInsecureConnection: Option[Boolean] = None,
    @describe("""
          |It allows to validate hostname verification when client connects to broker over tls. It validates incoming x509
          |certificate and matches provided hostname(CN/SAN) with expected broker's host name. It follows RFC 2818, 3.1.
          |Server Identity hostname verification.
          |See https://tools.ietf.org/html/rfc2818
          |""".stripMargin)
    pulsarEnableTlsHostnameVerification: Option[Boolean] = None,
    @describe("If Tls is enabled, whether use KeyStore type as tls configuration parameter.False means use default pem type configuration.")
    pulsarUseKeyStoreTls: Option[Boolean] = None,
    @describe("The name of the security provider used for SSL connections. Default value is the default security provider of the JVM.")
    pulsarSslProvider: Option[String] = None,
    @describe("The file format of the key store file.")
    pulsarTlsKeyStoreType: Option[String] = None,
    @describe("The location of the key store file.")
    pulsarTlsKeyStorePath: Option[String] = None,
    @describe("The store password for the key store file.")
    pulsarTlsKeyStorePassword: Option[String] = None,
    @describe("The file format of the trust store file.")
    pulsarTlsTrustStoreType: Option[String] = None,
    @describe("The location of the trust store file.")
    pulsarTlsTrustStorePath: Option[String] = None,
    @describe("The store password for the trust store file.")
    pulsarTlsTrustStorePassword: Option[String] = None,
    @describe("""
          |A list of cipher suites.
          |This is a named combination of authentication, encryption, MAC and key exchange algorithm
          |used to negotiate the security settings for a network connection using TLS or SSL network protocol.
          |By default all the available cipher suites are supported.
          |""".stripMargin)
    pulsarTlsCiphers: Option[List[String]] = None,
    @describe("""
          |The SSL protocol used to generate the SSLContext.
          |Default setting is TLS, which is fine for most cases.
          |Allowed values in recent JVMs are TLS, TLSv1.3, TLSv1.2 and TLSv1.1.
          |""".stripMargin)
    pulsarTlsProtocols: Option[List[String]] = None,
    @describe("Default authentication credentials for all users. Not recommended to use it in multi-user production environment.")
    defaultPulsarAuth: Option[String] = None,

    // Internal config
    @describe("The port HTTP server listens on.")
    internalHttpPort: Option[Int] = None,
    @describe("The port gRPC server listens on.")
    internalGrpcPort: Option[Int] = None
)

val yamlConfigDescriptor = descriptor[Config]
val envConfigDescriptor = descriptor[Config].mapKey(key => s"DEKAF_${toUpperSnakeCase(key)}")

val internalHttpPort = getFreePort
val internalGrpcPort = getFreePort

def readConfig =
    for
        yamlConfigSource <- ZIO.attempt(YamlConfigSource.fromYamlPath(Path.of("./config.yaml")))
        envConfigSource <- ZIO.attempt(ConfigSource.fromSystemEnv(None, None))
        maybeYamlConfig <- read(yamlConfigDescriptor.from(yamlConfigSource)).either
        envConfig <- read(envConfigDescriptor.from(envConfigSource))
        defaultConfig <- ZIO.succeed(Config(internalHttpPort = Some(internalHttpPort), internalGrpcPort = Some(internalGrpcPort)))

        config <- ZIO.succeed {
            val appConfig = maybeYamlConfig match
                case Right(yamlConfig) => mergeConfigs(envConfig, yamlConfig)
                case Left(_)           => envConfig

            val mergedConfig = mergeConfigs(defaultConfig, appConfig)
            normalizeConfig(mergedConfig)
        }
    yield config

def readConfigAsync = Unsafe.unsafe(implicit unsafe => Runtime.default.unsafe.runToFuture(readConfig))

def toUpperSnakeCase(s: String) = s.replaceAll("([A-Z]+)([A-Z][a-z])", "$1_$2").replaceAll("([a-z\\d])([A-Z])", "$1_$2").toUpperCase
