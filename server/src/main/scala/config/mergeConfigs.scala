package config

def mergeConfigs(lowPriority: Config, highPriority: Config): Config =
    Config(
        port = highPriority.port.orElse(lowPriority.port),
        publicBaseUrl = highPriority.publicBaseUrl.orElse(lowPriority.publicBaseUrl),
        basePath = highPriority.basePath.orElse(lowPriority.basePath),
        dataDir = highPriority.dataDir.orElse(lowPriority.dataDir),
        licenseId = highPriority.licenseId.orElse(lowPriority.licenseId),
        licenseToken = highPriority.licenseToken.orElse(lowPriority.licenseToken),
        pulsarName = highPriority.pulsarName.orElse(lowPriority.pulsarName),
        pulsarColor = highPriority.pulsarColor.orElse(lowPriority.pulsarColor),
        pulsarBrokerUrl = highPriority.pulsarBrokerUrl.orElse(lowPriority.pulsarBrokerUrl),
        pulsarWebUrl = highPriority.pulsarWebUrl.orElse(lowPriority.pulsarWebUrl),
        pulsarTlsKeyFilePath = highPriority.pulsarTlsKeyFilePath.orElse(lowPriority.pulsarTlsKeyFilePath),
        pulsarTlsCertificateFilePath = highPriority.pulsarTlsCertificateFilePath.orElse(lowPriority.pulsarTlsCertificateFilePath),
        pulsarTlsTrustCertsFilePath = highPriority.pulsarTlsTrustCertsFilePath.orElse(lowPriority.pulsarTlsTrustCertsFilePath),
        pulsarAllowTlsInsecureConnection = highPriority.pulsarAllowTlsInsecureConnection.orElse(lowPriority.pulsarAllowTlsInsecureConnection),
        pulsarEnableTlsHostnameVerification = highPriority.pulsarEnableTlsHostnameVerification.orElse(lowPriority.pulsarEnableTlsHostnameVerification),
        pulsarUseKeyStoreTls = highPriority.pulsarUseKeyStoreTls.orElse(lowPriority.pulsarUseKeyStoreTls),
        pulsarSslProvider = highPriority.pulsarSslProvider.orElse(lowPriority.pulsarSslProvider),
        pulsarTlsKeyStoreType = highPriority.pulsarTlsKeyStoreType.orElse(lowPriority.pulsarTlsKeyStoreType),
        pulsarTlsKeyStorePath = highPriority.pulsarTlsKeyStorePath.orElse(lowPriority.pulsarTlsKeyStorePath),
        pulsarTlsKeyStorePassword = highPriority.pulsarTlsKeyStorePassword.orElse(lowPriority.pulsarTlsKeyStorePassword),
        pulsarTlsTrustStoreType = highPriority.pulsarTlsTrustStoreType.orElse(lowPriority.pulsarTlsTrustStoreType),
        pulsarTlsTrustStorePath = highPriority.pulsarTlsTrustStorePath.orElse(lowPriority.pulsarTlsTrustStorePath),
        pulsarTlsTrustStorePassword = highPriority.pulsarTlsTrustStorePassword.orElse(lowPriority.pulsarTlsTrustStorePassword),
        pulsarTlsCiphers = highPriority.pulsarTlsCiphers.orElse(lowPriority.pulsarTlsCiphers),
        pulsarTlsProtocols = highPriority.pulsarTlsProtocols.orElse(lowPriority.pulsarTlsProtocols),
        internalHttpPort = highPriority.internalHttpPort.orElse(lowPriority.internalHttpPort),
        internalGrpcPort = highPriority.internalGrpcPort.orElse(lowPriority.internalGrpcPort),
        defaultPulsarAuth = highPriority.defaultPulsarAuth.orElse(lowPriority.defaultPulsarAuth)
    )
