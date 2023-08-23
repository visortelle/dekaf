package config

def normalizeConfig(config: Config): Config =
    config.copy(
        publicBaseUrl = config.publicBaseUrl.map(v => v.stripSuffix("/")),
        basePath = config.basePath.map(v => v.stripSuffix("/")),
    )
