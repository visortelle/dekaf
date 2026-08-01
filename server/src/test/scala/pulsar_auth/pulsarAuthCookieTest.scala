package pulsar_auth

import zio.test.*

/** Cookie construction + parsing. This carries the session credential (tokens, OAuth2 private keys,
  * auth-param strings), so both the hardening attributes and the encode/decode round-trip matter.
  *
  * Regression context: `Secure` was computed and then never interpolated into the header (the
  * SameSite fragment was interpolated twice instead), so the cookie could never be marked Secure.
  */
object pulsarAuthCookieTest extends ZIOSpecDefault:

    private def auth(creds: (String, Credentials)*): PulsarAuth =
        PulsarAuth(current = Some(creds.headOption.map(_._1).getOrElse("Default")), credentials = creds.toMap)

    private val empty = auth("Default" -> EmptyCredentials(`type` = "empty"))

    /** The attribute segment after the JSON value - everything the browser enforces. */
    private def attributesOf(cookie: String): String =
        cookie.dropWhile(_ != ';')

    def spec = suite(this.getClass.toString)(
        test("Secure is emitted when cookieSecure is true") {
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = None)
            assertTrue(attributesOf(cookie).contains("Secure"))
        },
        test("Secure is absent when cookieSecure is false or unset") {
            val off = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = None)
            val unset = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            assertTrue(
                !attributesOf(off).contains("Secure"),
                !attributesOf(unset).contains("Secure")
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
            val attrs = attributesOf(cookie)
            assertTrue(attrs.contains("Secure"), attrs.contains("SameSite=Lax"))
        },
        test("SameSite=None is only emitted when the cookie is also Secure") {
            // Browsers reject SameSite=None without Secure, so emitting it alone would break auth.
            val secure = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("none"))
            val insecure = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = Some("none"))
            assertTrue(
                attributesOf(secure).contains("SameSite=None"),
                !attributesOf(insecure).contains("SameSite")
            )
        },
        test("lax and strict are emitted regardless of Secure") {
            val lax = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some("lax"))
            val strict = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some("strict"))
            assertTrue(
                attributesOf(lax).contains("SameSite=Lax"),
                attributesOf(strict).contains("SameSite=Strict")
            )
        },
        test("the cookie is always HttpOnly and long-lived") {
            val attrs = attributesOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None))
            assertTrue(attrs.contains("HttpOnly"), attrs.contains("Max-Age=31536000"))
        },
        test("Path is derived from publicBaseUrl, defaulting to /") {
            val default = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val rooted = pulsarAuthToCookie(empty, publicBaseUrl = Some("http://host:8090"), cookieSecure = None, cookieSameSite = None)
            val subPath = pulsarAuthToCookie(empty, publicBaseUrl = Some("http://host:8090/dekaf"), cookieSecure = None, cookieSameSite = None)
            assertTrue(
                default.contains("Path=/;"),
                rooted.contains("Path=/;"),
                subPath.contains("Path=/dekaf;")
            )
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
                attributesOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = Some(configured))).contains(expected)
            assertTrue(wrong.isEmpty) ?? s"these did not produce their attribute: ${wrong.map(_._1).mkString("|")}"
        },
        test("cookieSameSite=none is matched case-insensitively too, and still requires Secure") {
            val variants = List("none", "None", "NONE", " none ")
            val emitted = variants.filter: v =>
                attributesOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some(v))).contains("SameSite=None")
            val leakedWithoutSecure = variants.filter: v =>
                attributesOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(false), cookieSameSite = Some(v))).contains("SameSite")
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
                attributesOf(pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some(v))).contains("SameSite")
            assertTrue(emitted.isEmpty) ?? s"these emitted a SameSite attribute: ${emitted.mkString("|")}"
        },
        test("a configured cookieSameSite never injects extra cookie attributes") {
            // The value is interpolated straight into the Set-Cookie header, so an operator value
            // carrying `;` must not be able to append attributes of its own.
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = Some(true), cookieSameSite = Some("lax; Domain=evil.example"))
            assertTrue(!cookie.contains("evil.example"))
        },
        // ---- round-trip: what is written must read back identically ----
        test("an empty credential round-trips through the cookie") {
            val cookie = pulsarAuthToCookie(empty, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
            assertTrue(parsePulsarAuthCookie(Some(value)) == Right(empty))
        },
        test("a jwt credential round-trips through the cookie") {
            val jwt = auth("Default" -> JwtCredentials(`type` = "jwt", token = "aaa.bbb.ccc"))
            val cookie = pulsarAuthToCookie(jwt, publicBaseUrl = None, cookieSecure = None, cookieSameSite = None)
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
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
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
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
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
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
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
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
            val value = cookie.stripPrefix("pulsar_auth=").takeWhile(_ != ';')
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
        }
    )
