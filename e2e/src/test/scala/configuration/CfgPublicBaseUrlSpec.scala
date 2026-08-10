package configuration

import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.Response

import java.util.function.Consumer
import scala.jdk.CollectionConverters.*

/** CFG-PBU - `publicBaseUrl`, isolated from `basePath`.
  *
  * The two settings are usually turned on together, and CFG-BP already covers that. What is left
  * unproven there is which of them owns which effect, so this test uses the deployment shape where
  * they genuinely differ: a reverse proxy that STRIPS the prefix before forwarding. Dekaf is then
  * served at the internal root (`basePath` untouched) while `publicBaseUrl` carries the public
  * mount point, so that links and cookies are written for the URL the user's browser actually has.
  * The server tier already assumes this shape - `pulsarAuthRoutesHttpTest` uses
  * `publicBaseUrl = http://gateway.example/dekaf` with no basePath at all.
  *
  * Without the proxy in front, the sub-path requests the browser then makes have nothing to answer
  * them, and that is exactly the point: this test asserts that the browser REQUESTS them, not that
  * they succeed. Full app behaviour under a public prefix is CFG-BP's job.
  */
class CfgPublicBaseUrlSpec extends DekafSuite:

  test("CFG-PBU-1: publicBaseUrl alone moves link resolution and the cookie Path, with basePath untouched") {
    val publicPath = "/gw"
    DekafInstance.withInstance("public-base-url", "DEKAF_PUBLIC_BASE_URL" -> s"{origin}$publicPath") { instance =>
      val responses = java.util.Collections.synchronizedList(new java.util.ArrayList[String]())
      val record: Consumer[Response] = (response: Response) => responses.add(response.url())
      page.onResponse(record)

      // basePath really is untouched: the app is still served at the internal root, which is what
      // the proxy forwards to. (If this 404'd, the effects below would be basePath's, not
      // publicBaseUrl's, and the test would prove nothing about the property it names.)
      val served = page.navigate(s"${instance.origin}/")
      assert(served != null && served.status() == 200, s"the internal root answered ${Option(served).map(_.status())}")

      // 1) Link/asset resolution follows publicBaseUrl. `document.baseURI` is what every relative
      //    URL in the page resolves against - the app renders its links, its script and its
      //    stylesheet relatively for exactly this reason.
      val baseUri = page.evaluate("() => document.baseURI").asInstanceOf[String]
      assert(baseUri == s"${instance.origin}$publicPath/", s"document.baseURI is '$baseUri'")

      // 2) ... and that resolution reaches the NETWORK: the browser fetched the app's own assets
      //     under the public prefix. (They 404 here - there is no proxy to strip it back off - so
      //     what is asserted is the URL that was requested.)
      page.offResponse(record)
      val requested = responses.asScala.toList
      assert(
        requested.exists(_.startsWith(s"${instance.origin}$publicPath/ui/static/")),
        s"no asset was requested under ${instance.origin}$publicPath/ui/static/; requested: ${requested.distinct.sorted}"
      )

      // 3) The credential cookie is scoped to the PUBLIC mount point, not to the internal root it
      //    was served from - otherwise every other app behind the same proxy host would be sent
      //    Dekaf's Pulsar credentials.
      val cookie = context.cookies().asScala.find(_.name == "pulsar_auth")
        .getOrElse(fail(s"no pulsar_auth cookie; cookies: ${context.cookies()}"))
      assert(cookie.path == publicPath, s"cookie Path is '${cookie.path}', expected '$publicPath'")
    }
  }
