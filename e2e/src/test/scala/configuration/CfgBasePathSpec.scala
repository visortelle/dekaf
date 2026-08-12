package configuration

import harness.{DekafInstance, DekafSuite}
import com.microsoft.playwright.Response
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

import java.util.function.Consumer
import scala.jdk.CollectionConverters.*

/** CFG-BP - `basePath`, the reverse-proxy setting that decides where the whole application lives.
  *
  * It is the highest-value property after the cookie attributes because it breaks SUBTLY: the
  * server starts, `/health` answers, and the failure only shows up as an asset or a gRPC-web call
  * resolved against the wrong root. It is also the only thing in this suite that exercises the
  * embedded Envoy proxy's routing at all - `basePath` is interpolated straight into the Envoy
  * config's two route prefixes and their regex rewrites, and no other test can vary it.
  *
  * So this test does not stop at "the page loaded": it drives a deep link, a gRPC-web round trip,
  * an in-app route change, and the cookie scope, and it checks that the origin ROOT serves nothing -
  * which is what distinguishes "the app moved to the sub-path" from "the app answers everywhere".
  */
class CfgBasePathSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)

  test("CFG-BP-1: under a sub-path basePath the app works there, and the origin root serves nothing") {
    val subPath = "/dekaf-e2e"
    DekafInstance.withInstance("basepath", "DEKAF_BASE_PATH" -> subPath) { instance =>
      val tenant = fixtures.createTenant()
      val namespace = fixtures.createNamespace(tenant)
      val topic = fixtures.unique("topic")
      admin.topics().createNonPartitionedTopic(s"persistent://$tenant/$namespace/$topic")

      // 1) The app MOVED, it was not aliased: the same route at the origin root is not served.
      val atRoot = page.navigate(s"${instance.origin}/tenants/$tenant/overview")
      assert(
        atRoot != null && atRoot.status() == 404,
        s"the origin root answered ${Option(atRoot).map(_.status())} for a real app route; expected 404 with basePath=$subPath"
      )

      // Everything the page fetches from here on, so the assertions below are about what the browser
      // REALLY requested rather than about what the DOM happens to say.
      val responses = java.util.Collections.synchronizedList(new java.util.ArrayList[(Int, String)]())
      val record: Consumer[Response] = (response: Response) => responses.add(response.status() -> response.url())
      page.onResponse(record)

      // 2) A deep link under the sub-path loads ...
      val deepLink = instance.url(s"/tenants/$tenant/namespaces/$namespace/topics/persistent/$topic/overview")
      val loaded = page.navigate(deepLink)
      assert(loaded != null && loaded.status() == 200, s"$deepLink answered ${Option(loaded).map(_.status())}")

      // 3) ... and the app actually came up on it: breadcrumbs are rendered from resource data that
      //     only exists on the other side of a gRPC-web call.
      assertThat(page.getByTestId("breadcrumbs")).isVisible(vis(30000))
      assertThat(page.locator("[data-testid=breadcrumb][data-crumb-type=tenant]")).containsText(tenant)
      assertThat(page.locator("[data-testid=breadcrumb][data-crumb-type=namespace]")).containsText(namespace)

      // 4) In-app navigation stays under the sub-path (the router's basename is the publicBaseUrl
      //    path). A basename left at "/" would push the browser to the origin root and 404 on reload.
      page.locator("[data-testid=breadcrumb][data-crumb-type=tenant]").click()
      val expectedUrl = instance.url(s"/tenants/$tenant/overview")
      harness.Eventually.eventually(20000) {
        assert(
          page.url().startsWith(expectedUrl),
          s"in-app navigation went to '${page.url()}', expected it to stay under the sub-path at '$expectedUrl'"
        )
      }

      page.offResponse(record)
      val seen = responses.asScala.toList

      // 5) gRPC-web resolved UNDER the sub-path. (gRPC-web reports failures in trailers, so the
      //    transport status is exactly the "not a 404" this is about.)
      val api = seen.filter(_._2.startsWith(instance.url("/api/")))
      assert(api.nonEmpty, s"no gRPC-web call reached ${instance.url("/api/")}; requested: ${seen.map(_._2).distinct.sorted}")
      assert(api.forall(_._1 == 200), s"gRPC-web calls did not resolve: ${api.filter(_._1 != 200)}")

      // 6) Static assets are resolved against `<base href>` - i.e. the sub-path - and nothing the
      //    page asked for was missing. A root-rooted URL anywhere in the app 404s here and only here.
      assert(
        seen.exists((status, url) => status == 200 && url.startsWith(instance.url("/ui/static/"))),
        s"nothing was served from ${instance.url("/ui/static/")}; requested: ${seen.map(_._2).distinct.sorted}"
      )
      val broken = seen.filter((status, url) => status >= 400 && url.startsWith(instance.origin))
      assert(broken.isEmpty, s"requests under ${instance.origin} failed: ${broken.distinct}")

      // 7) The credential cookie is scoped to the sub-path, so a different app on the same host
      //    cannot be handed Dekaf's Pulsar credentials.
      val cookie = context.cookies().asScala.find(_.name == "pulsar_auth")
        .getOrElse(fail(s"no pulsar_auth cookie; cookies: ${context.cookies()}"))
      assert(cookie.path == subPath, s"cookie Path is '${cookie.path}', expected '$subPath'")
    }
  }
