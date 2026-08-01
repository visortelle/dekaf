package routes

import harness.{Config, DekafSuite}
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

import scala.collection.mutable.ListBuffer

/** NAV-16 - the UI must work on whatever host it is actually reached at, not only on the one
  * configured as DEKAF_PUBLIC_BASE_URL. The page used to carry an absolute <base href> built
  * from that setting; browsers resolve history.pushState() URLs against the document base URL,
  * so react-router pushed a URL on a foreign origin, which throws a SecurityError while the app
  * mounts and leaves a blank page. See #349. */
class BasePathSpec extends DekafSuite:

  test("NAV-16: the UI loads when opened on a host other than the configured public base URL") {
    // Same server, different origin as far as the browser is concerned.
    val otherHostUrl = Config.baseUrl.replace("localhost", "127.0.0.1")
    assert(otherHostUrl != Config.baseUrl, s"expected a localhost-based DEKAF_BASE_URL, got ${Config.baseUrl}")

    val pageErrors = ListBuffer[String]()
    page.onPageError(err => pageErrors.synchronized(pageErrors += err))

    // Deliberately the root: landing there makes react-router redirect to /overview, and it is
    // that history call which used to throw. Opening /overview directly never redirects, so it
    // would not reproduce the bug.
    page.navigate(s"${otherHostUrl.stripSuffix("/")}/")

    // A blank page is what the bug looked like, so assert real UI is rendered.
    assertThat(page.getByText("Pulsar Instance")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30000))

    val securityErrors = pageErrors.synchronized(pageErrors.toList)
      .filter(e => e.contains("insecure") || e.contains("SecurityError"))
    assert(securityErrors.isEmpty, s"unexpected security errors: $securityErrors")
  }
