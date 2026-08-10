package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import scala.jdk.CollectionConverters.*

class ConsumerSessionConfigSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)

  /** The whole Start-From catalog. Named rather than counted: a count is satisfied by a renamed or
    * swapped mode just as happily as by the right one, which is how this assertion previously
    * survived a new mode being added without saying anything about it. */
  private val allStartFromModes = List(
    "Earliest message",
    "Latest message",
    "Message with specific ID",
    "Specific time",
    "Relative time ago",
    "Skip first n messages",
    "Latest n messages",
    // Two approximate modes, not one: "about half way in" is either half the ENTRIES or half the
    // PUBLISH-TIME RANGE, and a single control could not say which. Named in full here because a count would be
    // satisfied by one mode renamed to the other's label.
    "Approximate position (% of data)",
    "Approximate position (% of time)"
  )

  test("CS-1: Start-From offers every mode, all of them selectable on a persistent topic") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    assert(cs.startFromLabels == allStartFromModes, s"got: ${cs.startFromLabels}")
    // A persistent topic keeps history, so nothing is greyed out - the counterpart on a
    // non-persistent topic is CsStartFromMatrixSpec CS-SFM-2.
    assert(cs.disabledStartFromLabels.isEmpty, s"unexpectedly disabled on a persistent topic: ${cs.disabledStartFromLabels}")
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
