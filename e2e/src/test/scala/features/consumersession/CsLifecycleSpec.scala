package features.consumersession

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.Locator
import org.apache.pulsar.client.api.Schema
import scala.jdk.CollectionConverters.*

class CsLifecycleSpec extends DekafSuite:
  private def hasText = new LocatorAssertions.HasTextOptions().setTimeout(20000)
  private def count(n: Int) = new LocatorAssertions.HasCountOptions().setTimeout(20000)

  /** The toolbar's "processed" counter (the server's `numMessageProcessed` carried on the last
    * streamed message). `ConsumerSessionPage` only exposes `loaded`, so address it directly. */
  private def processed: Locator = page.getByTestId("cs-processed")

  private def produce(fqn: String, values: Seq[String]): Unit =
    val p = client.newProducer(Schema.STRING).topic(fqn).create()
    try values.foreach(p.send) finally p.close()

  /** BROKER ORACLE: how many of Dekaf's OWN consumers are attached to `fqn` right now.
    *
    * The Consumer Session mints `__dekaf_<nanoid>` (ConsumerSession.tsx) and `buildConsumer` reuses
    * it as the consumer AND subscription name, subscribing NON-DURABLY - so a `__dekaf_`-prefixed
    * subscription in the topic stats can only exist while a live UI-driven consumer is attached, and
    * the broker drops it as soon as that consumer detaches. Prefix-scoping (rather than counting any
    * consumer) keeps a stray subscription from another test or a leftover reader out of the count. */
  private def dekafConsumerCount(fqn: String): Int =
    val subs = admin.topics().getStats(fqn).getSubscriptions
    subs.keySet().asScala.toList
      .filter(_.startsWith("__dekaf_"))
      .map(name => subs.get(name).getConsumers.size)
      .sum

  private def awaitDekafConsumers(fqn: String, n: Int): Unit =
    eventually(timeoutMs = 30000, intervalMs = 300) {
      // The topic can momentarily 404 while the broker unloads/GCs it; treat that as "not yet".
      val got = try dekafConsumerCount(fqn) catch case _: Throwable => -1
      assert(got == n, s"expected $n Dekaf consumer(s) attached to $fqn, got $got")
    }

  private def topicWith(n: Int): (String, String, String) =
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", n)
    (t, ns, topic)

  private def runningSession(n: Int): ConsumerSessionPage =
    val (t, ns, topic) = topicWith(n)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.assertState("running")
    cs

  // CS-16/17 previously proved only "rows appeared" / "rows disappeared" - a UI that rendered a
  // cached list would pass both. These two assert the thing the names claim: a REAL broker-side
  // consumer for the lifetime of the session, and counters that track produced messages.

  test("CS-16: a running session holds a real broker-side consumer and its counters advance with production") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 5) // "msg-1".."msg-5"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()

    // The table is virtualized, so assert the COUNTERS, not DOM rows.
    cs.awaitLoaded(5)
    cs.assertState("running")
    assertThat(processed).hasText("5", hasText)

    // Broker-side proof that the session is actually consuming, not replaying a client-side cache.
    awaitDekafConsumers(fqn, 1)

    // Counters must ADVANCE with newly produced messages. "live-sentinel" is produced LAST on a
    // single-partition topic, so its arrival means every earlier value was already delivered - the
    // set assertion below is then exact, never a transient count.
    produce(fqn, Seq("live-1", "live-2", "live-sentinel"))
    cs.awaitLoaded(8)
    assertThat(processed).hasText("8", hasText)

    val expected = (1 to 5).map(i => s"msg-$i").toList ++ List("live-1", "live-2", "live-sentinel")
    val values = eventually() {
      val vs = cs.columnValues("value")
      assert(vs.contains("live-sentinel"), s"sentinel not rendered yet: $vs")
      vs
    }
    assert(values == expected, s"loaded values were: $values (expected exactly $expected)")

    // Still attached after the second wave - the consumer lives for the whole running session.
    assert(dekafConsumerCount(fqn) == 1, s"the session's broker consumer vanished while running on $fqn")
  }

  test("CS-17: Stop detaches the broker-side consumer, clears the messages and resets the counters") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 5)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(5)
    assertThat(processed).hasText("5", hasText)
    awaitDekafConsumers(fqn, 1)

    cs.stop()

    // Client side: the session is torn down to a fresh one - no rows, both counters back to zero.
    assertThat(cs.messages).hasCount(0, count(0))
    cs.assertState("new")
    assertThat(cs.loaded).hasText("0", hasText)
    assertThat(processed).hasText("0", hasText)

    // Broker side: the consumer is really gone (a non-durable subscription disappears with it), so
    // Stop releases the broker resource instead of leaking a consumer per stopped session.
    awaitDekafConsumers(fqn, 0)
  }

  test("CS-18: wheel-scroll (up) on a running session transitions to paused") {
    val cs = runningSession(5)
    cs.wheelUpOverTable()
    cs.assertState("paused")
  }

  test("CS-18: clicking a row on a running session transitions to paused") {
    val cs = runningSession(5)
    cs.clickFirstMessage()
    cs.assertState("paused")
  }

  test("CS-18: window/visibility blur transitions a running session to paused") {
    val cs = runningSession(5)
    cs.blurWindow()
    cs.assertState("paused")
  }

  test("CS-19: running caps the displayed set at 250; pausing reveals all") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 300) // values "msg-1".."msg-300", all contain "msg-"

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()

    // Ensure all 300 are loaded BEFORE pausing (otherwise "paused" could show < 300).
    assertThat(cs.loaded).hasText("300", new LocatorAssertions.HasTextOptions().setTimeout(30000))
    cs.assertState("running")

    // A search matching every message surfaces the (non-virtualized) count.
    cs.searchInResults("msg-")
    assertThat(cs.numFound).hasText("250", new LocatorAssertions.HasTextOptions().setTimeout(10000)) // running slice = last 250

    cs.pauseFromToolbar()
    cs.assertState("paused")
    assertThat(cs.numFound).hasText("300", new LocatorAssertions.HasTextOptions().setTimeout(10000)) // cap lifted
  }
