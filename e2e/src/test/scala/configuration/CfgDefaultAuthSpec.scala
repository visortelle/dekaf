package configuration

import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.Locator
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import java.net.URLDecoder
import java.nio.charset.StandardCharsets.UTF_8
import scala.jdk.CollectionConverters.*

/** CFG-AUTH - `defaultPulsarAuth`: credentials the operator configures once and every browser then
  * gets as its "Default" credential, without anyone typing them in. The value is a JSON blob parsed
  * at startup, injected into the `pulsar_auth` cookie on EVERY response that writes one
  * (`setCookieAndSuccess` re-seeds `Default` each time, so a changed configuration reaches users
  * that already have a cookie), and used to build the Pulsar clients for every request.
  *
  * The configured value here is a JWT-shaped credential whose token is the literal words
  * `e2e.dummy.token` - it satisfies the app's JWT format check without being, or resembling, a
  * secret. `empty` would have been benign too, but it is also the DEFAULT default, so it could not
  * tell a working configuration from an ignored one.
  */
class CfgDefaultAuthSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  test("CFG-AUTH-1: the configured defaultPulsarAuth is the Default credential in the UI, in the cookie, and in use") {
    val configured = """{"type":"jwt","token":"e2e.dummy.token"}"""
    DekafInstance.withInstance("default-auth", "DEKAF_DEFAULT_PULSAR_AUTH" -> configured) { instance =>
      page.navigate(instance.url("/overview"))

      // 1) It is actually IN USE, not merely stored: the navigation tree's tenant list is a gRPC
      //    call whose Pulsar clients are built from the current credentials, and the interceptor
      //    answers UNAUTHENTICATED for the whole call when they cannot build one.
      assertThat(page.locator("[data-testid=nav-tree-node][data-node-type=tenant][data-node-name='public']"))
        .isVisible(vis(30000))

      // 2) The credentials manager shows it as the Default credential, with its configured TYPE -
      //    "Empty" here would mean the JSON was ignored and the built-in default used instead.
      page.getByTestId("credentials-button").click()
      assertThat(page.getByTestId("modal")).isVisible(vis(20000))
      val defaultRow = page.locator("[data-testid=credentials-row][data-cred-name='Default']")
      assertThat(defaultRow).isVisible(vis(20000))
      assertThat(defaultRow).containsText("JWT")

      // 3) ... and it is the one selected for this browser, which is what "default credentials for
      //    all users" means.
      assertThat(defaultRow.getByText("Current", new Locator.GetByTextOptions().setExact(true))).isVisible(vis(20000))

      // 4) The credential itself reached the browser, not just a label rendered from a gRPC reply:
      //    the HttpOnly cookie that every Pulsar call is authenticated with carries the configured
      //    type. (The token value is deliberately NOT asserted - the manager masks credentials, and
      //    a test that pinned a secret out of a cookie would be a bad pattern to copy.)
      val cookie = context.cookies().asScala.find(_.name == "pulsar_auth")
        .getOrElse(fail(s"no pulsar_auth cookie; cookies: ${context.cookies()}"))
      val decoded = URLDecoder.decode(cookie.value, UTF_8)
      assert(
        decoded.contains("\"Default\":{\"type\":\"jwt\""),
        s"the Default credential in the cookie is not the configured one: $decoded"
      )
    }
  }
