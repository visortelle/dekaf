package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.{readConfig, Config}
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker
import io.javalin.http.staticfiles.{Location, StaticFileConfig}

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import io.circe.parser.decode as decodeJson
import _root_.pulsar_auth.{defaultPulsarAuth, PulsarAuthRoutes}
import _root_.pulsar_auth.PulsarAuthRoutes.setCookieAndSuccess
import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import _root_.pulsar_auth.{credentialsDecoder, defaultPulsarAuth, jwtCredentialsDecoder, validCredentialsName, PulsarAuth}
import io.circe.parser.decode as decodeJson

object HttpServer:
    private val isBinaryBuild = buildinfo.ExtraBuildInfo.isBinaryBuild

    def createApp(appConfig: Config): Javalin =
        Javalin
            .create { config =>
                JavalinFreemarker.init()
                config.showJavalinBanner = false
                config.staticFiles.add { (staticFiles: StaticFileConfig) =>
                    staticFiles.hostedPath = "/ui/static"
                    staticFiles.directory =
                        if isBinaryBuild
                        then "/ui/static"
                        else "src/main/resources/ui/static"
                    staticFiles.location =
                        if isBinaryBuild
                        then Location.CLASSPATH
                        else Location.EXTERNAL // avoid restarting the app on frontend resources change in dev.
                }
                config.spaRoot.addHandler(
                    "/",
                    ctx => {
                        val model = Map(
                            "publicBaseUrl" -> appConfig.publicBaseUrl.get,
                            "buildInfo" -> buildinfo.BuildInfo.toMap.asJava,
                            "pulsarBrokerUrl" -> appConfig.pulsarBrokerUrl.get,
                            "pulsarWebUrl" -> appConfig.pulsarWebUrl.get,
                            "pulsarName" -> appConfig.pulsarName.get,
                            "pulsarColor" -> appConfig.pulsarColor.get
                        ).asJava

                        val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                        val pulsarAuth = pulsar_auth.parsePulsarAuthCookie(pulsarAuthJson).getOrElse(defaultPulsarAuth)
                        PulsarAuthRoutes.setCookieAndSuccess(ctx, pulsarAuth)

                        ctx.render("/ui/index.ftl", model)
                    }
                )
            }
            .get("/health", ctx => ctx.result("OK"))
            .routes(PulsarAuthRoutes.routes)

    def run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internalHttpPort.get)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.attempt(createApp(config))
        _ <- ZIO.attempt(app.start(port))
        _ <- ZIO.never
    yield ()
