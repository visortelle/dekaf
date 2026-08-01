package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.{Config, readConfig}
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker
import io.javalin.http.staticfiles.{Location, StaticFileConfig}
import org.eclipse.jetty.server.{Server, ServerConnector, HttpConnectionFactory, HttpConfiguration}
import org.eclipse.jetty.http.UriCompliance

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import io.circe.parser.decode as decodeJson
import _root_.pulsar_auth.{PulsarAuthRoutes, defaultPulsarAuth}
import _root_.pulsar_auth.PulsarAuthRoutes.setCookieAndSuccess
import _root_.server.grpc.GrpcServer

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import _root_.pulsar_auth.{PulsarAuth, credentialsDecoder, defaultPulsarAuth, jwtCredentialsDecoder, validCredentialsName}
import io.circe.parser.decode as decodeJson

import java.text.MessageFormat

object HttpServer:
    private val isBinaryBuild = buildinfo.ExtraBuildInfo.isBinaryBuild

    /** The path part of the public base URL, always starting and ending with a slash.
      *
      * The UI uses it as the HTML base href. It has to stay origin-relative: an absolute
      * base href makes the browser resolve history.pushState URLs against a different
      * origin whenever Dekaf is opened on another host than the configured public base
      * URL, which fails with a SecurityError and leaves the user with a blank page.
      */
    def basePathOf(publicBaseUrl: String): String =
        val path = scala.util.Try(java.net.URI(publicBaseUrl).getPath).toOption.filter(_ != null).getOrElse("")
        val trimmed = path.stripPrefix("/").stripSuffix("/")
        if trimmed.isEmpty then "/" else s"/$trimmed/"

    def createApp(appConfig: Config): Javalin =
        Javalin
            .create { config =>
                JavalinFreemarker.init()
                config.showJavalinBanner = false
                // Default Jetty request-header cap is 8 KB; raise it so large cookie/auth headers
                // injected by a reverse-proxy/ingress don't break asset loading and /health.
                config.jetty.server { () =>
                    val server = new Server()
                    val httpConfig = new HttpConfiguration()
                    // Mirror Javalin's own default connector so this differs from it ONLY in header size:
                    httpConfig.setUriCompliance(UriCompliance.RFC3986)
                    httpConfig.setSendServerVersion(false)
                    httpConfig.setRequestHeaderSize(64 * 1024) // raised from Jetty's 8 KB default
                    val connector = new ServerConnector(server, new HttpConnectionFactory(httpConfig))
                    connector.setHost(appConfig.bindAddress.get)
                    connector.setPort(appConfig.internalHttpPort.get)
                    server.addConnector(connector)
                    server
                }
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
                            "basePath" -> basePathOf(appConfig.publicBaseUrl.get),
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
            .get("/health", ctx => {
                if GrpcServer.isRunning then
                    ctx.status(200)
                    ctx.result("ok")
                else
                    ctx.status(503)
                    ctx.result("fail")
            })
            .routes(PulsarAuthRoutes.routes)

    def run: IO[Throwable, Unit] = for
        config <- readConfig
        bindAddress <- ZIO.attempt(config.bindAddress.get)
        port <- ZIO.attempt(config.internalHttpPort.get)

        _ <- ZIO.logInfo(s"HTTP server listening on ${bindAddress}:$port")
        app <- ZIO.attempt(createApp(config))
        _ <- ZIO.attempt(app.start())
        _ <- ZIO.never
    yield ()
