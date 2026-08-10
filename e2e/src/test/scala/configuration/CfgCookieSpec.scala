package configuration

import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.Response
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import java.net.URLDecoder
import java.nio.charset.StandardCharsets.UTF_8
import java.util.function.Predicate
import scala.jdk.CollectionConverters.*

/** CFG-COOKIE - `cookieSecure` / `cookieSameSite`, driven the way an operator sets them: as
  * `DEKAF_*` environment variables on a server process, observed as the `Set-Cookie` header the
  * browser really receives when a credential is added through the UI.
  *
  * This is the property these specs exist for. Two bugs shipped here, and BOTH were config-to-
  * behaviour wiring failures rather than logic errors:
  *
  *   - `Secure` was computed into a local and never interpolated into the header string, so
  *     `cookieSecure: true` silently produced a non-Secure cookie;
  *   - `cookieSameSite` was matched against lowercase literals only, so the perfectly ordinary
  *     `Lax` (or `STRICT`, or a value with a trailing space) fell through to "" and emitted NO
  *     SameSite attribute at all - a cookie that looked hardened and was not.
  *
  * Neither was visible to any test, because every test called the cookie writer with hand-passed
  * parameters. The path under test here is the whole one: env var -> `readConfig` -> the package
  * `config` val -> `pulsarAuthToCookie` -> Javalin -> the embedded Envoy proxy -> Chromium. The
  * mixed-case `Lax` in CFG-COOKIE-1 is deliberate: it is the exact value that shipped broken.
  *
  * The attribute list is asserted EXACTLY (as a sorted list, so order is free but duplicates and
  * extras are not) rather than by `contains`: a `contains("SameSite=Lax")` cannot notice a smuggled
  * `Domain=` or a `Secure` that went missing, which is half of what these two settings are for.
  */
class CfgCookieSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  /** Attributes every `Set-Cookie` from this server carries regardless of the two settings. */
  private val alwaysOn = List("Path=/", "HttpOnly", "Max-Age=31536000")

  /** The `Set-Cookie` written in response to ADDING A CREDENTIAL THROUGH THE UI, split into its
    * cookie-name=value pair and its attribute list.
    *
    * Driving the real flow matters: `/pulsar-auth/add` is the route an operator's browser hits, it
    * goes through Envoy, and it is one of the four call sites that share `setCookieAndSuccess`. */
  private def addCredentialSetCookie(instance: DekafInstance.Instance): (String, String, List[String]) =
    val credential = fixtures.unique("cred").replaceAll("[^A-Za-z0-9_-]", "-")

    page.navigate(instance.url("/overview"))
    page.getByTestId("credentials-button").click()
    assertThat(page.getByTestId("modal")).isVisible(vis(20000))
    page.getByTestId("credentials-add").click()
    page.getByTestId("credentials-name").fill(credential)

    val isAdd: Predicate[Response] =
      (response: Response) => response.url().contains("/pulsar-auth/add/") && response.request().method() == "POST"
    val response = page.waitForResponse(isAdd, () => page.getByTestId("credentials-save").click())

    assert(response.status() == 200, s"adding a credential answered ${response.status()}: ${response.text()}")
    // `headersArray` keeps the RAW response headers (unlike `headers()`, which lower-cases and joins
    // repeated ones), so a second Set-Cookie would show up as a second entry rather than merge.
    val setCookies = response.headersArray().asScala.toList
      .filter(_.name.equalsIgnoreCase("set-cookie"))
      .map(_.value)
    assert(setCookies.size == 1, s"expected exactly one Set-Cookie header, got ${setCookies.size}: $setCookies")

    val header = setCookies.head
    val parts = header.split(";", -1).toList.map(_.trim).filter(_.nonEmpty)
    val pair = parts.head

    // Prove we intercepted the right response before asserting anything about its attributes: the
    // cookie must be the credential cookie and must carry the credential this test just added.
    assert(pair.startsWith("pulsar_auth="), s"Set-Cookie is not the pulsar_auth cookie: $header")
    val decoded = URLDecoder.decode(pair.stripPrefix("pulsar_auth="), UTF_8)
    assert(decoded.contains(s"\"$credential\""), s"the cookie does not carry the added credential '$credential': $decoded")

    (header, credential, parts.tail)

  private def assertAttributes(header: String, actual: List[String], expected: List[String]): Unit =
    assert(
      actual.sorted == expected.sorted,
      s"Set-Cookie attributes were ${actual.mkString("[", ", ", "]")}, expected ${expected.mkString("[", ", ", "]")}\n  raw: $header"
    )

  test("CFG-COOKIE-1: cookieSecure=true + a MIXED-CASE cookieSameSite=Lax reach Set-Cookie") {
    DekafInstance.withInstance(
      "cookie-lax",
      "DEKAF_COOKIE_SECURE" -> "true",
      "DEKAF_COOKIE_SAME_SITE" -> "Lax" // capitalised ON PURPOSE - the value that shipped broken
    ) { instance =>
      val (header, _, attributes) = addCredentialSetCookie(instance)
      assertAttributes(header, attributes, alwaysOn ++ List("Secure", "SameSite=Lax"))

      // ... and the browser ACCEPTED it with those attributes. The header being right is the bug
      // that shipped; the cookie actually being stored hardened is the thing the operator wanted.
      // (http://localhost is a trustworthy origin, so Chromium keeps a `Secure` cookie set there.)
      val cookie = context.cookies().asScala.find(_.name == "pulsar_auth")
        .getOrElse(fail(s"no pulsar_auth cookie in the browser context; header was: $header"))
      assert(cookie.secure, s"the stored cookie is not Secure: $cookie")
      assert(cookie.httpOnly, s"the stored cookie is not HttpOnly: $cookie")
      assert(cookie.path == "/", s"the stored cookie's path is ${cookie.path}")
      assert(
        cookie.sameSite == com.microsoft.playwright.options.SameSiteAttribute.LAX,
        s"the stored cookie's SameSite is ${cookie.sameSite}, expected LAX"
      )
    }
  }

  test("CFG-COOKIE-2: cookieSameSite=strict emits SameSite=Strict, and no Secure when it is unset") {
    DekafInstance.withInstance("cookie-strict", "DEKAF_COOKIE_SAME_SITE" -> "strict") { instance =>
      val (header, _, attributes) = addCredentialSetCookie(instance)
      // The absence of `Secure` is asserted by the list being exact - a `contains` check could not
      // tell an unset cookieSecure from one that leaked in.
      assertAttributes(header, attributes, alwaysOn :+ "SameSite=Strict")
    }
  }

  test("CFG-COOKIE-3: cookieSameSite=NONE with cookieSecure=true emits SameSite=None; Secure") {
    DekafInstance.withInstance(
      "cookie-none",
      "DEKAF_COOKIE_SECURE" -> "true",
      "DEKAF_COOKIE_SAME_SITE" -> "NONE" // upper case, the third spelling an operator may write
    ) { instance =>
      val (header, _, attributes) = addCredentialSetCookie(instance)
      assertAttributes(header, attributes, alwaysOn ++ List("Secure", "SameSite=None"))
    }
  }

  test("CFG-COOKIE-4: cookieSameSite=none WITHOUT cookieSecure emits no SameSite at all") {
    // Browsers reject `SameSite=None` on a non-Secure cookie outright - the whole cookie is dropped
    // and authentication breaks. The server withholds the attribute (and logs a warning) rather than
    // emit a cookie the browser will refuse, so the observable contract is "no SameSite, no Secure".
    DekafInstance.withInstance("cookie-none-insecure", "DEKAF_COOKIE_SAME_SITE" -> "none") { instance =>
      val (header, _, attributes) = addCredentialSetCookie(instance)
      assertAttributes(header, attributes, alwaysOn)
    }
  }
