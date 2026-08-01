package pulsar_auth

import io.javalin.apibuilder.EndpointGroup
import io.javalin.apibuilder.ApiBuilder._
import io.javalin.Javalin

import scala.jdk.CollectionConverters.*
import _root_.pulsar_auth
import _root_.pulsar_auth.{defaultPulsarAuth, jwtCredentialsDecoder, validCredentialsName, PulsarAuth}
import io.circe.parser.decode as decodeJson

object PulsarAuthRoutes:
    /** What every successful route writes into `Set-Cookie`. */
    private type SetCookie = (io.javalin.http.Context, PulsarAuth) => Unit

    def routes: EndpointGroup = routesWith()

    /** The cookie-hardening inputs are parameters defaulting to the process config - same reason as
      * `pulsarAuthToCookie`: the package-level `config` val is loaded once per process and cannot be
      * varied, so nothing could otherwise observe over HTTP that these routes really emit the
      * CONFIGURED Secure/SameSite attributes. `routes` keeps the production call site unchanged. */
    def routesWith(
        publicBaseUrl: Option[String] = config.publicBaseUrl,
        cookieSecure: Option[Boolean] = config.cookieSecure,
        cookieSameSite: Option[String] = config.cookieSameSite
    ): EndpointGroup =
        val setCookie: SetCookie =
            (ctx, pulsarAuth) => setCookieAndSuccess(ctx, pulsarAuth, publicBaseUrl, cookieSecure, cookieSameSite)

        () => {
            addCredentials(setCookie)
            useCredentials(setCookie)
            deleteCredentials(setCookie)
        }

    private def addCredentials(setCookie: SetCookie): Unit =
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
                            case DefaultCredentialsName =>
                                ctx.status(400)
                                ctx.result(s"Can't add credentials with name $DefaultCredentialsName")
                            case validCredentialsName() =>
                                val credentialsName = ctx.pathParam("credentialsName")

                                credentials match
                                    case Left(err) =>
                                        ctx.status(400)
                                        ctx.result(s"Unable to parse credentials JSON.\n ${err.getMessage}")
                                    case Right(credentials) =>
                                        if pulsarAuth.credentials.contains(credentialsName) then
                                            ctx.status(400)
                                            ctx.result(s"Credentials with this name already exist")
                                        else
                                            val newPulsarAuth = pulsarAuth.copy(
                                                current = Some(credentialsName),
                                                credentials = pulsarAuth.credentials + (credentialsName -> credentials)
                                            )
                                            setCookie(ctx, newPulsarAuth)
                            case _ =>
                                ctx.status(400)
                                ctx.result("Credentials name contains illegal characters. Only alphanumerics, underscores(_) and dashes(-) are allowed.")
        )

    private def useCredentials(setCookie: SetCookie): Unit =
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
                        // Selecting a name that isn't in the map used to succeed, after which every
                        // client construction failed and the interceptor answered UNAUTHENTICATED
                        // for all calls - a self-inflicted brick from one request.
                        else if !pulsarAuth.credentials.contains(credentialsName) then
                            ctx.status(404)
                            ctx.result(s"No credentials named '$credentialsName'")
                        else
                            val newPulsarAuth = pulsarAuth.copy(current = Some(credentialsName))
                            setCookie(ctx, newPulsarAuth)
        )

    private def deleteCredentials(setCookie: SetCookie): Unit =
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
                                case DefaultCredentialsName =>
                                    ctx.status(400)
                                    ctx.result(s"Can't delete default credentials")
                                // Deleting a name that isn't in the map used to answer 200 and still
                                // rewrite `current` - a typo silently changed which credentials every
                                // later Pulsar call ran under. Refuse, and write no cookie at all.
                                case credentialsName: String if !pulsarAuth.credentials.contains(credentialsName) =>
                                    ctx.status(404)
                                    ctx.result(s"No credentials named '$credentialsName'")
                                case credentialsName: String =>
                                    val newCredentials = pulsarAuth.credentials - credentialsName
                                    // `current` used to be reassigned unconditionally to
                                    // `newCredentials.keys.headOption`, so removing an UNRELATED
                                    // credential repointed the session at whatever came first in map
                                    // iteration order. The selection may only move when the deleted
                                    // name is the selected one - and then only to Default, which
                                    // setCookieAndSuccess guarantees still exists.
                                    val newCurrent =
                                        if pulsarAuth.current.contains(credentialsName) then Some(DefaultCredentialsName)
                                        else pulsarAuth.current

                                    setCookie(ctx, pulsarAuth.copy(credentials = newCredentials, current = newCurrent))
        )

    def setCookieAndSuccess(
        ctx: io.javalin.http.Context,
        pulsarAuth: PulsarAuth,
        publicBaseUrl: Option[String] = config.publicBaseUrl,
        cookieSecure: Option[Boolean] = config.cookieSecure,
        cookieSameSite: Option[String] = config.cookieSameSite
    ): Unit =
        def withNewDefaultAuth(pulsarAuth: PulsarAuth): PulsarAuth =
            // Dekaf admin can change default credentials,
            // so we need deliver new default credentials to users.
            pulsarAuth.copy(credentials =
                pulsarAuth.credentials + (
                    DefaultCredentialsName -> defaultPulsarAuth.credentials(DefaultCredentialsName)
                )
            )

        val newCookieHeader = pulsar_auth.pulsarAuthToCookie(withNewDefaultAuth(pulsarAuth), publicBaseUrl, cookieSecure, cookieSameSite)

        ctx.header(
            "Set-Cookie",
            newCookieHeader
        )
        ctx.status(200)
        ctx.result("OK")
