package features.consumersession

import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import org.apache.pulsar.client.api.{Message as PulsarMessage, Schema}

/** The two COUNTING Start-From modes - "Skip first n messages" and "Latest n messages" - crossed
  * with both ways an application writes to Pulsar (batched / unbatched) and with the whole topic
  * matrix ({persistent, non-persistent} x {partitioned, non-partitioned}).
  *
  * Why the batching axis: until 2026-07-25 both modes were implemented on
  * `PulsarAdmin.examineMessage`, which addresses ENTRIES. The Java producer packs many messages into
  * one entry by default, so in any ordinary application "the 6th entry" and "the 6th message" are
  * different things - and every fixture the suite had produced exactly one message per entry, which
  * made the two indistinguishable. See `harness.BatchingFixtureSpec` for the broker-level proof of
  * both facts, and `CsStartFromOutcomesSpec` for the same two modes examined in isolation.
  *
  * The contracts asserted here, as implemented. BOTH counting modes are GLOBAL in COUNT - n in
  * total across the whole session, never n per partition - and the merge takes each partition in
  * its own APPEND order, comparing publish times only across the partitions' current heads. On
  * same-clock producers that is the publish-time answer; where producer clocks disagree, WHICH n
  * can differ from a strict global-publish-time sort (a buried out-of-order timestamp is not dug
  * out), while the count stays exactly n. globalStartFromTest pins both sides of that line.
  *   - **Skip first n** drops n and delivers everything else. On a single ordered log that is
  *     exactly "start at message n + 1"; across partitions it is the n oldest as the merge sees
  *     them, whichever partitions they came from.
  *   - **Latest n** delivers EXACTLY n in total. It used to be resolved per physical topic, so
  *     "latest 2" on a 3-partition topic returned six; CS-SFM-4 is the regression against that.
  *
  * The cells generated from the topic matrix still funnel their payload through ONE partition, where
  * the two contracts coincide with "the first / last n of that log" - which is what makes their
  * expectation a plain slice of the payload. The genuinely-spread cases, where a per-topic answer
  * and the global one differ, are CS-SFM-3/4 at the bottom of this spec.
  *
  * NON-PERSISTENT quadrants get a different assertion, not a weaker one. Such a topic retains
  * nothing - anything published while no consumer is attached is dropped by the broker forever, and
  * PulsarAdmin will not examine one at all - so there is no history to count into. The app now says
  * so up front: both counting modes are rendered DISABLED with a note, and the server rejects them
  * for an all-non-persistent session rather than degrading into a silent "from now". Those cells
  * assert the refusal, plus that the live tail still works and none of the pre-produced messages
  * come back.
  */
