package envoy

import zio.*
import zio.process.{Command, ProcessOutput}

import java.io.File

val envoyConfig = EnvoyConfigParams(
  httpServerPort = 8080,
  grpcServerPort = 8090,
  listenPort = 8081
)

object Envoy extends ZIOAppDefault:
    def run: IO[Throwable, Unit] = for
        envoyBinPath <- getEnvoyBinPath
        configPath <- getEnvoyConfigPath(envoyConfig).map(_.toString)

        _ <- ZIO.logInfo(s"Starting Envoy with config: $configPath")
        _ <- ZIO.logInfo(s"Envoy binary path: $envoyBinPath")

        _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $envoyConfig")
        _ <- Command(envoyBinPath.toString, "--config-path", configPath)
            .redirectErrorStream(true)
            .stderr(ProcessOutput.Inherit)
            .stdout(ProcessOutput.Inherit)
            .run
    yield ()
