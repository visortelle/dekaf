package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.{Config, readConfig}
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker
import io.javalin.http.staticfiles.{Location, StaticFileConfig}

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import io.circe.parser.decode as decodeJson
import _root_.pulsar_auth.{PulsarAuthRoutes, defaultPulsarAuth}
import _root_.pulsar_auth.PulsarAuthRoutes.setCookieAndSuccess
import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import _root_.pulsar_auth.{credentialsDecoder, defaultPulsarAuth, jwtCredentialsDecoder, PulsarAuth, validCredentialsName}
import io.circe.parser.decode as decodeJson

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
                            "webServiceUrl" -> appConfig.pulsarInstance.webServiceUrl
                        ).asJava
                    ).asJava

                    val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                    val pulsarAuth = pulsar_auth.parsePulsarAuthJson(pulsarAuthJson).getOrElse(defaultPulsarAuth)
                    PulsarAuthRoutes.setCookieAndSuccess(ctx, pulsarAuth)

                    ctx.render("/ui/index.ftl", model)
                }
            )
        }
        .get("/health", ctx => ctx.result("OK"))
        .routes(PulsarAuthRoutes.routes)

    val run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internal.get.httpPort)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.succeed(createApp(config))
        _ <- ZIO.attempt(app.start(port))
    yield ()
