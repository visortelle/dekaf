package pulsar_auth

import zio.test.*
import ch.qos.logback.classic.{Logger as LogbackLogger}
import ch.qos.logback.classic.spi.ILoggingEvent
import org.slf4j.LoggerFactory
import scala.jdk.CollectionConverters.*

/** Cookie construction + parsing. This carries the session credential (tokens, OAuth2 private keys,
  * auth-param strings), so both the hardening attributes and the encode/decode round-trip matter.
  *
  * Regression context: `Secure` was computed and then never interpolated into the header (the
  * SameSite fragment was interpolated twice instead), so the cookie could never be marked Secure.
  * Later: the JSON value was interpolated raw into the header, so a `;` inside any raw field
  * (authPluginClassName, credential names) truncated the stored credential and injected cookie
  * attributes - the value is whole-encoded now, and the oracle below parses the full header so an
  * injected attribute can never hide from the assertions again.
  */
object pulsarAuthCookieTest extends ZIOSpecDefault:

    private def auth(creds: (String, Credentials)*): PulsarAuth =
        PulsarAuth(current = Some(creds.headOption.map(_._1).getOrElse("Default")), credentials = creds.toMap)

    private val empty = auth("Default" -> EmptyCredentials(`type` = "empty"))

    /** Parse the Set-Cookie header the way a browser tokenizes it: everything before the first `;`
      * is `name=value`, every further `;`-separated token is an attribute. The old oracle extracted
      * the value with `takeWhile(_ != ';')` and looked no further - structurally blind to an
      * injected `;`, which simply truncated what it looked at. Splitting the WHOLE header and
      * asserting the attribute list EXACTLY is what makes a smuggled attribute visible. */
    private def parseSetCookie(header: String): (String, List[String]) =
        val parts = header.split(";", -1).toList.map(_.trim)
        (parts.head, parts.tail.filter(_.nonEmpty))

    /** The value a browser would store and send back. */
    private def valueOf(cookie: String): String =
        parseSetCookie(cookie)._1.stripPrefix("pulsar_auth=")

    /** The attribute tokens after the value - everything the browser enforces. */
    private def attributeListOf(cookie: String): List[String] =
        parseSetCookie(cookie)._2

    // ---- log capture (for the no-credential-in-logs test). The "pulsar-auth" logger is shared
    // with parallel suites, so assertions key on content UNIQUE to the test, never on counts. ----

    /** A thread-safe capture appender - parallel suites append to the same logger while we
      * snapshot, and logback's own ListAppender backs onto a plain ArrayList. */
    private final class QueueAppender extends ch.qos.logback.core.AppenderBase[ILoggingEvent]:
        val events = new java.util.concurrent.ConcurrentLinkedQueue[ILoggingEvent]()
        override def append(event: ILoggingEvent): Unit =
            events.add(event)
            ()

    // SLF4J hands a SubstituteLogger to callers that arrive while the backend is still
    // initializing; re-fetch until the real logback binding is in place (milliseconds).
    private def pulsarAuthLogbackLogger(): LogbackLogger =
        var logger = LoggerFactory.getLogger("pulsar-auth")
        var attempts = 0
        while !logger.isInstanceOf[LogbackLogger] && attempts < 500 do
            Thread.sleep(2)
            logger = LoggerFactory.getLogger("pulsar-auth")
            attempts += 1
        logger match
            case l: LogbackLogger => l
            case other            => throw new IllegalStateException(s"Expected a logback logger, got ${other.getClass.getName}")

    private def withCapturedPulsarAuthLogs[A](body: => A): (A, List[String]) =
        val logbackLogger = pulsarAuthLogbackLogger()
        val appender = new QueueAppender()
        appender.start()
        logbackLogger.addAppender(appender)
        try
            val result = body
            (result, appender.events.asScala.toList.map(_.getFormattedMessage))
        finally
            logbackLogger.detachAppender(appender)
            appender.stop()

    def spec = suite(this.getClass.toString)(
        test("Secure is emitted when cookieSecure is true") {
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = None)
            assertTrue(attributeListOf(cookie).contains("Secure"))
        },
        test("Secure is absent when cookieSecure is false or unset") {
            val off = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = None)
            val unset = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            assertTrue(
                !attributeListOf(off).contains("Secure"),
                !attributeListOf(unset).contains("Secure")
            )
        },
        test("SameSite appears exactly once") {
            // It used to be interpolated twice, which is also how the Secure fragment went missing.
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("strict"))
            val occurrences = "SameSite".r.findAllIn(cookie).size
            assertTrue(occurrences == 1) ?? s"SameSite occurred $occurrences times in: $cookie"
        },
        test("Secure and SameSite are emitted together when both are configured") {
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("lax"))
            val attrs = attributeListOf(cookie)
            assertTrue(attrs.contains("Secure"), attrs.contains("SameSite=Lax"))
        },
        test("SameSite=None is only emitted when the cookie is also Secure") {
            // Browsers reject SameSite=None without Secure, so emitting it alone would break auth.
            val secure = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("none"))
            val insecure = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = Some("none"))
            assertTrue(
                attributeListOf(secure).contains("SameSite=None"),
                !attributeListOf(insecure).exists(_.contains("SameSite"))
            )
        },
        test("lax and strict are emitted regardless of Secure") {
            val lax = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some("lax"))
            val strict = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some("strict"))
            assertTrue(
                attributeListOf(lax).contains("SameSite=Lax"),
                attributeListOf(strict).contains("SameSite=Strict")
            )
        },
        test("the cookie is always HttpOnly and long-lived") {
            val attrs = attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None))
            assertTrue(attrs.contains("HttpOnly"), attrs.contains("Max-Age=31536000"))
        },
        test("Path is derived from publicBaseUrl, defaulting to /") {
            val default = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val rooted = pulsarAuthToCookie(empty, publicBaseUrl = Some("http://host:8090"), cookieSecure = None, cookieSameSite = None)
            val subPath = pulsarAuthToCookie(empty, publicBaseUrl = Some("http://host:8090/dekaf"), cookieSecure = None, cookieSameSite = None)
            assertTrue(
                attributeListOf(default).contains("Path=/"),
                attributeListOf(rooted).contains("Path=/"),
                attributeListOf(subPath).contains("Path=/dekaf")
            )
        },
        test("the attribute list is exactly the configured set - nothing more, nothing less") {
            // Presence checks alone cannot catch an EXTRA attribute riding along, and an injected
            // attribute is precisely an extra one. Pin the exact list for both config extremes.
            val minimal = attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None))
            val full = attributeListOf(
                pulsarAuthToCookie(empty, publicBaseUrl = Some("http://host:8090/dekaf"), cookieSecure = Some(true), cookieSameSite = Some("lax"))
            )
            assertTrue(
                minimal == List("Path=/", "HttpOnly", "Max-Age=31536000"),
                full == List("Path=/dekaf", "HttpOnly", "Max-Age=31536000", "Secure", "SameSite=Lax")
            ) ?? s"minimal=$minimal full=$full"
        },
        test("cookieSameSite is matched case-insensitively and trimmed") {
            // REGRESSION (fixed 2026-07-25) - the match required exact lowercase, so `Lax`/`STRICT`
            // (and a stray trailing space from YAML) fell through to "" and emitted NO SameSite
            // attribute. The operator saw a configured value; the browser got its default. Silently
            // dropping a CSRF control on a capitalisation difference is the bug this pins.
            val cases = List(
                "lax" -> "SameSite=Lax",
                "Lax" -> "SameSite=Lax",
                "LAX" -> "SameSite=Lax",
                " lax " -> "SameSite=Lax",
                "strict" -> "SameSite=Strict",
                "Strict" -> "SameSite=Strict",
                "STRICT" -> "SameSite=Strict",
                "\tStRiCt\n" -> "SameSite=Strict"
            )
            val wrong = cases.filterNot: (configured, expected) =>
                attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some(configured))).contains(expected)
            assertTrue(wrong.isEmpty) ?? s"these did not produce their attribute: ${wrong.map(_._1).mkString("|")}"
        },
        test("cookieSameSite=none is matched case-insensitively too, and still requires Secure") {
            val variants = List("none", "None", "NONE", " none ")
            val emitted = variants.filter: v =>
                attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some(v))).contains("SameSite=None")
            val leakedWithoutSecure = variants.filter: v =>
                attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = Some(v))).exists(_.contains("SameSite"))
            assertTrue(
                emitted == variants,
                leakedWithoutSecure.isEmpty
            ) ?? s"emitted=$emitted leakedWithoutSecure=$leakedWithoutSecure"
        },
        test("an unknown or blank cookieSameSite value emits no SameSite attribute") {
            // Unrecognised values stay omitted (a warning is logged) - the fix widened what counts
            // as recognised, it did not start emitting arbitrary operator input into the header.
            val ignored = List("bogus", "", "   ", "lax; Domain=evil.example", "same-site=lax")
            val emitted = ignored.filter: v =>
                attributeListOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some(v))).exists(_.contains("SameSite"))
            assertTrue(emitted.isEmpty) ?? s"these emitted a SameSite attribute: ${emitted.mkString("|")}"
        },
        test("a configured cookieSameSite never injects extra cookie attributes") {
            // The value is interpolated straight into the Set-Cookie header, so an operator value
            // carrying `;` must not be able to append attributes of its own.
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("lax; Domain=evil.example"))
            assertTrue(!cookie.contains("evil.example"))
        },
        test("a hostile authPluginClassName cannot truncate the credential or inject cookie attributes") {
            // REGRESSION - the per-field encoding scheme covered authParams and the OAuth2 fields
            // but wrote authPluginClassName (free text from the /pulsar-auth/add BODY - only the
            // name path segment is charset-validated) raw into the header, and JSON does not escape
            // `;`. The browser stores a cookie only up to the first `;`, so the stored credential
            // was truncated JSON (the next request failed to parse - silent auth corruption) and
            // `Domain=evil.example` became a REAL attribute of a server-emitted cookie. Worse,
            // setCookieAndSuccess re-injects the operator-configured Default credentials into
            // EVERY response, so one bad configured value rewrote the header for every user.
            val hostile = auth(
                "prod" -> AuthParamsStringCredentials(
                    `type` = "authParamsString",
                    authPluginClassName = "org.x.Auth; Domain=evil.example",
                    authParams = "token:secret; Path=/pwned"
                )
            )
            val cookie = pulsarAuthToCookie(hostile, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("strict"))
            assertTrue(
                // what the browser stores parses back to exactly what was written - no truncation
                parsePulsarAuthCookie(Some(valueOf(cookie))) == Right(hostile),
                // and the attribute list is exactly the server's own - no smuggled Domain/Path
                attributeListOf(cookie) == List("Path=/", "HttpOnly", "Max-Age=31536000", "Secure", "SameSite=Strict")
            ) ?? s"cookie=$cookie"
        },
        test("hostile credential names cannot truncate the credential or inject cookie attributes") {
            // Credential names are charset-validated on /pulsar-auth/add, but parsePulsarAuthCookie
            // performs NO name validation - a hand-crafted cookie can carry any map keys and any
            // `current`, and setCookieAndSuccess echoes them straight back into Set-Cookie. The
            // writer must therefore never trust the names either.
            val hostileName = "evil; Domain=evil.example"
            val hostile = PulsarAuth(
                current = Some(hostileName),
                credentials = Map(
                    hostileName -> JwtCredentials(`type` = "jwt", token = "aaa.bbb.ccc"),
                    "Default" -> EmptyCredentials(`type` = "empty")
                )
            )
            val cookie = pulsarAuthToCookie(hostile, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            assertTrue(
                parsePulsarAuthCookie(Some(valueOf(cookie))) == Right(hostile),
                attributeListOf(cookie) == List("Path=/", "HttpOnly", "Max-Age=31536000")
            ) ?? s"cookie=$cookie"
        },
        // ---- round-trip: what is written must read back identically ----
        test("an empty credential round-trips through the cookie") {
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(empty))
        },
        test("a jwt credential round-trips through the cookie") {
            val jwt = auth("Default" -> JwtCredentials(`type` = "jwt", token = "aaa.bbb.ccc"))
            val cookie = pulsarAuthToCookie(jwt, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(jwt))
        },
        test("an authParamsString credential round-trips, including + and % in authParams") {
            // REGRESSION (fixed 2026-07-25) - pulsarAuthToCookie used to URL-encode ONLY the OAuth2 fields, but
            // parsePulsarAuthCookie URL-DECODES the whole cookie value. So authParams (which carries
            // passwords/tokens) is written raw and read decoded: `+` becomes a space and `%xx` is
            // eaten. Asserting the correct behavior - the round trip must be lossless.
            val creds = AuthParamsStringCredentials(
                `type` = "authParamsString",
                authPluginClassName = "org.apache.pulsar.client.impl.auth.AuthenticationToken",
                authParams = "token:a+b%2Fc"
            )
            val a = auth("Default" -> creds)
            val cookie = pulsarAuthToCookie(a, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(a))
        },
        test("an oauth2 credential round-trips, including a private key with + / and = in it") {
            // The four oauth2 fields are URL-encoded individually while the READ decodes the whole
            // cookie once, so this is the pairing most likely to drift. A base64 private key is the
            // realistic payload: it is full of the exact characters URL coding rewrites.
            val creds = OAuth2Credentials(
                `type` = "oauth2",
                issuerUrl = "https://issuer.example.com/oauth2/token?tenant=a b",
                privateKey = "MIIEvQIBADAN+Bg/kqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ==",
                audience = Some("urn:dekaf:audience with spaces"),
                scope = Some("read write+admin")
            )
            val a = auth("Default" -> creds)
            val cookie = pulsarAuthToCookie(a, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(a))
        },
        test("optional oauth2 fields round-trip as None") {
            val creds = OAuth2Credentials(
                `type` = "oauth2",
                issuerUrl = "https://issuer.example.com",
                privateKey = "key",
                audience = None,
                scope = None
            )
            val a = auth("Default" -> creds)
            val cookie = pulsarAuthToCookie(a, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(a))
        },
        test("several credentials round-trip together and `current` selects among them") {
            // Every real deployment holds more than one entry; the map and the selected name have to
            // survive together, or switching credentials silently reverts.
            val a = PulsarAuth(
                current = Some("staging"),
                credentials = Map(
                    "Default" -> EmptyCredentials(`type` = "empty"),
                    "staging" -> JwtCredentials(`type` = "jwt", token = "aaa.bbb.ccc"),
                    "prod" -> AuthParamsStringCredentials(
                        `type` = "authParamsString",
                        authPluginClassName = "org.apache.pulsar.client.impl.auth.AuthenticationToken",
                        authParams = "token:x+y%2Fz"
                    )
                )
            )
            val cookie = pulsarAuthToCookie(a, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = valueOf(cookie)
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(a))
        },
        test("a credential whose type does not match its shape is rejected") {
            // credentialsDecoder tries each decoder in turn and takes the first success, so a
            // malformed entry must fail rather than silently decode as a weaker credential type.
            val badJwt = """{"current":"Default","credentials":{"Default":{"type":"jwt","token":"not-a-jwt"}}}"""
            val badIssuer = """{"current":"Default","credentials":{"Default":{"type":"oauth2","issuerUrl":"ftp://x","privateKey":"k"}}}"""
            assertTrue(
                parsePulsarAuthCookie(Some(badJwt)).isLeft,
                parsePulsarAuthCookie(Some(badIssuer)).isLeft
            )
        },
        test("a missing cookie yields the default auth rather than an error") {
            assertTrue(parsePulsarAuthCookie(None).isRight)
        },
        test("a malformed cookie yields a Left, not an exception") {
            assertTrue(parsePulsarAuthCookie(Some("not json at all")).isLeft)
        },
        test("malformed percent-encoding yields a Left, not a thrown IllegalArgumentException") {
            // URLDecoder.decode throws on these; it used to run outside the Either, turning a
            // hand-edited cookie into a server error instead of a 400.
            val malformed = List("%", "%ZZ", "a%2", "%E0%A4%A")
            val escaped = malformed.filter(c => scala.util.Try(parsePulsarAuthCookie(Some(c))).isFailure)
            assertTrue(escaped.isEmpty) ?? s"these threw instead of returning Left: ${escaped.mkString(", ")}"
        },
        test("every malformed cookie form is reported as a parse failure") {
            val malformed = List("%", "%ZZ", "a%2", "not json at all", "{\"current\":}")
            val notLeft = malformed.filterNot(c => scala.util.Try(parsePulsarAuthCookie(Some(c))).toOption.exists(_.isLeft))
            assertTrue(notLeft.isEmpty) ?? s"these did not yield Left: ${notLeft.mkString(", ")}"
        },
        test("a legacy cookie (raw JSON, per-field-encoded values) still parses unchanged") {
            // Until 2026-08-08 the writer emitted the JSON RAW and URL-encoded only the four OAuth2
            // fields and authParams; browsers hold such cookies for up to a year (Max-Age=31536000).
            // The read path URL-decodes the whole value once and is deliberately UNCHANGED by the
            // whole-value-encoding fix, so a legacy value - whose only %xx/+ sequences sit inside
            // the fields the old writer encoded - must keep decoding to exactly what it held.
            // The legacy value is constructed here BY HAND (replicating the old writer) because
            // pulsarAuthToCookie itself now writes the new format.
            import java.net.URLEncoder
            import java.nio.charset.StandardCharsets.UTF_8
            import io.circe.syntax.*
            def enc(s: String): String = URLEncoder.encode(s, UTF_8)

            val original = PulsarAuth(
                current = Some("prod"),
                credentials = Map(
                    "Default" -> EmptyCredentials(`type` = "empty"),
                    "jwt1" -> JwtCredentials(`type` = "jwt", token = "aaa.bbb.ccc"),
                    "prod" -> AuthParamsStringCredentials(
                        `type` = "authParamsString",
                        authPluginClassName = "org.apache.pulsar.client.impl.auth.AuthenticationToken",
                        authParams = "token:a+b%2Fc"
                    ),
                    "oa" -> OAuth2Credentials(
                        `type` = "oauth2",
                        issuerUrl = "https://issuer.example.com/oauth2/token?tenant=a b",
                        privateKey = "MIIEvQIBADAN+Bg/kqhkiG9w0BAQ==",
                        audience = Some("urn:dekaf:audience with spaces"),
                        scope = Some("read write+admin")
                    )
                )
            )
            // the OLD writer: URL-encode selected fields, then serialize the JSON raw
            val legacyValue = original
                .copy(credentials = original.credentials.map((name, credentials) =>
                    credentials match
                        case cr: OAuth2Credentials => (
                                name,
                                cr.copy(
                                    issuerUrl = enc(cr.issuerUrl),
                                    privateKey = enc(cr.privateKey),
                                    audience = cr.audience.map(enc),
                                    scope = cr.scope.map(enc)
                                )
                            )
                        case cr: AuthParamsStringCredentials => (name, cr.copy(authParams = enc(cr.authParams)))
                        case other                           => (name, other)
                ))
                .asJson.noSpaces
            assertTrue(
                legacyValue.contains("""{"current":"prod""""), // it really is the raw-JSON legacy shape
                parsePulsarAuthCookie(Some(legacyValue)) == Right(original)
            )
        },
        test("a parse failure never logs any fragment of the cookie value") {
            // REGRESSION - the WARN on a parse failure logged circe's message, and for malformed
            // JSON that message (jawn's) embeds a quoted fragment of the raw INPUT at the failure
            // offset: `expected : got '"sk3cr...' (line 1, column 69)` (verified against jawn
            // 1.4, which quotes the next handful of characters). The input is the credential
            // cookie, so a cookie corrupted inside a token (exactly what the old `;`-truncation
            // produced) wrote a slice of that token into ordinary operational logs at WARN.
            // The secret is gibberish ON PURPOSE: the leak oracle scans for 4-char windows of it,
            // and a dictionary word (like "token") could match a legitimate foreign log line from
            // a parallel suite sharing the "pulsar-auth" logger.
            val secret = "sk3cr3t4t0k3nv4lu3x9y8z7w6v5"
            // corruption point INSIDE the credential: the `:` after "token" is missing, so the
            // parse fails right where the secret string begins and jawn quotes it
            val cutInsideToken = s"""{"current":"Default","credentials":{"Default":{"type":"jwt","token" "$secret"}}}"""
            // decode failures embed cookie content too (the cursor PATH carries the credential
            // names, and circe 0.14 can embed the offending value) - cover that shape as well
            val wrongType = s"""{"current":"Default","credentials":{"Default":{"type":"jwt","token":{"nested":"$secret"}}}}"""

            val (results, logged) = withCapturedPulsarAuthLogs {
                (parsePulsarAuthCookie(Some(cutInsideToken)), parsePulsarAuthCookie(Some(wrongType)))
            }
            // any 4-char window of the secret counts as a leak - jawn embeds only a bounded
            // fragment of the input, never the whole token
            val fragments = (0 to secret.length - 4).map(i => secret.substring(i, i + 4))
            val leaked = logged.filter(msg => fragments.exists(msg.contains))
            assertTrue(
                results._1.isLeft,
                results._2.isLeft,
                // control: the parse failure DID log (logging is synchronous on this thread, so our
                // event is guaranteed captured; the shared logger may add foreign events, which the
                // unique secret keeps out of the leak check)
                logged.exists(_.contains("Unable to parse cookie")),
                leaked.isEmpty
            ) ?? s"leaked=${leaked.mkString("|")}"
        }
    )
