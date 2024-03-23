package server.http

import _root_.config.{Config, readConfig}
import _root_.licensing.Licensing
import _root_.pulsar_auth
import _root_.pulsar_auth.PulsarAuthRoutes.setCookieAndSuccess
import _root_.pulsar_auth.{PulsarAuthRoutes, defaultPulsarAuth}
import _root_.server.grpc.GrpcServer
import io.javalin.Javalin
import io.javalin.http.staticfiles.{Location, StaticFileConfig}
import io.javalin.rendering.template.JavalinFreemarker
import zio.*

import scala.jdk.CollectionConverters.*

object HttpServer:
    private val isBinaryBuild = buildinfo.ExtraBuildInfo.isBinaryBuild

    def createApp(appConfig: Config): Javalin =
        Javalin
            .create { config =>
                config.fileRenderer(new JavalinFreemarker())
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
                            "pulsarColor" -> appConfig.pulsarColor.get,
                            "productCode" -> Licensing.licenseInfo.productCode.ordinal,
                            "productName" -> Licensing.licenseInfo.productName,
                            "licenseId" -> appConfig.licenseId.getOrElse("undefined"),
                        ).asJava

                        val encodedPulsarAuth = Option(ctx.cookie("pulsar_auth"))
                        val pulsarAuth = pulsar_auth.pulsarAuthFromCookie(encodedPulsarAuth).getOrElse(defaultPulsarAuth)
                        PulsarAuthRoutes.setCookieAndSuccess(ctx, pulsarAuth)

                        ctx.render("/ui/index.ftl", model)
                    }
                )
                config.router.apiBuilder(PulsarAuthRoutes.endpoints)
            }
            .get("/health", ctx => {
                if GrpcServer.isRunning then
                    ctx.status(200)
                    ctx.result("ok")
                else
                    ctx.status(503)
                    ctx.result("fail")
            })

    def run: IO[Throwable, Unit] = for
        config <- readConfig
        host = "127.0.0.1"
        port <- ZIO.attempt(config.internalHttpPort.get)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.attempt(createApp(config))
        _ <- ZIO.attempt(app.start(host, port))
        _ <- ZIO.never
    yield ()
