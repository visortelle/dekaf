package envoy

import zio.*
import zio.process.{Command, ProcessOutput}
import _root_.config.readConfig

import java.io.File

object Envoy:
    def run: IO[Throwable, Unit] = for
        envoyConfigParams <- readConfig.map(c =>
            EnvoyConfigParams(
              httpServerPort = c.internal.get.httpPort,
              grpcServerPort = c.internal.get.grpcPort,
              listenPort = c.port
            )
        )

        envoyBinPath <- getEnvoyBinPath
        configPath <- getEnvoyConfigPath(envoyConfigParams).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $configPath")
        _ <- ZIO.logInfo(s"Listening port: ${envoyConfigParams.listenPort}")

        process <- Command(envoyBinPath.toString, "--config-path", configPath).run
        _ <- process.stdout.linesStream.foreach(line => ZIO.logInfo(line))
        _ <- process.stderr.linesStream.foreach(line => ZIO.logError(line))
        _ <- process.successfulExitCode
    yield ()
