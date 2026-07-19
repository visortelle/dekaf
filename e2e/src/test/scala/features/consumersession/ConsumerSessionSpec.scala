package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

class ConsumerSessionSpec extends DekafSuite:

  /** Arrange a fresh topic pre-loaded with `n` messages; returns (tenant, namespace, shortTopic). */
  private def topicWithMessages(n: Int): (String, String, String) =
    val tenant = fixtures.createTenant()
    val ns = fixtures.createNamespace(tenant)
    val topic = fixtures.unique("topic")
    admin.topics().createNonPartitionedTopic(s"persistent://$tenant/$ns/$topic")
    fixtures.produceStrings(s"persistent://$tenant/$ns/$topic", n)
    (tenant, ns, topic)

  test("CS-16 + CS-23: run from earliest, stream messages, open message details") {
    val (tenant, ns, topic) = topicWithMessages(5)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tenant, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()

    // All 5 pre-produced messages stream in.
    assertThat(cs.messages).hasCount(5, new LocatorAssertions.HasCountOptions().setTimeout(20000))

    // Clicking a message opens the details panel.
    cs.clickFirstMessage()
    assertThat(cs.messageDetails).isVisible()
  }

  test("CS-27: search-in-loaded filters by message value") {
    val (tenant, ns, topic) = topicWithMessages(5)  // values are "msg-1".."msg-5"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tenant, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(5, new LocatorAssertions.HasCountOptions().setTimeout(20000))

    // "msg-3" matches exactly one message (search is a case-sensitive substring on key/value).
    cs.searchInResults("msg-3")
    assertThat(cs.messages).hasCount(1, new LocatorAssertions.HasCountOptions().setTimeout(5000))
  }
