package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.readConfig
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker

import io.javalin.http.staticfiles.{Location, StaticFileConfig}
import scala.jdk.CollectionConverters.*

object HttpServer extends ZIOAppDefault:
    private val app = Javalin
        .create(config => {
            JavalinFreemarker.init()
            config.showJavalinBanner = false
            config.staticFiles.add((staticFiles: StaticFileConfig) => {
                staticFiles.hostedPath = "/ui/static"
                staticFiles.directory = "/ui/static"
                staticFiles.location = Location.CLASSPATH
            })
        })
        .get("/", ctx => {
            val model = Map(
                "publicUrl" -> "0000"
            ).asJava
            ctx.render("/ui/index.ftl", model)
        })
        .get("/health", ctx => ctx.result("OK"))

    val run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internal.get.httpPort)

        _ <- ZIO.logInfo(s"HTTP server listening on port ${port}")
        _ <- ZIO.attempt(app.start(port))
    yield ()
