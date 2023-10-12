package postgres

import zio.*
import zio.process.Command
import _root_.config.{getFreePort, readConfig}

import embedded_postgres_config.EmbeddedPostgresConfig

case class PostgresConfig(
    host: String,
    port: Int,
    user: String,
    password: String,
    database: String
)

val databaseName = "dekaf"

object EmbeddedPostgres:
    private def initPgDataInEmptyDir(dir: os.Path): Task[Unit] = for {
        _ <- ZIO.logInfo(s"Initializing embedded Postgres data directory")
        process <- Command("initdb", "-D", dir.toString).inheritIO.run
        _ <- process.successfulExitCode
    } yield ()

    private def preparePgDataDir(dir: os.Path): Task[Unit] = for {
        _ <- ZIO.logInfo("Preparing embedded Postgres data directory")
        dirExists <- ZIO.attempt(os.exists(dir, true))
        _ <- ZIO
            .attempt {
                os.makeDir.all(dir, os.PermSet.fromString("rwx------"))
            }
            .unless(dirExists)
        dirEmpty <- ZIO.attempt(os.list(dir).isEmpty)
        _ <- initPgDataInEmptyDir(dir).when(dirEmpty)
    } yield ()

    private def startPostgres(config: EmbeddedPostgresConfig): Task[PostgresConfig] = for {
        _ <- ZIO.logInfo(s"Starting embedded Postgres")
        process <- Command("postgres", "-D", config.pgdataDir, "-p", config.listenPort.toString)
            .redirectErrorStream(true)
            .inheritIO
            .run
        config <- ZIO.attempt {
            PostgresConfig(
                host = "0.0.0.0",
                port = config.listenPort,
                user = "",
                password = "",
                database = databaseName
            )
        }
        _ <- process.successfulExitCode.forkDaemon
        _ <- waitPostgresIsReady(config)
    } yield config

    def waitPostgresIsReady(config: PostgresConfig): Task[Unit] =
        val check = for {
            process <- Command("pg_isready", "-h", config.host, "-p", config.port.toString).inheritIO.run
            _ <- process.successfulExitCode
        } yield ()

        for {
            _ <- check.retry(Schedule.recurs(20) && Schedule.spaced(1.second))
            _ <- ZIO.logInfo(s"Embedded Postgres is ready.")
        } yield ()

    def run: Task[PostgresConfig] = for
        config <- readConfig
        freePort <- ZIO.attempt(getFreePort)
        embeddedPgConfig <- ZIO.succeed(
            EmbeddedPostgresConfig(
                listenPort = freePort,
                pgdataDir = s"${config.dataDir.get}/pgdata"
            )
        )
        _ <- preparePgDataDir(os.Path(embeddedPgConfig.pgdataDir, os.pwd))
        pgConfig <- startPostgres(embeddedPgConfig)
    yield pgConfig
