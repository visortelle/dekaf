package envoy

import zio.*
import zio.process.{Command, ProcessOutput}
import _root_.config.readConfig

import java.io.File

object Envoy:
    def run: IO[Throwable, Unit] = for
        envoyConfigProps <- readConfig.map(c =>
            EnvoyConfigProps(
              httpServerPort = c.internalHttpPort.get,
              grpcServerPort = c.internalGrpcPort.get,
              listenPort = c.port.get,
              basePath = c.basePath.get,
            )
        )

        envoyBinPath <- getEnvoyBinPath
        configPath <- getEnvoyConfigPath(envoyConfigProps).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $configPath")
        _ <- ZIO.logInfo(s"Listening port: ${envoyConfigProps.listenPort}")

        process <- Command(envoyBinPath.toString, "--config-path", configPath).inheritIO.exitCode

        _ <- ZIO.never
    yield ()
