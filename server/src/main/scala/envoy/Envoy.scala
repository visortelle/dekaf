package envoy

import os.Path
import zio.*

val envoyConfig = EnvoyConfig(
  httpServerPort = 8080,
  grpcServerPort = 8090,
  listenPort = 8081
)

object Envoy extends ZIOAppDefault:
    def run: IO[Throwable, Unit] = for
        _ <- ZIO.logInfo(s"Starting Envoy proxy with config: $envoyConfig")
        envoyBinaryPath <- getEnvoyBinaryPath
        configPath <- getEnvoyConfigPath(envoyConfig)
        _ <- ZIO.attempt(println(s"Starting Envoy with config: $configPath"))
        _ <- ZIO.attempt(println(s"Envoy binary path: $envoyBinaryPath"))
    yield ()
