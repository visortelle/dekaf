package pulsar_auth

import zio.*
import zio.test.*

import io.javalin.Javalin

import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import scala.jdk.OptionConverters.*

/** The add/use/delete routes under `/pulsar-auth`, over real HTTP.
  *
  * `pulsarAuthCookieTest` covers `pulsarAuthToCookie`/`parsePulsarAuthCookie` as functions, but the
  * routes are what a browser actually talks to, and everything between the function and the wire was
  * untested: whether the configured hardening attributes reach `Set-Cookie` at all, whether a cookie
  * value carrying `+`/`%` in `authParams` survives being handed to a client and sent back (the value
  * is URL-encoded on write and URL-decoded on read, and it travels through Jetty's cookie parser in
  * between), and whether a rejected request leaves the caller's current credential alone.
  *
  * Real Javalin on an ephemeral port and a real `java.net.http` client - no servlet stubs. The
  * cookie config is passed to `routesWith` because the process-level `config` val loads once per JVM
  * and cannot be varied.
  */
object pulsarAuthRoutesHttpTest extends ZIOSpecDefault:

    /** `+` and `%` are the two characters the encode/decode pairing gets wrong when it drifts, and
      * `authParams` is where a token or password lives. */
    private val authParams = "token:a+b%2Fc"

    private val credentials = AuthParamsStringCredentials(
        `type` = "authParamsString",
        authPluginClassName = "org.apache.pulsar.client.impl.auth.AuthenticationToken",
        authParams = authParams
    )

    private val credentialsJson =
        s"""{"type":"authParamsString","authPluginClassName":"${credentials.authPluginClassName}","authParams":"$authParams"}"""

    private val client = HttpClient.newHttpClient()

    private case class Response(status: Int, body: String, setCookie: Option[String]):
        /** The cookie value a browser would store and send back. */
        def cookieHeader: String = "pulsar_auth=" + setCookie.getOrElse("").stripPrefix("pulsar_auth=").takeWhile(_ != ';')

        /** The attribute segment - everything the browser enforces. */
        def attributes: String = setCookie.getOrElse("").dropWhile(_ != ';')

        /** The attribute TOKENS, from splitting the whole header the way a browser does. Unlike
          * `attributes.contains(...)`, asserting this list exactly surfaces an injected `;` in the
          * value - the smuggled attribute (and the JSON tail) show up as extra elements. */
        def attributeList: List[String] =
            setCookie.getOrElse("").split(";", -1).toList.map(_.trim).drop(1).filter(_.nonEmpty)

        def parsedAuth: Either[Throwable, PulsarAuth] =
            parsePulsarAuthCookie(Some(cookieHeader.stripPrefix("pulsar_auth=")))

    private def post(base: String, path: String, body: String = "", cookie: Option[String] = None): Task[Response] =
        ZIO.attemptBlocking {
            val builder = HttpRequest.newBuilder(URI.create(s"$base$path")).POST(HttpRequest.BodyPublishers.ofString(body))
            cookie.foreach(c => builder.header("Cookie", c))
            val response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString())
            Response(response.statusCode, response.body, response.headers.firstValue("Set-Cookie").toScala)
        }

    private def serve[A](
        publicBaseUrl: Option[String] = None,
        cookieSecure: Option[Boolean] = None,
        cookieSameSite: Option[String] = None
    )(use: String => Task[A]): Task[A] =
        ZIO.acquireReleaseWith(
            ZIO.attemptBlocking {
                Javalin
                    .create(config => config.showJavalinBanner = false)
                    .routes(PulsarAuthRoutes.routesWith(publicBaseUrl, cookieSecure, cookieSameSite))
                    .start(0)
            }
        )(app => ZIO.attemptBlocking(app.stop()).ignore)(app => use(s"http://localhost:${app.port()}"))

    def spec = suite(this.getClass.toString)(
        test("the configured Secure/SameSite attributes reach the Set-Cookie header") {
            // The routes render the cookie themselves. A correct `pulsarAuthToCookie` proves nothing
            // if the route calls it with the wrong inputs (or drops the header), and this credential
            // is the session's Pulsar authentication - Secure/SameSite/HttpOnly are what stop it
            // travelling in clear text or riding along on a cross-site request.
            serve(publicBaseUrl = Some("http://gateway.example/dekaf"), cookieSecure = Some(true), cookieSameSite = Some("strict")) { base =>
                for response <- post(base, "/pulsar-auth/add/prod", credentialsJson)
                yield assertTrue(
                    response.status == 200,
                    response.setCookie.isDefined,
                    response.attributes.contains("Secure"),
                    response.attributes.contains("SameSite=Strict"),
                    response.attributes.contains("HttpOnly"),
                    response.attributes.contains("Path=/dekaf"),
                    response.attributes.contains("Max-Age=31536000")
                ) ?? s"Set-Cookie: ${response.setCookie}"
            }
        },
        test("SameSite=None is withheld over plain HTTP, where a browser would reject the whole cookie") {
            serve(cookieSecure = Some(false), cookieSameSite = Some("none")) { base =>
                for response <- post(base, "/pulsar-auth/add/prod", credentialsJson)
                yield assertTrue(
                    response.status == 200,
                    !response.attributes.contains("SameSite"),
                    !response.attributes.contains("Secure")
                ) ?? s"Set-Cookie: ${response.setCookie}"
            }
        },
        test("a hostile authPluginClassName in the add body cannot inject Set-Cookie attributes or corrupt the credential") {
            // REGRESSION (HIGH) - `authPluginClassName` arrives as free text in the add BODY (only
            // the {credentialsName} path segment is charset-validated) and was interpolated raw
            // into the Set-Cookie header; JSON does not escape `;`. So this body truncated the
            // stored cookie at the `;` (every later request failed to parse - silent credential
            // corruption) and `Domain=evil.example` became a real attribute of a server-emitted
            // cookie. The whole JSON value is URL-encoded now; this drives the actual attack
            // surface end to end: hostile body in, header out, cookie back in through real Jetty.
            val hostileClassName = "org.x.Auth; Domain=evil.example"
            val hostileJson = s"""{"type":"authParamsString","authPluginClassName":"$hostileClassName","authParams":"token:secret"}"""
            serve() { base =>
                for
                    added <- post(base, "/pulsar-auth/add/prod", hostileJson)
                    reused <- post(base, "/pulsar-auth/use/prod", cookie = Some(added.cookieHeader))
                yield assertTrue(
                    added.status == 200,
                    // exactly the server's own attributes - in particular no Domain
                    added.attributeList == List("Path=/", "HttpOnly", "Max-Age=31536000"),
                    // the credential survives the full round trip un-truncated
                    reused.status == 200,
                    reused.parsedAuth.map(_.credentials.get("prod")) == Right(Some(AuthParamsStringCredentials(
                        `type` = "authParamsString",
                        authPluginClassName = hostileClassName,
                        authParams = "token:secret"
                    )))
                ) ?? s"added=${added.setCookie} reused=${reused.setCookie}"
            }
        },
        test("a credential with + and % in authParams survives a full HTTP cookie round trip") {
            // Write path: the route URL-encodes authParams into the cookie. Read path: the whole
            // cookie value is URL-decoded. If those two ever disagree again, `+` becomes a space and
            // `%xx` is eaten - and the failure is a broken Pulsar connection, not a parse error.
            // Sending the cookie back to /use/{name} is the tight oracle: that route answers 200
            // only if the server re-read the credential map out of the cookie it just issued.
            serve() { base =>
                for
                    added <- post(base, "/pulsar-auth/add/prod", credentialsJson)
                    reused <- post(base, "/pulsar-auth/use/prod", cookie = Some(added.cookieHeader))
                yield assertTrue(
                    added.status == 200,
                    reused.status == 200,
                    added.parsedAuth.map(_.credentials.get("prod")) == Right(Some(credentials)),
                    reused.parsedAuth.map(_.credentials.get("prod")) == Right(Some(credentials)),
                    reused.parsedAuth.map(_.current) == Right(Some("prod"))
                ) ?? s"added=${added.setCookie} reused=${reused.setCookie}"
            }
        },
        test("an unknown /use/{name} is a 404 that does not touch the current cookie") {
            // REGRESSION - selecting a name that is not in the map used to succeed and write it into
            // the cookie, after which every client construction failed and the interceptor answered
            // UNAUTHENTICATED for every call: one request bricked the session. The route must both
            // refuse AND leave the caller's cookie alone, so no Set-Cookie may be written at all.
            serve() { base =>
                for
                    added <- post(base, "/pulsar-auth/add/prod", credentialsJson)
                    // control: a name that DOES exist still switches, so the assertions below are not vacuous
                    known <- post(base, "/pulsar-auth/use/Default", cookie = Some(added.cookieHeader))
                    unknown <- post(base, "/pulsar-auth/use/nope", cookie = Some(added.cookieHeader))
                yield assertTrue(
                    known.status == 200,
                    known.parsedAuth.map(_.current) == Right(Some("Default")),
                    unknown.status == 404,
                    unknown.setCookie.isEmpty,
                    unknown.body.contains("nope")
                ) ?? s"known=${known.status}/${known.setCookie} unknown=${unknown.status}/${unknown.setCookie}"
            }
        },
        test("deleting a credential that is not the current one leaves the selection alone") {
            // REGRESSION - delete unconditionally reassigned
            // `current = newCredentials.keys.headOption.orElse(Some("Default"))`, so removing an
            // unrelated credential silently repointed the session at whatever key happened to come
            // first in map iteration order. The user deletes a stale entry and their next Pulsar
            // call runs under different (often Default/empty) credentials - an authorization change
            // nobody asked for and nothing reports.
            serve() { base =>
                for
                    aaa <- post(base, "/pulsar-auth/add/aaa", credentialsJson)
                    bbb <- post(base, "/pulsar-auth/add/bbb", credentialsJson, cookie = Some(aaa.cookieHeader))
                    ccc <- post(base, "/pulsar-auth/add/ccc", credentialsJson, cookie = Some(bbb.cookieHeader))
                    deleted <- post(base, "/pulsar-auth/delete/aaa", cookie = Some(ccc.cookieHeader))
                    // oracle: the deleted name is really gone from the cookie the delete handed back
                    reuseDeleted <- post(base, "/pulsar-auth/use/aaa", cookie = Some(deleted.cookieHeader))
                    reuseSurvivor <- post(base, "/pulsar-auth/use/bbb", cookie = Some(deleted.cookieHeader))
                yield assertTrue(
                    ccc.parsedAuth.map(_.current) == Right(Some("ccc")),
                    deleted.status == 200,
                    deleted.parsedAuth.map(_.current) == Right(Some("ccc")),
                    deleted.parsedAuth.map(_.credentials.keySet) == Right(Set("Default", "bbb", "ccc")),
                    reuseDeleted.status == 404,
                    reuseSurvivor.status == 200
                ) ?? s"beforeDelete=${ccc.setCookie} afterDelete=${deleted.setCookie}"
            }
        },
        test("deleting the current credential falls back to Default, never to a name that is gone") {
            // The other half of the contract: `current` may only change when it names the credential
            // actually removed, and it must then land on a credential that still exists. Default is
            // always present (setCookieAndSuccess re-adds it on every response).
            serve() { base =>
                for
                    aaa <- post(base, "/pulsar-auth/add/aaa", credentialsJson)
                    bbb <- post(base, "/pulsar-auth/add/bbb", credentialsJson, cookie = Some(aaa.cookieHeader))
                    deleted <- post(base, "/pulsar-auth/delete/bbb", cookie = Some(bbb.cookieHeader))
                    reuseDeleted <- post(base, "/pulsar-auth/use/bbb", cookie = Some(deleted.cookieHeader))
                yield assertTrue(
                    bbb.parsedAuth.map(_.current) == Right(Some("bbb")), // it really was current
                    deleted.status == 200,
                    deleted.parsedAuth.map(_.current) == Right(Some("Default")),
                    deleted.parsedAuth.map(_.credentials.keySet) == Right(Set("Default", "aaa")),
                    reuseDeleted.status == 404
                ) ?? s"beforeDelete=${bbb.setCookie} afterDelete=${deleted.setCookie}"
            }
        },
        test("deleting an unknown credential is a 404 that does not touch the current cookie") {
            // Deleting `/nope` answered 200 AND rewrote `current` - a typo could switch the session's
            // authentication. Refuse, and write no cookie at all. Deleting Default is a separate,
            // pre-existing 400 and is pinned here so the new 404 branch cannot swallow it.
            serve() { base =>
                for
                    aaa <- post(base, "/pulsar-auth/add/aaa", credentialsJson)
                    bbb <- post(base, "/pulsar-auth/add/bbb", credentialsJson, cookie = Some(aaa.cookieHeader))
                    unknown <- post(base, "/pulsar-auth/delete/nope", cookie = Some(bbb.cookieHeader))
                    default <- post(base, "/pulsar-auth/delete/Default", cookie = Some(bbb.cookieHeader))
                    // control: a name that DOES exist is still deletable, so the refusals are not vacuous
                    known <- post(base, "/pulsar-auth/delete/aaa", cookie = Some(bbb.cookieHeader))
                yield assertTrue(
                    unknown.status == 404,
                    unknown.setCookie.isEmpty,
                    unknown.body.contains("nope"),
                    default.status == 400,
                    default.setCookie.isEmpty,
                    known.status == 200,
                    known.parsedAuth.map(_.credentials.keySet) == Right(Set("Default", "bbb"))
                ) ?? s"unknown=${unknown.status}/${unknown.setCookie} default=${default.status} known=${known.status}"
            }
        }
    ) @@ TestAspect.sequential
