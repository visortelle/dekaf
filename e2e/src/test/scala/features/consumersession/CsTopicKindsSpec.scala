package features.consumersession

import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** The Consumer Session across the whole topic matrix - {persistent, non-persistent} x
  * {partitioned, non-partitioned}. Every test is generated from `TopicKind.all`, so all four
  * quadrants run and a failure names its own quadrant.
  *
  * Why the matrix matters: `consumer/session_runner/handleStartFrom.scala` behaves differently per
  * quadrant - a partitioned topic is expanded into its partitions and each gets its own consumer and
  * its own seek, while a non-persistent one has no history to seek into at all - and the suite's
  * only start-from coverage lived on persistent non-partitioned topics; the other three quadrants
  * had none.
  *
  * Three broker facts shape the assertions here:
  *   - a NON-PERSISTENT topic retains nothing. Whatever is published while no consumer is attached
  *     is dropped forever, so "pre-produce, then Start From = Earliest" is meaningless there; only
  *     produce-AFTER-play is assertable. `kind.retains` gates which shape a quadrant gets.
  *   - producing to a PARTITIONED topic round-robins, and the session runs one consumer per
  *     partition, so the merged view has no total order. Every assertion below is on a SET.
  *   - a partitioned topic's partitions are what the session actually subscribes to, so
  *     "the session is attached" has to be checked per partition (see `awaitConsumersFlowing`).
  *
  * The arrangement and assertion helpers come from `StartFromSupport`, which this spec used to
  * carry near-identical private copies of. The shared ones are stronger in the way that matters
  * here: `assertLoadedExactlyWithCounter` also pins the toolbar's `cs-loaded` counter and requires
  * it to STAY there, which the local copy could not - it compared the currently rendered rows of a
  * VIRTUALIZED table, so a message loaded off-screen, or one that arrived just after the first
  * matching poll, passed.
  */
