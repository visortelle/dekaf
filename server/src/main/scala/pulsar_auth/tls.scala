package pulsar_auth

import _root_.config.Config
import org.apache.pulsar.client.admin.PulsarAdminBuilder
import org.apache.pulsar.client.api.ClientBuilder
import zio.config.magnolia.{describe, descriptor}

import scala.jdk.CollectionConverters.*

object tls:
    def configureClient(builder: ClientBuilder, config: Config): ClientBuilder =
        var b = builder
        b = config.pulsarTlsKeyFilePath match
            case Some(v) => builder.tlsKeyFilePath(v)
            case None    => b
        b = config.pulsarTlsCertificateFilePath match
            case Some(v) => builder.tlsCertificateFilePath(v)
            case None    => b
        b = config.pulsarTlsTrustCertsFilePath match
            case Some(v) => builder.tlsTrustCertsFilePath(v)
            case None    => b
        b = config.pulsarAllowTlsInsecureConnection match
            case Some(v) => builder.allowTlsInsecureConnection(v)
            case None    => b
        b = config.pulsarEnableTlsHostnameVerification match
            case Some(v) => builder.enableTlsHostnameVerification(v)
            case None    => b
        b = config.pulsarUseKeyStoreTls match
            case Some(v) => builder.useKeyStoreTls(v)
            case None    => b
        b = config.pulsarSslProvider match
            case Some(v) => builder.sslProvider(v)
            case None    => b
        b = config.pulsarTlsKeyStoreType match
            case Some(v) => builder.tlsKeyStoreType(v)
            case None    => b
        b = config.pulsarTlsKeyStorePath match
            case Some(v) => builder.tlsKeyStorePath(v)
            case None    => b
        b = config.pulsarTlsKeyStorePassword match
            case Some(v) => builder.tlsKeyStorePassword(v)
            case None    => b
        b = config.pulsarTlsTrustStoreType match
            case Some(v) => builder.tlsTrustStoreType(v)
            case None    => b
        b = config.pulsarTlsTrustStorePath match
            case Some(v) => builder.tlsTrustStorePath(v)
            case None    => b
        b = config.pulsarTlsTrustStorePassword match
            case Some(v) => builder.tlsTrustStorePassword(v)
            case None    => b
        b = config.pulsarTlsCiphers match
            case Some(v) => builder.tlsCiphers(v.toSet.asJava)
            case None    => b
        b = config.pulsarTlsProtocols match
            case Some(v) => builder.tlsProtocols(v.toSet.asJava)
            case None    => b
        b

    def configureAdminClient(builder: PulsarAdminBuilder, config: Config): PulsarAdminBuilder =
        var b = builder
        b = config.pulsarTlsKeyFilePath match
            case Some(v) => builder.tlsKeyFilePath(v)
            case None    => b
        b = config.pulsarTlsCertificateFilePath match
            case Some(v) => builder.tlsCertificateFilePath(v)
            case None    => b
        b = config.pulsarTlsTrustCertsFilePath match
            case Some(v) => builder.tlsTrustCertsFilePath(v)
            case None    => b
        b = config.pulsarAllowTlsInsecureConnection match
            case Some(v) => builder.allowTlsInsecureConnection(v)
            case None    => b
        b = config.pulsarEnableTlsHostnameVerification match
            case Some(v) => builder.enableTlsHostnameVerification(v)
            case None    => b
        b = config.pulsarUseKeyStoreTls match
            case Some(v) => builder.useKeyStoreTls(v)
            case None    => b
        b = config.pulsarSslProvider match
            case Some(v) => builder.sslProvider(v)
            case None    => b
        b = config.pulsarTlsKeyStoreType match
            case Some(v) => builder.tlsKeyStoreType(v)
            case None    => b
        b = config.pulsarTlsKeyStorePath match
            case Some(v) => builder.tlsKeyStorePath(v)
            case None    => b
        b = config.pulsarTlsKeyStorePassword match
            case Some(v) => builder.tlsKeyStorePassword(v)
            case None    => b
        b = config.pulsarTlsTrustStoreType match
            case Some(v) => builder.tlsTrustStoreType(v)
            case None    => b
        b = config.pulsarTlsTrustStorePath match
            case Some(v) => builder.tlsTrustStorePath(v)
            case None    => b
        b = config.pulsarTlsTrustStorePassword match
            case Some(v) => builder.tlsTrustStorePassword(v)
            case None    => b
        b = config.pulsarTlsCiphers match
            case Some(v) => builder.tlsCiphers(v.toSet.asJava)
            case None    => b
        b = config.pulsarTlsProtocols match
            case Some(v) => builder.tlsProtocols(v.toSet.asJava)
            case None    => b
        b
