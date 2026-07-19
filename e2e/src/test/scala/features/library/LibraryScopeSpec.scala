package features.library

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.MessageId

class LibraryScopeSpec extends DekafSuite:

  test("LIB-1: Library sidebar is present on a topic overview, absent on a subscription overview") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    assertThat(page.getByTestId("lib-tab-library")).isVisible()

    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(s"persistent://$t/$ns/$topic", sub, MessageId.earliest)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview")
    assertThat(page.getByTestId("lib-tab-library")).hasCount(0)
  }
