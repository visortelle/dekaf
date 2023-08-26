package pulsar_auth

import io.javalin.apibuilder.EndpointGroup
import io.javalin.apibuilder.ApiBuilder._
import io.javalin.Javalin

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import _root_.pulsar_auth.{defaultPulsarAuth, jwtCredentialsDecoder, PulsarAuth, validCredentialsName}
import io.circe.parser.decode as decodeJson

object PulsarAuthRoutes:
    val routes: EndpointGroup = () => {
        addCredentials()
        useCredentials()
        deleteCredentials()
    }

    private def addCredentials(): Unit =
        post(
            s"/pulsar-auth/add/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthCookie(pulsarAuthJson)

                pulsarAuth match
                    case Left(_) =>
                        ctx.status(400)
                        ctx.result("Unable to parse pulsar_auth cookie")
                    case Right(pulsarAuth) =>
                        val credentialsJson = ctx.body
                        val credentials = decodeJson[Credentials](credentialsJson)

                        ctx.pathParam("credentialsName") match
                            case credentialsName: DefaultCredentialsName =>
                                ctx.status(400)
                                ctx.result(s"Can't add credentials with name $credentialsName")
                            case validCredentialsName() =>
                                credentials match
                                    case Left(err) =>
                                        ctx.status(400)
                                        ctx.result(s"Unable to parse credentials JSON.\n ${err.getMessage}")
                                    case Right(credentials) =>
                                        val newPulsarAuth = pulsarAuth.copy(
                                            current = Some(ctx.pathParam("credentialsName")),
                                            credentials = pulsarAuth.credentials + (ctx.pathParam("credentialsName") -> credentials)
                                        )
                                        setCookieAndSuccess(ctx, newPulsarAuth)
                            case _ =>
                                ctx.status(400)
                                ctx.result("Credentials name contains illegal characters. Only alphanumerics, underscores(_) and dashes(-) are allowed.")
        )

    private def useCredentials(): Unit =
        post(
            s"/pulsar-auth/use/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthCookie(pulsarAuthJson)

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
                            setCookieAndSuccess(ctx, newPulsarAuth)
        )

    private def deleteCredentials(): Unit =
        post(
            "/pulsar-auth/delete/{credentialsName}",
            ctx =>
                val pulsarAuthJson = Option(ctx.cookie("pulsar_auth"))
                val pulsarAuth = pulsar_auth.parsePulsarAuthCookie(pulsarAuthJson)

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
                            credentialsName match
                                case credentialsName: DefaultCredentialsName =>
                                    ctx.status(400)
                                    ctx.result(s"Can't delete default credentials")
                                case credentialsName: String =>
                                    val newCredentials = pulsarAuth.credentials - credentialsName
                                    val newPulsarAuth = pulsarAuth.copy(credentials = newCredentials, current = newCredentials.keys.headOption.orElse(Some("Default")))

                                    setCookieAndSuccess(ctx, newPulsarAuth)
        )

    def setCookieAndSuccess(ctx: io.javalin.http.Context, pulsarAuth: PulsarAuth): Unit =
        val newCookieHeader = pulsar_auth.pulsarAuthToCookie(pulsarAuth)
        ctx.header(
            "Set-Cookie",
            newCookieHeader
        )
        ctx.status(200)
        ctx.result("OK")
