package nginx

import zio.*
import zio.process.{Command, ProcessOutput}
import _root_.config.readConfig

import java.io.File

object Nginx:
    def run: IO[Throwable, Unit] = for
        nginxConfigProps <- readConfig.map(c =>
            NginxConfigProps(
              httpServerPort = c.internalHttpPort.get,
              grpcServerPort = c.internalGrpcPort.get,
              listenPort = c.port.get,
              basePath = c.basePath.get,
            )
        )

        nginxBinPath <- getNginxBinPath
        configPath <- getNginxConfigPath(nginxConfigProps).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Nginx with config: $configPath")
        _ <- ZIO.logInfo(s"Listening port: ${nginxConfigProps.listenPort}")

        process <- Command(nginxBinPath.toString, "-c", configPath)
            .inheritIO
            .run

        _ <- process.successfulExitCode
        _ <- ZIO.never
    yield ()
