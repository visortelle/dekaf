package postgres

import zio.*
import zio.process.{Command, ProcessOutput}
import _root_.config.readConfig
import java.io.File
import embedded_postgres_config.EmbeddedPostgresConfig

//case class PostgresConfig(
//    host: String,
//    port: Int,
//    user: String,
//    password: String,
//    database: String
//)

object EmbeddedPostgres:
    def run: IO[Throwable, Unit] = for
        postgresConfig <- ZIO.succeed(EmbeddedPostgresConfig(
            listenPort = ???,
            adminUser = ???,
            adminPassword = ???,
            createDatabases = ???
        ))

        postgresBinPath <- "postgres"
        configPath <- getEnvoyConfigPath(envoyConfigParams).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $configPath")
        _ <- ZIO.logInfo(s"Listening port: ${envoyConfigParams.listenPort}")

        process <- Command(envoyBinPath.toString, "--config-path", configPath).run

        // Uncomment to see Envoy logs
        // TODO - make it configurable
        //         _ <- process.stdout.linesStream.foreach(line => ZIO.logInfo(line))
        //         _ <- process.stderr.linesStream.foreach(line => ZIO.logError(line))
        _ <- process.successfulExitCode
    yield ()
