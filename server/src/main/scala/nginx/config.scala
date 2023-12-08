package nginx

import zio.*

case class NginxConfigProps(
    httpServerPort: Int,
    grpcServerPort: Int,
    listenPort: Int,
    basePath: String
)

def renderNginxConfig(config: NginxConfigProps): String =
    s"""
daemon off;
error_log /dev/stdout debug;

events {
  worker_connections 1024;
}

http {
  access_log /dev/stdout;

  upstream dekaf-http {
    server 0.0.0.0:${config.httpServerPort};
  }

  upstream dekaf-grpc {
    server 0.0.0.0:${config.grpcServerPort};
  }

  server {
    http2 on;

    listen ${config.listenPort};
    listen [::]:${config.listenPort};

    location /api {
      grpc_set_header Content-Type application/grpc;
      grpc_pass grpc://dekaf-grpc;
    }

    location / {
      proxy_pass http://dekaf-http;
    }
  }
}
""".stripMargin

def getNginxConfigPath(config: NginxConfigProps): IO[Throwable, os.Path] =
    for
        fileContent <- ZIO.succeed(renderNginxConfig(config))
        tempDirPath <- ZIO.attempt(os.temp.dir(null, "dekaf"))
        tempFilePath <- ZIO.attempt(tempDirPath / "nginx.conf")
        _ <- ZIO.attempt(os.write(tempFilePath, fileContent))
    yield tempFilePath
