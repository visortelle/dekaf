package server.http

import _root_.config.{Config, readConfig}
import _root_.pulsar_auth
import _root_.pulsar_auth.{PulsarAuthRoutes, defaultPulsarAuth}
import io.javalin.Javalin
import io.javalin.http.staticfiles.{Location, StaticFileConfig}
import io.javalin.rendering.template.JavalinFreemarker
import jakarta.servlet.ServletConfig
import jakarta.servlet.http.HttpServletRequest
import org.eclipse.jetty.client.api.Request
import org.eclipse.jetty.proxy.AsyncProxyServlet
import org.eclipse.jetty.servlet.ServletHolder
import zio.*

import scala.jdk.CollectionConverters.*

object HttpServer:
    private val isBinaryBuild = buildinfo.ExtraBuildInfo.isBinaryBuild

    private class CustomProxyServlet extends AsyncProxyServlet.Transparent {
        private var authHeaderValue: String = _

        override def init(config: ServletConfig): Unit = {
            super.init(config)
            authHeaderValue = config.getServletContext.getAttribute("authHeaderValue").asInstanceOf[String]
        }

        override def addProxyHeaders(clientRequest: HttpServletRequest, proxyRequest: Request): Unit = {
            super.addProxyHeaders(clientRequest, proxyRequest)
                if (authHeaderValue != null) {
                proxyRequest.header("Authorization", authHeaderValue)
            }
        }
    }

    /*
    For future use, if we want to proxy websockets for Grafana live.
    Possible solution:
        https://github.com/klemela/switch-over-proxy/blob/3dfadc9972855629fdaff2fe9615cf01ac7cb2f3/src/main/java/fi/csc/chipster/proxy/WebSocketProxyServlet.java

    private class WebSocketProxyServlet extends JettyWebSocketServlet {
        private var authHeaderValue: String = _

        override def init(config: ServletConfig): Unit = {
            super.init(config)
            authHeaderValue = config.getServletContext.getAttribute("authHeaderValue").asInstanceOf[String]
        }

        override def configure(factory: JettyWebSocketServletFactory): Unit = {
            factory.setCreator((req, res) => {
                new WebSocketListener() {

                }
            })
        }
    } */

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
                            "publicUrl" -> appConfig.publicUrl.get,
                            "buildInfo" -> buildinfo.BuildInfo.toMap.asJava,
                            "pulsarBrokerUrl" -> appConfig.pulsarBrokerUrl.get,
                            "pulsarHttpUrl" -> appConfig.pulsarHttpUrl.get,
                            "pulsarName" -> appConfig.pulsarName.get,
                            "pulsarColor" -> appConfig.pulsarColor.get,
                        ).asJava

                        val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                        val pulsarAuth = pulsar_auth.parsePulsarAuthJson(pulsarAuthJson).getOrElse(defaultPulsarAuth)
                        PulsarAuthRoutes.setCookieAndSuccess(ctx, pulsarAuth)

                        ctx.render("/ui/index.ftl", model)
                    }
                )

                config.jetty.contextHandlerConfig((sch) => {
                    appConfig.proxies.getOrElse(List.empty).foreach { proxyConfig =>
                        val proxyServlet = new ServletHolder(classOf[CustomProxyServlet])
                        proxyServlet.setInitParameter("proxyTo", s"${proxyConfig.destination}")
                        proxyServlet.setInitParameter("prefix", s"/${proxyConfig.resource}")

                        proxyConfig.headers.getOrElse(Map.empty).find(_._1 == "Authorization") match
                            case Some(header) => sch.setAttribute("authHeaderValue", header._2)
                            case None         => sch.setAttribute("authHeaderValue", null)

                        sch.addServlet(proxyServlet, s"/${proxyConfig.resource}/*")
                    }
                })
            }
            .get("/health", ctx => ctx.result("OK"))
            .routes(PulsarAuthRoutes.routes)

    def run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internalHttpPort.get)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.attempt(createApp(config))
        _ <- ZIO.attempt(app.start(port))
    yield ()
