package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.{readConfig, Config}
import buildinfo as buildinfo
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker
import io.javalin.http.staticfiles.{Location, StaticFileConfig}
import scala.jdk.CollectionConverters.*

object HttpServer extends ZIOAppDefault:
    def createApp(appConfig: Config): Javalin = Javalin
        .create { config =>
            JavalinFreemarker.init()
            config.showJavalinBanner = false
            config.staticFiles.add { (staticFiles: StaticFileConfig) =>
                staticFiles.hostedPath = "/ui/static"
                staticFiles.directory = "src/main/resources/ui/static"
                staticFiles.location = Location.EXTERNAL
            }
            config.spaRoot.addHandler(
                "/",
                ctx => {
                    val model = Map(
                        "publicUrl" -> appConfig.publicUrl,
                        "buildInfo" -> buildinfo.BuildInfo.toMap.asJava,
                        "pulsarInstance" -> Map[String, Any](
                            "name" -> appConfig.pulsarInstance.name,
                            "color" -> appConfig.pulsarInstance.color.getOrElse("transparent"),
                            "brokerServiceUrl" -> appConfig.pulsarInstance.brokerServiceUrl,
                            "webServiceUrl" -> appConfig.pulsarInstance.webServiceUrl,
                        ).asJava,
                    ).asJava
                    ctx.render("/ui/index.ftl", model)
                }
            )
        }
        .get("/health", ctx => ctx.result("OK"))

    val run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internal.get.httpPort)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.succeed(createApp(config))
        _ <- ZIO.attempt(app.start(port))
    yield ()
