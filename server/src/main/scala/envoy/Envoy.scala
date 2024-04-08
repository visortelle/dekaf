package envoy

import zio.*
import zio.process.{Command, ProcessOutput}
import org.apache.commons.lang3.SystemUtils
import _root_.config.readConfig

object Envoy:
    def run: IO[Throwable, Unit] =
        val isDesktopBuild = buildinfo.ExtraBuildInfo.isDesktopBuild

        for
            envoyConfigProps <- readConfig.map(c =>
                EnvoyConfigProps(
                    httpServerPort = c.internalHttpPort.get,
                    grpcServerPort = c.internalGrpcPort.get,
                    listenPort = c.port.get,
                    basePath = c.basePath.get
                )
            )

            envoyBinPath <- ZIO.succeed(if SystemUtils.IS_OS_WINDOWS then "envoy.exe" else "envoy.bin")
            configPath <- getEnvoyConfigPath(envoyConfigProps).map(_.toString)

            _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $configPath")
            _ <- ZIO.logInfo(s"Listening port: ${envoyConfigProps.listenPort}")

            process <- {
                // For Windows Desktop app Dekaf doen't start without "inheritIO" for some reason
                if isDesktopBuild then
                    Command(envoyBinPath, "--config-path", configPath).inheritIO.exitCode
                else
                    Command(envoyBinPath, "--config-path", configPath).successfulExitCode
            }

            _ <- ZIO.never
        yield ()
