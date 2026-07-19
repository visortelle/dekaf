package features.consumersession

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.Schema

class CsStartFromSpec extends DekafSuite:
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)
  private def vis           = new LocatorAssertions.IsVisibleOptions().setTimeout(20000)
  private def hasV          = new LocatorAssertions.HasValueOptions().setTimeout(10000)

  private def produce(fqn: String, values: Seq[String]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try values.foreach(p.send) finally p.close()

  test("CS-2: switching Start-From resets the additional input to its default") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)

    cs.setStartFrom("Skip first n messages")
    assertThat(cs.startFromN).hasValue("5", hasV)     // default n = 5
    cs.startFromN.fill("20")
    assertThat(cs.startFromN).hasValue("20", hasV)

    cs.setStartFrom("Latest message")                 // no additional input
    assertThat(cs.startFromN).hasCount(0, count(0))

    cs.setStartFrom("Skip first n messages")          // reselect -> fresh default
    assertThat(cs.startFromN).hasValue("5", hasV)
  }

  test("CS-3: Earliest loads pre-existing set; Latest loads only messages produced after play") {
    // --- Earliest: all 4 pre-produced load ---
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    produce(fqnA, (1 to 4).map(i => s"a-$i"))

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(tA, nsA, topicA)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(4, count(4))

    // --- Latest: pre-existing are NOT loaded; only post-play are ---
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"
    produce(fqnB, (1 to 4).map(i => s"old-$i"))       // produced BEFORE play

    cs.openForTopic(tB, nsB, topicB)
    cs.setStartFrom("Latest message")
    cs.play()
    // Subscription is now at 'latest' - the empty state confirms nothing old was loaded.
    assertThat(cs.awaitingText).isVisible(vis)
    assertThat(cs.messages).hasCount(0, count(0))

    produce(fqnB, Seq("new-1", "new-2", "new-last"))   // produced AFTER play; last is a sentinel
    // When the sentinel arrives every post-play message is in, so assert the EXACT loaded set: only
    // the new ones, none of the old - a bare hasCount(3) could pass transiently even if old loaded too.
    val values = eventually() {
      val vs = cs.columnValues("value")
      assert(vs.contains("new-last"), s"sentinel not loaded yet: $vs")
      vs
    }
    assert(values.toSet == Set("new-1", "new-2", "new-last"), s"loaded values were: $values")
    assert(!values.exists(_.startsWith("old")), s"an old (pre-play) message loaded despite Latest: $values")
  }
