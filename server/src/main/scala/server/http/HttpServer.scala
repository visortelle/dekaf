package server.http

import zio.*
import zio.ZIOAppDefault
import zio.http.*
import zio.http.html.*
import zio.http.model.Method
import zio.http.ServerConfig
import zio.http.ServerConfig.LeakDetectionLevel
import _root_.config.readConfig

object HttpServer extends ZIOAppDefault:
    private val urlPrefix = "resources"

    private val app = Http.collectHttp[Request] {
        case Method.GET -> "" /: urlPrefix /: path => for
            file <- Http.getResourceAsFile(path.encode)
            http <-
                if (file.isDirectory) {
                    // Accessing the files in the directory
                    val files = file.listFiles.toList.sortBy(_.getName)
                    val base = s"/${urlPrefix}/"
                    val rest = path.dropLast(1)

                    // Custom UI to list all the files in the directory
                    Http.template(s"File Explorer ~$base${path}") {
                        ul(
                            li(a(href := s"$base$rest", "..")),
                            files.map { file =>
                                li(
                                    a(
                                        href := s"$base${path.encode}${if (path.isRoot) file.getName else "/" + file.getName}",
                                        file.getName,
                                    ),
                                )
                            },
                        )
                    }
                }

                else if (file.isFile) Http.fromFile(file)
                else Http.empty
        yield http
    }

    val run: ZIO[Any, Throwable, Unit] = for
        config <- readConfig
        serverConfig <- ZIO.succeed(
          ServerConfig.default
              .port(config.httpPort)
              .leakDetection(LeakDetectionLevel.PARANOID)
        )
        configLayer <- ZIO.succeed(ServerConfig.live(serverConfig))

        _ <- ZIO.logInfo(s"HTTP server listening on port ${config.httpPort}")
        _ <- Server.serve(app).provide(configLayer, Server.live)
    yield ()
