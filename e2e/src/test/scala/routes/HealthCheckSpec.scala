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