class CsStartFromMatrixSpec extends StartFromSupport:

  /** 12 messages -> 3 entries when batched at 4/entry: entry positions and message positions are
    * far enough apart that no off-by-a-factor can be mistaken for a correct answer. `m-12` is the
    * sentinel and is in both expectations below. */
  private val payload = (1 to 12).map(i => f"m-$i%02d")

  /** A counting mode: the dropdown label, and the messages it must leave showing. */
  private case class Counting(id: String, uiLabel: String, n: String, expected: Seq[String])
  private val counting = List(
    Counting("skip-first-n", "Skip first n messages", "5", payload.drop(5)),      // m-06 .. m-12
    Counting("latest-n", "Latest n messages", "5", payload.takeRight(5))          // m-08 .. m-12
  )

  /** The single ordered log the expectation is stated against.
    *
    * A partitioned topic is fed through ONE partition on purpose: "the first n messages" is only
    * defined on a totally ordered log, and a partitioned topic has none. This still drives the
    * partitioned code path end to end - the session subscribes to the parent, so every partition is
    * expanded, subscribed and seeked - it only makes the expectation unambiguous. The genuinely
    * spread-across-partitions cases are CS-SFM-3/4 below. */
  private def logOf(fqn: String, kind: fixtures.TopicKind): String =
    if kind.isPartitioned then s"$fqn-partition-0" else fqn

  fixtures.TopicKind.all.foreach { kind =>
    if kind.retains then
      Produce.values.foreach { produce =>
        counting.foreach { c =>
          val cell = s"[${kind.label}] [${produce.label}] [${c.id}]"
          // The batched cells are the regression: before 2026-07-25 both modes counted broker
          // ENTRIES, and with these 12 messages in 3 entries "skip 5" started at m-09 (it skipped
          // eight) while "latest 5" showed all twelve. Both mechanisms are pinned in BATCH-2.
          test(s"CS-SFM-1 $cell: shows exactly the expected MESSAGES") {
            val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
            produceAs(produce, logOf(fqn, kind), payload)

            val cs = ConsumerSessionPage(page)
            cs.openForTopic(t, ns, topic, kind.scheme)
            cs.setStartFrom(c.uiLabel)
            cs.startFromN.fill(c.n)
            cs.play()
            cs.assertState("running")
            assertLoadedExactlyWithCounter(cs, c.expected)
          }
        }
      }
    else
      // ONE test per non-persistent kind. The batched/unbatched axis is decorative here: a
      // non-persistent topic retains nothing, so the pre-produced payload is dropped by the broker
      // regardless of how it was batched (and `produceBatched` cannot even verify itself without a
      // managed ledger). BOTH counting modes must be refused, so they are asserted together rather
      // than across four byte-identical (produce x counting) cells that only differ in which label
      // they happen to check.
      test(s"CS-SFM-2 [${kind.label}]: no history to count - both counting modes refused, the live stream is exact") {
        val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
        produceAs(Produce.Unbatched, fqn, payload) // no consumer attached -> the broker drops these forever

        val cs = ConsumerSessionPage(page)
        cs.openForTopic(t, ns, topic, kind.scheme)
        // The counting modes cannot mean anything here, and are no longer offered as if they could:
        // each is rendered disabled and a note says why. Asserting the refusal is stronger than
        // asserting that a permitted-but-meaningless selection happened to behave.
        counting.foreach { c =>
          assert(
            cs.disabledStartFromLabels.contains(c.uiLabel),
            s"'${c.uiLabel}' is still selectable on a non-persistent topic; disabled: ${cs.disabledStartFromLabels}"
          )
        }
        assertThat(cs.startFromNonPersistentNote).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20000))

        // What the topic CAN do still has to work, and the pre-produced messages must stay gone.
        cs.setStartFrom("Latest message")
        cs.play()
        cs.assertState("running")
        awaitConsumersFlowing(fqn, kind)
        // Prove the stream is live BEFORE asserting the negative - an empty table only means
        // "nothing was retained" once we know a message would have shown up.
        awaitSessionStreaming(cs, fqn)

        val live = Seq("live-1", "live-2", "live-last")
        produceAs(Produce.Unbatched, fqn, live)
        assertLoadedExactly(cs, live)
        val rendered = cs.columnValues("value")
        assert(
          !rendered.exists(_.startsWith("m-")),
          s"a non-persistent topic answered a counting Start-From with retained history: $rendered"
        )
      }
  }

  // -------------------------------------------------------------------------------------------
  // Messages spread across ALL partitions - where a per-topic answer and the global one diverge
  //
  // Everything above funnels its payload through one partition, where "the first n" and "the last
  // n" of that single log ARE the global answer. These two put part of the payload on every
  // partition, which is the only shape in which a per-partition implementation and the global
  // contract disagree: "skip n" has to pick the n oldest across independent consumers, and
  // "latest n" has to return n messages rather than n per partition.
  //
  // Deliberately NO message filter, value projection or coloring rule is configured here, so a
  // failure here is about start-from and nothing else.
  //
  // The CONCURRENT-ENTRY hazard that used to live next door is fixed: a session still gets ONE
  // GraalVM JS context (`ConsumerSessionContextPool` pins the pool to size 1) while a partitioned
  // topic gives each partition its own listener thread, but `ConsumerSessionContext.exclusively` now
  // leases that context for a WHOLE message, so two threads can no longer be inside it at once
  // ("Multi threaded access ... is not allowed for language(s) js") nor interleave a
  // `setCurrentMessage` with another message's chain.
  //
  // The ORDERING race that used to be described here is fixed as well: `ConsumerListener.received`
  // now resolves AND processes inside `startFromOrdering.inOrder`, so the vector the merge chose is
  // handed to the target handler under the very lock that chose it. It is no longer possible for two
  // listener threads to resolve in one order and deliver in another.
  //
  // The OUTPUT stream's ORDER and TERMINATION hazards this comment used to file as still-open are now
  // fixed too, and this arrangement does not exercise them either. Every write goes through
  // `ConsumerSessionRunner.sendResponse`, which holds `sendLock`, and:
  //   - `sendResponse` now BUILDS the response, start-from progress and all, INSIDE that lock (behind
  //     an `if !streamCompleted` check), so an older incomplete frame can no longer overtake a newer
  //     complete one;
  //   - `stop()` now calls `observer.onCompleted()` INSIDE the lock behind a sticky `streamCompleted`
  //     terminal gate, so nothing is written after completion and completion never interleaves with an
  //     in-flight `onNext`.
  // Both are pinned at the server tier by `sessionOutputSerializationTest` (suite "progress never goes
  // backwards, and nothing follows the end of the stream"); see e2e/README.md §6.
  // -------------------------------------------------------------------------------------------

  private val spreadKind = fixtures.TopicKind.PersistentPartitioned

  /** Gap left between two publishes by `spread`.
    *
    * Both counting modes are defined over the merged stream ordered by PUBLISH TIME, so an
    * expectation of the form "the globally-earliest n" is only well defined while no two messages
    * share a millisecond. Enforced by ARRANGEMENT (and checked in `globalOrder`) rather than by
    * re-implementing the server's tie-break here, which would make the test agree with a broken
    * tie-break instead of catching it. */
  private val PublishGapMs = 20L

  /** What each partition actually holds, oldest first, read back from the broker - the ORACLE both
    * multi-partition expectations are derived from. The router's starting partition is chosen at
    * random, so hard-coding the split would be wrong; only the broker knows it. */
  private def partitionContents(fqn: String): Vector[Vector[PulsarMessage[String]]] =
    (0 until spreadKind.partitions).toVector.map(p => fixtures.readAllMessages(s"$fqn-partition-$p"))

  /** The merged stream in the GLOBAL publish-time order both counting modes are defined over,
    * derived entirely from the broker - never from the payload names.
    *
    * A stable sort by publish time is a total order only while no two messages sharing a publish
    * time sit in DIFFERENT partitions; `spread` is what makes that true and this asserts it rather
    * than assuming it. Equal times do survive inside a producer BATCH - one entry, one publish time,
    * every message in it - but a batch lives in a single partition and is read back in produce
    * order, which the stable sort preserves. */
  private def globalOrder(perPartition: Vector[Vector[PulsarMessage[String]]]): Vector[String] =
    val flat = perPartition.zipWithIndex.flatMap { case (msgs, p) => msgs.map(m => (p, m)) }
    flat.groupBy { case (_, m) => m.getPublishTime }.foreach { case (publishTime, group) =>
      val partitions = group.map { case (p, _) => p }.distinct
      assert(
        partitions.size == 1,
        s"publish time $publishTime is shared by partitions $partitions, so 'the globally-earliest n' is " +
          s"not decidable from publish time alone: ${group.map { case (_, m) => m.getValue }}"
      )
    }
    flat.sortBy { case (_, m) => m.getPublishTime }.map { case (_, m) => m.getValue }

  /** Put `values` on the partitioned topic so that EVERY partition ends up holding some of it, and
    * so that publish times never collide across partitions.
    *
    * Unbatched goes through the parent and lets the default round-robin router spread it - ordinary
    * produce traffic - one message at a time. Batched cannot go that way: with batching on, the
    * round-robin router only switches partition every `batchingPartitionSwitchFrequencyByPublishDelay`
    * x publish delay, so a burst lands entirely on ONE partition (observed - the whole payload on
    * partition 1). Addressing the partitions directly is the only way to get batched entries onto
    * more than one of them, and the gap then goes BETWEEN batches, a batch being one entry with one
    * publish time shared by everything in it.
    *
    * The gaps are ARRANGEMENT, not readiness waits: the only way to put messages at distinct known
    * instants is to publish them at distinct instants. */
  private def spread(produce: Produce, fqn: String, values: Seq[String]): Unit = produce match
    case Produce.Unbatched =>
      // One producer for the whole payload, so the round-robin router really rotates through the
      // partitions instead of restarting from a fresh random one per message.
      val producer = client.newProducer(Schema.STRING).topic(fqn).enableBatching(false).create()
      try
        values.foreach { value =>
          val sentAt = System.currentTimeMillis()
          producer.send(value)
          awaitClockGap(sentAt, PublishGapMs)
        }
      finally producer.close()
    case Produce.Batched =>
      val perPartition = math.ceil(values.size.toDouble / spreadKind.partitions).toInt
      values.grouped(perPartition).zipWithIndex.foreach { case (chunk, i) =>
        val sentAt = System.currentTimeMillis()
        fixtures.produceBatched(s"$fqn-partition-$i", chunk, MessagesPerBatch)
        awaitClockGap(sentAt, PublishGapMs)
      }

  Produce.values.foreach { produce =>

    test(s"CS-SFM-3 [${spreadKind.label}] [${produce.label}] [skip-first-n]: drops the GLOBALLY-EARLIEST n across every partition") {
      val skip = 3
      val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(spreadKind)
      spread(produce, fqn, payload)
      val perPartition = partitionContents(fqn)
      assert(
        perPartition.flatten.map(_.getValue).toSet == payload.toSet,
        s"the arrangement did not land: ${perPartition.map(_.map(_.getValue))}"
      )
      // Every partition has to hold some of the payload, or the session never merges anything and
      // the global contract is indistinguishable from the single-log one.
      assert(
        perPartition.forall(_.nonEmpty),
        s"this test needs every partition to hold part of the payload, got ${perPartition.map(_.size)}"
      )

      // Not payload.drop(skip): WHICH messages are globally oldest is a fact about publish times
      // that only the broker knows - the router decides where each message lands, and a batch shares
      // one publish time across everything in it.
      val expected = globalOrder(perPartition).drop(skip)

      val cs = ConsumerSessionPage(page)
      cs.openForTopic(t, ns, topic, spreadKind.scheme)
      cs.setStartFrom("Skip first n messages")
      cs.startFromN.fill(skip.toString)
      cs.play()
      cs.assertState("running")
      // An exact SET, not a count. Dropping any other three messages also leaves nine, so a count
      // would pass for an implementation that dropped the first three to ARRIVE rather than the
      // three oldest - which is precisely what the per-topic implementation did.
      assertLoadedExactlyWithCounter(cs, expected)
    }

    test(s"CS-SFM-4 [${spreadKind.label}] [${produce.label}] [latest-n]: shows exactly the globally-latest n, not n per partition") {
      val n = 2
      val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(spreadKind)
      spread(produce, fqn, payload)
      val perPartition = partitionContents(fqn)
      assert(
        perPartition.flatten.map(_.getValue).toSet == payload.toSet,
        s"the arrangement did not land: ${perPartition.map(_.map(_.getValue))}"
      )

      // "Latest n" is GLOBAL: exactly the n newest messages of the merged stream, however they are
      // distributed. Derived from the broker's own publish times, not from the message names.
      val expected = globalOrder(perPartition).takeRight(n)
      assert(expected.size == n, s"the globally-latest $n should be $n messages, got $expected")

      // THE regression. "Latest n" used to be resolved per physical topic, so this arrangement
      // answered with the last n of EACH partition - up to six. Asserting here that the two answers
      // really do differ is what stops the test also passing on the old behavior.
      val perTopicAnswer = perPartition.filter(_.nonEmpty).flatMap(_.takeRight(n)).map(_.getValue)
      assert(
        perTopicAnswer.size > n,
        s"this only pins the GLOBAL contract while the per-partition answer is larger than $n: $perTopicAnswer"
      )

      val cs = ConsumerSessionPage(page)
      cs.openForTopic(t, ns, topic, spreadKind.scheme)
      cs.setStartFrom("Latest n messages")
      cs.startFromN.fill(n.toString)
      cs.play()
      cs.assertState("running")
      assertLoadedExactlyWithCounter(cs, expected)
    }
  }
