package client

import org.apache.pulsar.client.api.ClientBuilder
import org.apache.pulsar.client.admin.PulsarAdminBuilder
import zio.config.magnolia.{describe, descriptor}
import scala.jdk.CollectionConverters.*

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
    tlsCiphers: Option[Set[String]],
    @describe("""
          |The SSL protocol used to generate the SSLContext.
          |Default setting is TLS, which is fine for most cases.
          |Allowed values in recent JVMs are TLS, TLSv1.3, TLSv1.2 and TLSv1.1.
          |""".stripMargin)
    tlsProtocols: Option[Set[String]]
)

object tls:
    def configureClient(config: TlsConfig, builder: ClientBuilder): Unit =
        config.tlsKeyFilePath.map(builder.tlsTrustCertsFilePath)
        config.tlsCertificateFilePath.map(builder.tlsCertificateFilePath)
        config.tlsTrustCertsFilePath.map(builder.tlsTrustCertsFilePath)
        config.allowTlsInsecureConnection.map(builder.allowTlsInsecureConnection)
        config.enableTlsHostnameVerification.map(builder.enableTlsHostnameVerification)
        config.useKeyStoreTls.map(builder.useKeyStoreTls)
        config.sslProvider.map(builder.sslProvider)
        config.tlsKeyStoreType.map(builder.tlsKeyStoreType)
        config.tlsKeyStorePath.map(builder.tlsKeyStorePath)
        config.tlsKeyStorePassword.map(builder.tlsKeyStorePassword)
        config.tlsTrustStoreType.map(builder.tlsTrustStoreType)
        config.tlsTrustStorePath.map(builder.tlsTrustStorePath)
        config.tlsTrustStorePassword.map(builder.tlsTrustStorePassword)
        config.tlsCiphers.map(v => builder.tlsCiphers(v.asJava))
        config.tlsProtocols.map(v => builder.tlsProtocols(v.asJava))

    def configureAdminClient(config: TlsConfig, builder: PulsarAdminBuilder): Unit =
        config.tlsKeyFilePath.map(builder.tlsTrustCertsFilePath)
        config.tlsCertificateFilePath.map(builder.tlsCertificateFilePath)
        config.tlsTrustCertsFilePath.map(builder.tlsTrustCertsFilePath)
        config.allowTlsInsecureConnection.map(builder.allowTlsInsecureConnection)
        config.enableTlsHostnameVerification.map(builder.enableTlsHostnameVerification)
        config.useKeyStoreTls.map(builder.useKeyStoreTls)
        config.sslProvider.map(builder.sslProvider)
        config.tlsKeyStoreType.map(builder.tlsKeyStoreType)
        config.tlsKeyStorePath.map(builder.tlsKeyStorePath)
        config.tlsKeyStorePassword.map(builder.tlsKeyStorePassword)
        config.tlsTrustStoreType.map(builder.tlsTrustStoreType)
        config.tlsTrustStorePath.map(builder.tlsTrustStorePath)
        config.tlsTrustStorePassword.map(builder.tlsTrustStorePassword)
        config.tlsCiphers.map(v => builder.tlsCiphers(v.asJava))
        config.tlsProtocols.map(v => builder.tlsProtocols(v.asJava))


