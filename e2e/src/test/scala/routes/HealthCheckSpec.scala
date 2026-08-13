package routes

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern

/** NAV-10 - the periodic broker health check drives a full-screen overlay on connectivity loss,
  * which clears (via reload) once connectivity recovers. Simulated by aborting the poll request. */
class HealthCheckSpec extends DekafSuite:
  // The gRPC-web endpoint is /api/tools.teal.pulsar.ui.brokers.v1.BrokersService/HealthCheck -
  // the service segment contains dots, so match by regex rather than a path-segment glob.
  private val healthCheckUrl = Pattern.compile(".*BrokersService/HealthCheck")

  test("NAV-10: a connectivity drop shows the health overlay, which clears on recovery") {
    page.navigate("/overview")

    // Force the periodic health check (polls every 5s) to fail.
    page.route(healthCheckUrl, route => route.abort())
    assertThat(page.getByTestId("health-overlay")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20000))

    // Recover: the next successful poll reloads the page and the overlay is gone.
    page.unroute(healthCheckUrl)
    assertThat(page.getByTestId("health-overlay")).hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(20000))
  }

  test("NAV-15: the health overlay can be dismissed while connectivity is still down") {
    page.navigate("/overview")

    page.route(healthCheckUrl, route => route.abort())
    assertThat(page.getByTestId("health-overlay")).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20000))

    // The overlay used to have no way out, which made the UI unusable - in particular it
    // covered the credentials button, so a cluster that needs auth couldn't be authenticated
    // from the UI at all. See #353.
    page.getByTestId("health-overlay").press("Escape")
    assertThat(page.getByTestId("health-overlay")).hasCount(0, new LocatorAssertions.HasCountOptions().setTimeout(10000))

    // Connectivity is still down here: the next poll must not bring the overlay back.
    page.waitForTimeout(8000)
    assertThat(page.getByTestId("health-overlay")).hasCount(0)

    // The UI underneath stays usable - the credentials button is reachable again.
    assertThat(page.getByTestId("credentials-button")).isVisible()
  }
