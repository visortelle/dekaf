package smoke

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

/** Phase-0 smoke: proves the harness wiring (browser + baseURL + navigation) end-to-end.
  * Requires a running stack (see e2e/README.md §2). */
class OverviewSmokeSpec extends DekafSuite:

  test("app boots to the instance overview without a login gate") {
    page.navigate("/overview")
    assertThat(page.getByText("Pulsar Instance")).isVisible()
  }

  test("PulsarAdmin oracle is reachable and a fresh topic can be arranged") {
    val topicFqn = fixtures.freshTopic()
    fixtures.produceStrings(topicFqn, 3)
    assert(topicFqn.startsWith("persistent://"))
  }
