package config

def normalizeConfig(config: Config): Config =
    config.copy(
        publicUrl = config.publicUrl.map(v => v.stripSuffix("/")),
        basePath = config.basePath.map(v => v.stripSuffix("/")),
    )
