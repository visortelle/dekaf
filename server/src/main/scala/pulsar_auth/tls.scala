package pulsar_auth

import _root_.config.TlsConfig
import org.apache.pulsar.client.admin.PulsarAdminBuilder
import org.apache.pulsar.client.api.ClientBuilder
import zio.config.magnolia.{describe, descriptor}

import scala.jdk.CollectionConverters.*

object tls:
    def configureClient(builder: ClientBuilder, config: TlsConfig): ClientBuilder =
        var b = builder
        b = config.tlsKeyFilePath match
            case Some(v) => builder.tlsKeyFilePath(v)
            case None    => b
        b = config.tlsCertificateFilePath match
            case Some(v) => builder.tlsCertificateFilePath(v)
            case None    => b
        b = config.tlsTrustCertsFilePath match
            case Some(v) => builder.tlsTrustCertsFilePath(v)
            case None    => b
        b = config.allowTlsInsecureConnection match
            case Some(v) => builder.allowTlsInsecureConnection(v)
            case None    => b
        b = config.enableTlsHostnameVerification match
            case Some(v) => builder.enableTlsHostnameVerification(v)
            case None    => b
        b = config.useKeyStoreTls match
            case Some(v) => builder.useKeyStoreTls(v)
            case None    => b
        b = config.sslProvider match
            case Some(v) => builder.sslProvider(v)
            case None    => b
        b = config.tlsKeyStoreType match
            case Some(v) => builder.tlsKeyStoreType(v)
            case None    => b
        b = config.tlsKeyStorePath match
            case Some(v) => builder.tlsKeyStorePath(v)
            case None    => b
        b = config.tlsKeyStorePassword match
            case Some(v) => builder.tlsKeyStorePassword(v)
            case None    => b
        b = config.tlsTrustStoreType match
            case Some(v) => builder.tlsTrustStoreType(v)
            case None    => b
        b = config.tlsTrustStorePath match
            case Some(v) => builder.tlsTrustStorePath(v)
            case None    => b
        b = config.tlsTrustStorePassword match
            case Some(v) => builder.tlsTrustStorePassword(v)
            case None    => b
        b = config.tlsCiphers match
            case Some(v) => builder.tlsCiphers(v.toSet.asJava)
            case None    => b
        b = config.tlsProtocols match
            case Some(v) => builder.tlsProtocols(v.toSet.asJava)
            case None    => b
        b

    def configureAdminClient(builder: PulsarAdminBuilder, config: TlsConfig): PulsarAdminBuilder =
        var b = builder
        b = config.tlsKeyFilePath match
            case Some(v) => builder.tlsKeyFilePath(v)
            case None    => b
        b = config.tlsCertificateFilePath match
            case Some(v) => builder.tlsCertificateFilePath(v)
            case None    => b
        b = config.tlsTrustCertsFilePath match
            case Some(v) => builder.tlsTrustCertsFilePath(v)
            case None    => b
        b = config.allowTlsInsecureConnection match
            case Some(v) => builder.allowTlsInsecureConnection(v)
            case None    => b
        b = config.enableTlsHostnameVerification match
            case Some(v) => builder.enableTlsHostnameVerification(v)
            case None    => b
        b = config.useKeyStoreTls match
            case Some(v) => builder.useKeyStoreTls(v)
            case None    => b
        b = config.sslProvider match
            case Some(v) => builder.sslProvider(v)
            case None    => b
        b = config.tlsKeyStoreType match
            case Some(v) => builder.tlsKeyStoreType(v)
            case None    => b
        b = config.tlsKeyStorePath match
            case Some(v) => builder.tlsKeyStorePath(v)
            case None    => b
        b = config.tlsKeyStorePassword match
            case Some(v) => builder.tlsKeyStorePassword(v)
            case None    => b
        b = config.tlsTrustStoreType match
            case Some(v) => builder.tlsTrustStoreType(v)
            case None    => b
        b = config.tlsTrustStorePath match
            case Some(v) => builder.tlsTrustStorePath(v)
            case None    => b
        b = config.tlsTrustStorePassword match
            case Some(v) => builder.tlsTrustStorePassword(v)
            case None    => b
        b = config.tlsCiphers match
            case Some(v) => builder.tlsCiphers(v.toSet.asJava)
            case None    => b
        b = config.tlsProtocols match
            case Some(v) => builder.tlsProtocols(v.toSet.asJava)
            case None    => b
        b
