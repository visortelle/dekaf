package config

def formatError(propName: String) = new Exception(s"Config error: $propName property is not set")

def validateConfig(config: Config): Either[Throwable, Unit] =
    if config.licenseId.isEmpty then
        return Left(formatError("licenseId"))

    if config.licenseToken.isEmpty then
        return Left(formatError("licenseToken"))

    Right(())
