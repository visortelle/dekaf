package config

def mergeConfigs(lowPriority: Config, highPriority: Config): Config =
    Config(
        pulsarBrokerUrl = highPriority.pulsarBrokerUrl.orElse(lowPriority.pulsarBrokerUrl),
        pulsarHttpUrl = highPriority.pulsarHttpUrl.orElse(lowPriority.pulsarHttpUrl),
        auth = highPriority.auth.orElse(lowPriority.auth),
    )