class CsTopicKindsSpec extends StartFromSupport:
  private def vis = new LocatorAssertions.IsVisibleOptions().setTimeout(30000)

  private def produce(fqn: String, values: Seq[String]): Unit = fixtures.produceUnbatched(fqn, values)

  /** Messages published BEFORE the session exists. Every test that arranges them also asserts none
    * of them came back, so the prefix is what a stray one is recognized by. */
  private val OldPrefix = "old-"

  /** What the toolbar counter already stood at before a test's payload was produced.
    *
    * Zero on the retaining quadrants - nothing is loaded there until the payload is. The
    * non-persistent ones first have to prove the stream is live by getting a handshake row rendered,
    * and handshakes count towards `cs-loaded` too, so their baseline is whatever the counter settled
    * at once the handshakes stopped arriving. */
  private def streamingBaseline(cs: ConsumerSessionPage, fqn: String, kind: fixtures.TopicKind): Int =
    if kind.retains then 0
    else
      awaitSessionStreaming(cs, fqn)
      settledLoaded(cs)

  fixtures.TopicKind.all.foreach { kind =>

    test(s"CS-TK-1 [${kind.label}]: the session mounts on the topic and starts") {
      val (t, ns, topic, _) = fixtures.freshTopicPartsOfKind(kind)
      val cs = ConsumerSessionPage(page)
      cs.openForTopic(t, ns, topic, kind.scheme)

      // The configuration view comes first - the message table only mounts once a message exists.
      assertThat(cs.startFromSelect).isVisible(vis)
      assertThat(cs.playButton).isVisible(vis)
      assert(cs.state == "new", s"unexpected initial session state: ${cs.state}")

      cs.play()
      // 'running' is set only when CreateConsumer returns OK, which makes it a real server-side
      // gate: the target resolved this topic kind, the consumers subscribed, and the start-from
      // seek did not throw. A failure here is a broken quadrant, not a slow one.
      cs.assertState("running")
      assertThat(cs.awaitingText).isVisible(vis)
    }

    test(s"CS-TK-2 [${kind.label}]: Start From = Latest loads exactly the messages produced after play") {
      val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
      // Sentinels published BEFORE the session exists. Without them this test could not tell
      // "Latest" from "Earliest" at all: on a topic that was EMPTY at play time both modes deliver
      // exactly the rows produced afterwards, so an implementation that ignored the selected mode
      // passed. With them, the retaining quadrants have history on disk that only Latest keeps out -
      // and it is the same history CS-TK-3 proves Earliest does deliver, so the two tests now
      // disagree about the same topic contents rather than agreeing by construction.
      // (On a non-persistent topic the broker drops these anyway - CS-TK-5 is where that is the
      // point; here they are simply harmless.)
      val old = (1 to 3).map(i => s"${OldPrefix}tk-$i")
      produce(fqn, old)

      val cs = ConsumerSessionPage(page)
      cs.openForTopic(t, ns, topic, kind.scheme)
      cs.setStartFrom("Latest message")
      cs.play()
      cs.assertState("running")
      awaitConsumersFlowing(fqn, kind)
      val base = streamingBaseline(cs, fqn, kind)

      val payload = Seq("tk-1", "tk-2", "tk-3", "tk-last") // "tk-last" is produced last
      produce(fqn, payload)
      assertLoadedExactlyWithCounter(cs, payload, base)
      val rendered = cs.columnValues("value")
      assert(
        !rendered.exists(_.startsWith(OldPrefix)),
        s"Start From = Latest delivered a message published before the session started: $rendered"
      )
      cs.waitHeader() // the real message table rendered, not just the empty state
    }

    if kind.retains then
      test(s"CS-TK-3 [${kind.label}]: Start From = Earliest loads the whole pre-produced set") {
        val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
        val pre = Seq("pre-1", "pre-2", "pre-3", "pre-last")
        produce(fqn, pre) // round-robins across partitions when the kind is partitioned

        val cs = ConsumerSessionPage(page)
        cs.openForTopic(t, ns, topic, kind.scheme)
        cs.setStartFrom("Earliest message")
        cs.play()
        cs.assertState("running")
        assertLoadedExactlyWithCounter(cs, pre)
      }

      test(s"CS-TK-4 [${kind.label}]: Start From = Skip first n skips exactly the first n messages") {
        val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
        // The partitioned kind is fed through ONE partition deliberately: "the first n messages" is
        // only well defined on a single ordered log, and a partitioned topic has no total order.
        // This still drives the partitioned branch end to end - the topic is expanded into its
        // partitions and every partition gets its own consumer and its own seek - it just makes the
        // expectation unambiguous.
        val log = if kind.isPartitioned then s"$fqn-partition-0" else fqn
        val all = (1 to 6).map(i => s"m-$i")
        produce(log, all)

        val cs = ConsumerSessionPage(page)
        cs.openForTopic(t, ns, topic, kind.scheme)
        cs.setStartFrom("Skip first n messages")
        cs.startFromN.fill("2")
        cs.play()
        cs.assertState("running")
        // The control is labelled "Skip first n messages", so n = 2 out of 6 must leave m-3..m-6.
        assertLoadedExactlyWithCounter(cs, all.drop(2))
      }

      if kind.isPartitioned then
        // UNTAGGED on 2026-07-25 - green in the normal lane. This was `KnownBug` twice over: first
        // for a real defect (skipping across partitions dropped nothing at all), then because the
        // expectation below - `all.drop(2)` - is a statement about a GLOBAL order that the
        // then-current contract did not promise. Skip-N was resolved per partition, so it dropped
        // two arbitrary messages and runs disagreed about which (m-1 + m-6 in one, m-4 + m-5 in
        // another).
        //
        // Skip-N is now GLOBAL: it drops the n oldest messages of the merged stream by publish time,
        // whichever partitions they came from. The payload below is produced through the parent one
        // blocking send at a time, so publish order is m-1 .. m-6 and the two globally-oldest are
        // m-1 and m-2 - exactly what `all.drop(2)` says.
        //
        // The SET is the assertion, not the count: dropping any other two also leaves four.
        //
        // The one residual assumption is that six blocking sends land in six distinct milliseconds -
        // if two shared one, the global order between their partitions would be decided by the
        // ordering key's tie-break rather than by produce order. A blocking send costs a broker round
        // trip, and this ran green six times running, so it is stated rather than defended here.
        // `CsStartFromMatrixSpec` CS-SFM-3 covers the same contract without the assumption: it spaces
        // its publishes and derives the expectation from the broker's own publish times.
        test(s"CS-TK-6 [${kind.label}]: Skip first n works when messages are spread across ALL partitions") {
          // CS-TK-4 deliberately funnels every message through partition-0 to make "first n"
          // unambiguous - which also means it never exercises the real multi-partition path. Here
          // the default RoundRobinPartition router spreads 6 messages over 3 partitions (2 each),
          // which is what ordinary produce traffic looks like.
          val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
          val all = (1 to 6).map(i => s"m-$i")
          produce(fqn, all) // parent topic -> round-robin across the 3 partitions

          val cs = ConsumerSessionPage(page)
          cs.openForTopic(t, ns, topic, kind.scheme)
          cs.setStartFrom("Skip first n messages")
          cs.startFromN.fill("2")
          cs.play()
          cs.assertState("running")
          // Skipping 2 of 6 must leave 4 messages, whichever partitions they came from.
          assertLoadedExactlyWithCounter(cs, all.drop(2))
        }
    else
      test(s"CS-TK-5 [${kind.label}]: nothing is retained - every history mode is refused, the live session still streams") {
        val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
        val dropped = (1 to 4).map(i => s"${OldPrefix}$i")
        produce(fqn, dropped) // no consumer attached -> the broker drops these forever

        val cs = ConsumerSessionPage(page)
        cs.openForTopic(t, ns, topic, kind.scheme)
        // "Nothing is retained" is now enforced in the selector, not just observable afterwards:
        // every history-based mode is disabled here, INCLUDING "Earliest message" - which used to be
        // the misleading one, since with nothing retained it quietly behaved as "from now".
        // Asserting the disabled set is what this test's title has always claimed to prove.
        assert(
          cs.disabledStartFromLabels.toSet == Set(
            "Earliest message",
            "Message with specific ID",
            "Specific time",
            "Relative time ago",
            "Skip first n messages",
            "Latest n messages",
            // Both approximate modes need a history to be a proportion OF: one asks the broker for
            // the topic's entry count, the other for its first and last publish times, and
            // examineMessage answers neither on a non-persistent topic.
            "About % through the data",
            "About % through the time range"
          ),
          s"disabled modes on a non-persistent topic were: ${cs.disabledStartFromLabels}"
        )
        assertThat(cs.startFromNonPersistentNote).isVisible(vis)

        cs.setStartFrom("Latest message") // the only position a non-persistent topic has
        cs.play()
        cs.assertState("running")
        awaitConsumersFlowing(fqn, kind)
        // Prove the session is really streaming BEFORE asserting the negative: an empty table only
        // means "nothing was retained" once we know a message would have shown up.
        val base = streamingBaseline(cs, fqn, kind)

        val live = Seq("new-1", "new-2", "new-last")
        produce(fqn, live)
        assertLoadedExactlyWithCounter(cs, live, base)
        val rendered = cs.columnValues("value")
        assert(!rendered.exists(_.startsWith(OldPrefix)), s"a non-persistent topic retained a pre-produced message: $rendered")
      }
  }
