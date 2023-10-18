package config

import zio.{Config => _, *}

trait ConfigProvider:
    def getConfig: Task[Config]

object ConfigProvider:
    def getConfig: RIO[ConfigProvider, Config] = ZIO.serviceWithZIO[ConfigProvider](_.getConfig)

object ConfigProviderImpl:
    val layer: ZLayer[Any, Nothing, ConfigProvider] = ZLayer.succeed(ConfigProviderImpl())

case class ConfigProviderImpl() extends ConfigProvider:
    def getConfig: Task[Config] = readConfig
