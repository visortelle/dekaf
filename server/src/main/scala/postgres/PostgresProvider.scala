package postgres

import zio.*
import io.getquill.*
import io.getquill.jdbczio.Quill
import org.postgresql.ds.PGSimpleDataSource
import _root_.config.ConfigProvider

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

//////////////////////////////////////////////
//trait QuillProvider:
//    def getQuill: Task[Quill[PostgresDialect, NamingStrategy]]

//case class QuillProviderImpl(postgresProvider: PostgresProvider) extends QuillProvider:
//    val a = Quill.Postgres.fromNamingStrategy(SnakeCase)
//    val ds = new PGSimpleDataSource()
//    val b = Quill.DataSource.fromDataSource(ds)

