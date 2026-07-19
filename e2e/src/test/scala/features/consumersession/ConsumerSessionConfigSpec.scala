package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

class ConsumerSessionConfigSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)

  test("CS-1: Start-From offers all 7 options") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    ConsumerSessionPage(page).openForTopic(t, ns, topic)
    val opts = page.getByTestId("cs-start-from").locator("option").allTextContents().asScala.toList
    assert(opts.size == 7, s"got: $opts")
    assert(opts.contains("Earliest message") && opts.contains("Latest message") && opts.contains("Message with specific ID"))
  }

  test("CS-17: Stop clears the loaded messages") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(3, count(3))
    cs.stop()
    assertThat(cs.messages).hasCount(0, count(0))
  }
