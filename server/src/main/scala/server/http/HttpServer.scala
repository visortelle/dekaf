package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.readConfig
import io.javalin.Javalin

object HttpServer extends ZIOAppDefault:
    var app = Javalin
        .create(config => config.showJavalinBanner = false)
        .get("/", ctx => ctx.result("Hello World"))

    val run = for
        config <- readConfig
        _ <- ZIO.logInfo(s"HTTP server listening on port ${config.httpPort}")
        _ <- ZIO.attempt(app.start(config.httpPort))
    yield ()
