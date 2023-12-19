package config

def mergeConfigs(lowPriority: Config, highPriority: Config): Config =
    Config(
        pulsarBrokerUrl = highPriority.pulsarBrokerUrl.orElse(lowPriority.pulsarBrokerUrl),
        pulsarWebUrl = highPriority.pulsarWebUrl.orElse(lowPriority.pulsarWebUrl),
        auth = highPriority.auth.orElse(lowPriority.auth),
        loadConfig = highPriority.loadConfig.orElse(lowPriority.loadConfig), 
    )
