package config

def mergeConfigs(lowPriority: Config, highPriority: Config): Config =
    Config(
        pulsarBrokerUrl = highPriority.pulsarBrokerUrl.orElse(lowPriority.pulsarBrokerUrl),
        pulsarWebUrl = highPriority.pulsarWebUrl.orElse(lowPriority.pulsarWebUrl),
        auth = highPriority.auth.orElse(lowPriority.auth),
        enableDemoAppTenant = highPriority.enableDemoAppTenant.orElse(lowPriority.enableDemoAppTenant),
        demoAppConfig = highPriority.demoAppConfig.orElse(lowPriority.demoAppConfig),
        enableSchemasTenant = highPriority.enableSchemasTenant.orElse(lowPriority.enableSchemasTenant),
        schemasConfig = highPriority.schemasConfig.orElse(lowPriority.schemasConfig)
    )
