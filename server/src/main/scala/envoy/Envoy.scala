package envoy

import zio.*

val envoyConfig = EnvoyConfig(
  httpServerPort = 8080,
  grpcServerPort = 8090,
  listenPort = 8081
)

def abc = for
    os <- getOs
    arch <- getArch
    configPath <- getEnvoyConfigPath(envoyConfig)
yield ()
