package postgres

import zio.*
import io.getquill.*
import _root_.config.ConfigProvider
import io.getquill.jdbczio.Quill

trait PostgresProvider:
    def getPostgresConfig: Task[PostgresConfig]

object PostgresProvider:
    def getPostgresConfig: RIO[PostgresProvider, PostgresConfig] = ZIO.serviceWithZIO[PostgresProvider](_.getPostgresConfig)

object PostgresProviderImpl:
    val layer: ZLayer[ConfigProvider, Nothing, PostgresProviderImpl] = ZLayer {
        for {
            configProvider <- ZIO.service[ConfigProvider]
        } yield PostgresProviderImpl(configProvider)
    }

case class PostgresProviderImpl(configProvider: ConfigProvider) extends PostgresProvider:
    def getPostgresConfig: Task[PostgresConfig] = for {
        config <- configProvider.getConfig
        postgresConfig <- config.postgresVariant match
            case Some(PostgresVariant.postgres) => ZIO.succeed(
                PostgresConfig(
                    host = config.postgresHost.get,
                    port = config.postgresPort.get,
                    user = config.postgresUser.get,
                    password = config.postgresPassword.get,
                    database = config.postgresDatabase.get
                )
            )
            case Some(PostgresVariant.embedded) => EmbeddedPostgres.run
            case None => ZIO.fail(new Exception("postgres variant not set"))
    } yield postgresConfig
