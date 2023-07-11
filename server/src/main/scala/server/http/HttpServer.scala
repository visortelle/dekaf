package server.http

import zio.*
import zio.ZIOAppDefault
import _root_.config.{readConfig, Config}
import io.javalin.Javalin
import io.javalin.rendering.template.JavalinFreemarker
import io.javalin.http.staticfiles.{Location, StaticFileConfig}

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
                    setCookieAndSuccess(ctx, pulsarAuth)

                    ctx.render("/ui/index.ftl", model)
                }
            )
        }
        .get("/health", ctx => ctx.result("OK"))
        // TODO: move "/pulsar-auth/*" endpoints to the pulsar_auth package
        .post(
            "/pulsar-auth/delete/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthJson(pulsarAuthJson)

                pulsarAuth match
                    case Left(_) =>
                        ctx.status(400)
                        ctx.result(s"Unable to parse pulsar_auth cookie")
                    case Right(pulsarAuth) =>
                        val credentialsName = ctx.pathParam("credentialsName")
                        if credentialsName.isBlank then
                            ctx.status(400)
                            ctx.result("Credentials name shouldn't be blank")
                        else
                            val newPulsarAuth = pulsarAuth.copy(credentials = pulsarAuth.credentials - credentialsName)

                            if newPulsarAuth.credentials.isEmpty ||
                                (newPulsarAuth.credentials.head._1 == "Default") then
                                setCookieAndSuccess(ctx, defaultPulsarAuth)
                            else
                                setCookieAndSuccess(ctx, newPulsarAuth)
        )
        .post(
            s"/pulsar-auth/add/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthJson(pulsarAuthJson)

                pulsarAuth match
                    case Left(_) =>
                        ctx.status(400)
                        ctx.result("Unable to parse pulsar_auth cookie")
                    case Right(pulsarAuth) =>
                        val credentialsJson = ctx.body
                        val credentials = decodeJson[pulsar_auth.JwtCredentials](credentialsJson)

                        ctx.pathParam("credentialsName") match
                            case validCredentialsName() =>
                                credentials match
                                    case Left(err) =>
                                        ctx.status(400)
                                        ctx.result(s"Unable to parse credentials JSON.\n ${err.getMessage}")
                                    case Right(credentials) =>
                                        val newPulsarAuth = pulsarAuth.copy(
                                            credentials = pulsarAuth.credentials + (ctx.pathParam("credentialsName") -> credentials)
                                        )
                                        setCookieAndSuccess(ctx, newPulsarAuth)
                            case _ =>
                                ctx.status(400)
                                ctx.result("Credentials name contains illegal characters. Only alphanumerics, underscores(_) and dashes(-) are allowed.")
        )
        .post(
            s"/pulsar-auth/use/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthJson(pulsarAuthJson)

                pulsarAuth match
                    case Left(_) =>
                        ctx.status(400)
                        ctx.result("Unable to parse pulsar_auth cookie")
                    case Right(pulsarAuth) =>
                        val credentialsName = ctx.pathParam("credentialsName")
                        if credentialsName.isBlank then
                            ctx.status(400)
                            ctx.result("Credentials name shouldn't be blank")
                        else
                            val newPulsarAuth = pulsarAuth.copy(current = Some(credentialsName))
                            val newCookieHeader = pulsar_auth.pulsarAuthToCookie(newPulsarAuth)
                            ctx.header(
                                "Set-Cookie",
                                newCookieHeader
                            )
                            ctx.status(200)
                            ctx.result("OK")
        )

    def setCookieAndSuccess(ctx: io.javalin.http.Context, pulsarAuth: PulsarAuth): Unit =
        val newCookieHeader = pulsar_auth.pulsarAuthToCookie(pulsarAuth)
        ctx.header(
            "Set-Cookie",
            newCookieHeader
        )
        ctx.status(200)
        ctx.result("OK")

    val run: IO[Throwable, Unit] = for
        config <- readConfig
        port <- ZIO.attempt(config.internal.get.httpPort)

        _ <- ZIO.logInfo(s"HTTP server listening on port $port")
        app <- ZIO.succeed(createApp(config))
        _ <- ZIO.attempt(app.start(port))
    yield ()
