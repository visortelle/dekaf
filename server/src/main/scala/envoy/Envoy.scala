package envoy

import zio.*
import zio.process.{Command, ProcessOutput}
import _root_.config.readConfig

import java.io.File

object Envoy extends ZIOAppDefault:
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

        _ <- Command(envoyBinPath.toString, "--config-path", configPath)
            // TODO - add option to log envoy output
            .successfulExitCode
    yield ()
