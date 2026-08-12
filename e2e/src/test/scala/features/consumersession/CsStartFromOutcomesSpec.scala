package features.consumersession

import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

import java.time.{Instant, LocalDateTime, ZoneId}

/** Start-From OUTCOME coverage: for each mode, the exact set of messages the session ends up
  * showing.
  *
  * Before this spec only Earliest and Latest had outcome coverage (`CsStartFromSpec` CS-2/CS-3);
  * the five addressed modes - skip first n, latest n, message id, specific time, relative time -
  * had none at all. Everything here runs on a PERSISTENT NON-PARTITIONED topic, which is the
  * single-topic fast path in `handleStartFrom` (a message-id seek); `CsStartFromMatrixSpec` crosses
  * the same two counting modes with the rest of the topic matrix.
  *
  * The two APPROXIMATE modes are both covered below - "Approximate position (% of data)" (CS-SF-11..14) and
  * "Approximate position (% of time)" (CS-SF-16..19) - including CS-SF-17, where one topic is asked the same
  * "50%" by both and answers differently. Being non-partitioned, these do not exercise what the two
  * modes do across several physical topics - entry position resolving each independently, publish-time
  * position pooling one min/max range over them: that is `CsApproximatePartitionedSpec` (CS-SF-20/21),
  * with the pure arithmetic in `server/.../approximatePublishTimePositionTest`.
  *
  * Each test asserts an exact SET, never a row count: "skip the first 5" and "skip the first 50"
  * both produce *a* count, and a virtualized table reaches a transient count for almost any bug.
  * The last produced message doubles as the sentinel - it is in every expectation here, so the set
  * cannot be satisfied until the whole stream has been observed.
  *
  * Batching is the axis this spec exists for. `PulsarAdmin.examineMessage`, which the two counting
  * modes are built on, addresses ENTRIES; the Java producer packs many messages into one entry by
  * default; and every fixture the suite had produced one message per entry, so entry positions and
  * message positions always coincided and the two could never be told apart. See
  * `harness.BatchingFixtureSpec` for the broker-level proof of both facts.
  */
class CsStartFromOutcomesSpec extends StartFromSupport:

  /** 12 messages -> 3 entries when batched at 4/entry, so an entry position and a message position
    * can never be mistaken for one another. `m-12` is the sentinel. */
  private val payload = (1 to 12).map(i => f"m-$i%02d")

  private def openOn(fqn: String, t: String, ns: String, topic: String): ConsumerSessionPage =
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs

  // -------------------------------------------------------------------------------------------
  // Skip first n  (NthMessageAfterEarliest)
  // -------------------------------------------------------------------------------------------

  test("CS-SF-1: Skip first n (unbatched) shows every message except the first n") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("5")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload.drop(5)) // m-06 .. m-12
  }

  // The regression this whole spec exists for. Until 2026-07-25 the mode was implemented as an
  // entry-addressed `examineMessage("earliest", n + 1)` seek, and BATCH-2 pins why that cannot work:
  // that call answers with the first message of the n-th ENTRY and, past the last entry, silently
  // returns the last entry instead of failing. With these 12 messages in 3 entries, "skip 5" asked
  // for position 6, got entry 3, and started at m-09 - it skipped EIGHT. Nothing caught it because
  // every fixture in the suite produced one message per entry.
  test("CS-SF-2: Skip first n (batched) skips n MESSAGES, not n entries") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceBatched(fqn, payload, MessagesPerBatch) // 12 messages -> 3 entries

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("5")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload.drop(5)) // m-06 .. m-12
  }

  // -------------------------------------------------------------------------------------------
  // Latest n  (NthMessageBeforeLatest)
  // -------------------------------------------------------------------------------------------

  test("CS-SF-3: Latest n (unbatched) shows exactly the last n messages") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("5")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload.takeRight(5)) // m-08 .. m-12
  }

  // The counterpart regression, and the old failure shape differed from CS-SF-2's: counting entries
  // BACK from the end does not clamp - `examineMessage("latest", n)` past the first entry THROWS
  // (BATCH-2). The seek swallowed that and fell back to Earliest, so "show me the latest 5" showed
  // all twelve. A row count would have called that "5 or more" and moved on; the exact set will not.
  test("CS-SF-4: Latest n (batched) shows the last n MESSAGES, not the last n entries") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceBatched(fqn, payload, MessagesPerBatch) // 12 messages -> 3 entries

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("5")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload.takeRight(5)) // m-08 .. m-12
  }

  // -------------------------------------------------------------------------------------------
  // The n = 0 boundary - the two modes are deliberately asymmetric there
  // -------------------------------------------------------------------------------------------

  test("CS-SF-9: Skip first n with n = 0 skips nothing") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceBatched(fqn, payload, MessagesPerBatch)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("0")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload) // "skip zero" is Earliest
  }

  test("CS-SF-10: Latest n with n = 0 shows nothing, and still streams what arrives after play") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceBatched(fqn, payload, MessagesPerBatch)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("0")
    cs.play()
    cs.assertState("running")
    // "the last zero messages" is Latest: none of the history, and the empty state is the proof.
    assertThat(cs.awaitingText).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20000))
    assert(cs.columnValues("value").isEmpty, s"n = 0 loaded history: ${cs.columnValues("value")}")

    // An empty table alone would also be what a dead session looks like, so prove it is live.
    val live = Seq("live-1", "live-2", "live-last")
    fixtures.produceUnbatched(fqn, live)
    assertLoadedExactlyWithCounter(cs, live)
  }

  // The one join neither the jest tests nor the server tests can reach: the server really populating
  // `start_from_progress`, travelling over gRPC, and arriving in the rendered panel. Both ends are
  // covered in isolation; this is the wire between them.
  //
  // The panel is deliberately silent at or below 1,000,000 messages to skip, so the only way to see
  // it is to ask for a skip larger than that - hence a number with no relation to the 12 messages
  // actually on the topic. That is also what makes the test cheap: nothing has to be produced to
  // reach the threshold, because `messagesToSkip` is what was ASKED for, not what exists.
  test("CS-SF-15: a very large skip reports its progress from the server into the rendered panel") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("2000000")
    cs.play()
    cs.assertState("running")

    // The raw counts, not the prose. `skipped` must be strictly POSITIVE, and that is the whole
    // point of the test: the server reports as soon as the discard claims its first message, so a
    // positive count is the only thing that separates a real progress callback - listener -> gRPC
    // -> panel - from a zero-state frame the UI could have rendered from its own initial state.
    // Accepting `>= 0` (which this test used to do) accepted exactly that empty frame.
    val skipped = harness.Eventually.eventually(timeoutMs = 30000, intervalMs = 400) {
      assert(cs.startFromProgress.count() > 0, "the progress panel never appeared")
      val reported = cs.startFromProgress.getAttribute("data-cs-skipped").toLong
      assert(reported > 0, s"the panel is still at its zero state: skipped = $reported")
      reported
    }
    val toSkip = cs.startFromProgress.getAttribute("data-cs-to-skip")
    assert(toSkip == "2000000", s"to-skip was $toSkip")
    // Only 12 messages exist, so a skip of two million can never claim more than those twelve, can
    // never finish, and can never deliver anything.
    assert(skipped <= payload.size, s"skipped $skipped of a ${payload.size}-message topic")
    assert(cs.columnValues("value").isEmpty, s"a skip of 2,000,000 delivered messages: ${cs.columnValues("value")}")
  }

  // -------------------------------------------------------------------------------------------
  // Approximate position (% of data)  (ApproximateEntryPosition)
  //
  // Deliberately ENTRY-addressed (it has to resolve in constant time at any topic size), so the
  // expectation is derived from the broker's real entry count rather than from the message count -
  // the same percentage lands somewhere different on batched and unbatched data, and that is the
  // documented contract, not a defect. Asserting it from the oracle is what keeps these two tests
  // honest: hard-coding message positions would quietly encode the unbatched case as "the" answer.
  // -------------------------------------------------------------------------------------------

  /** The messages expected after positioning `percent` through the retained ENTRIES of `fqn`.
    *
    * `messages` MUST be the values actually produced to `fqn`, in order. It defaults to the shared
    * `payload` because most cells use exactly that - but CS-SF-17 arranges its own set, and the
    * default silently gave a confident answer about a topic it had never looked at.
    *
    * The guard compares against `messages` rather than `payload` for the same reason: with `payload`
    * it passed by COINCIDENCE, both arrangements happening to hold 12 messages, so the mistake
    * surfaced as a baffling set mismatch instead of naming the real problem.
    */
  private def expectedFromEntryPercent(
      fqn: String,
      percent: Int,
      messagesPerEntry: Int,
      messages: Seq[String] = payload
  ): Seq[String] =
    val entries = fixtures.numberOfEntries(fqn)
    assert(entries == messages.size / messagesPerEntry, s"unexpected arrangement: $entries entries for ${messages.size} messages")
    // The broker is the oracle for WHICH messages, not just how many. The count check above is too
    // weak on its own: CS-SF-17 arranged 12 messages of its own while `messages` defaulted to a
    // DIFFERENT 12, so the count matched and the helper confidently described the wrong topic.
    val onTopic = fixtures.readAllMessages(fqn).map(_.getValue)
    assert(onTopic == messages, s"`messages` does not match $fqn: expected $messages, topic holds $onTopic")
    val entriesLeftBehind = math.floor(percent / 100.0 * entries).toInt
    messages.drop(entriesLeftBehind * messagesPerEntry)

  test("CS-SF-11: data position (unbatched) starts at the selected entry percentage") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload) // 12 entries, 1 message each

    val expected = expectedFromEntryPercent(fqn, 50, messagesPerEntry = 1) // m-07 .. m-12
    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("50")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, expected)
  }

  test("CS-SF-12: data position follows ENTRIES even when batch sizes are deliberately uneven") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val largeFirstEntry = payload.take(8)
    val singletonEntry = payload.slice(8, 9)
    val finalEntry = payload.drop(9)
    fixtures.produceBatches(fqn, Seq(largeFirstEntry, singletonEntry, finalEntry))

    val entries = fixtures.numberOfEntries(fqn)
    assert(entries == 3, s"the uneven arrangement should contain exactly 3 entries, got $entries")
    assert(
      fixtures.readAllMessages(fqn).map(_.getValue) == payload,
      s"the uneven batches did not preserve message order on $fqn"
    )

    // 50% of three entries leaves the large first entry behind, so all four messages in the two
    // remaining entries are delivered. A message-based midpoint would leave only m-07..m-12 and
    // therefore cannot satisfy this exact set.
    val expected = singletonEntry ++ finalEntry
    assert(expected != payload.drop(payload.size / 2), s"entry and message midpoints accidentally coincide: $expected")

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("50")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, expected)
  }

  test("CS-SF-13: data position endpoints - 0% is Earliest, 100% is Latest") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("0")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload)

    // 100% is the other endpoint: past the last retained message, i.e. the live tail.
    val (t2, ns2, topic2) = fixtures.freshTopicParts()
    val fqn2 = s"persistent://$t2/$ns2/$topic2"
    fixtures.produceUnbatched(fqn2, payload)

    cs.openForTopic(t2, ns2, topic2)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("100")
    cs.play()
    cs.assertState("running")
    assertThat(cs.awaitingText).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(20000))
    assert(cs.columnValues("value").isEmpty, s"100% loaded history: ${cs.columnValues("value")}")

    val live = Seq("live-1", "live-2", "live-last")
    fixtures.produceUnbatched(fqn2, live)
    assertLoadedExactlyWithCounter(cs, live)
  }

  test("CS-SF-14: data position rejects a percentage outside 0-100 without changing the session") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("150") // the model stores a fraction in [0, 1]; 150% has no meaning
    assertThat(cs.startFromEntryFractionError).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))

    // Play with the rejected text STILL ON SCREEN. This is the whole test: the invalid value must
    // never reach the session, so the run has to come out at the last VALID value - the 50% default.
    // Correcting the field to 50 first (which this test used to do) only proved that validation
    // recovers, and a session that had silently accepted 150% would have passed it unchanged.
    //
    // NOTE ON THE PRECONDITION: today the toolbar leaves Play ENABLED while the fraction is
    // invalid, so "does not change the session" has to mean "runs at the last valid value". If the
    // app is later changed to propagate validity and DISABLE Play (an open product question - an
    // even stronger way to honour the same contract), this assertion is the one to rewrite: drop
    // the play and assert the disabled button instead. It is asserted rather than assumed so that
    // change surfaces here, with this sentence attached, instead of as a mystery timeout.
    assert(cs.playButton.isEnabled, "Play is disabled while the fraction is invalid - see the note above")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, expectedFromEntryPercent(fqn, 50, messagesPerEntry = 1))

    // ... and the field is not simply inert: a VALID change on the same control does move the
    // session. Without this leg the assertion above would also hold for a mode that ignored the
    // fraction entirely and always started half way in.
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("0")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload)
  }

  // -------------------------------------------------------------------------------------------
  // Message with specific ID  (MessageId)
  // -------------------------------------------------------------------------------------------

  /** The broker's own message ids are the oracle - the UI takes the serialized id as hex. */
  private def messageIdHexOf(fqn: String, value: String): String =
    val msgs = fixtures.readAllMessages(fqn)
    val m = msgs.find(_.getValue == value).getOrElse(fail(s"$value is not on $fqn: ${msgs.map(_.getValue)}"))
    fixtures.messageIdHex(m.getMessageId)

  test("CS-SF-5: Message with specific ID starts AT that message and shows the rest") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Message with specific ID")
    cs.startFromMessageId.fill(messageIdHexOf(fqn, "m-04"))
    cs.play()
    cs.assertState("running")
    // Inclusive: the addressed message is where the session starts, so it is shown too.
    assertLoadedExactlyWithCounter(cs, payload.drop(3)) // m-04 .. m-12
  }

  test("CS-SF-5b: Message with specific ID resolves a message inside a BATCH") {
    // A batched message id carries a batch index; the id-addressed path has to honour it and start
    // mid-entry rather than at the entry's first message.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceBatched(fqn, payload, MessagesPerBatch) // m-05..m-08 share the 2nd entry

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Message with specific ID")
    cs.startFromMessageId.fill(messageIdHexOf(fqn, "m-06")) // index 1 within its entry
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload.drop(5)) // m-06 .. m-12
  }

  // -------------------------------------------------------------------------------------------
  // Specific time (DateTime) and Relative time ago (RelativeDateTime)
  // -------------------------------------------------------------------------------------------

  private val older = (1 to 4).map(i => f"old-$i%02d")
  private val newer = (1 to 4).map(i => f"new-$i%02d") // "new-04" is the sentinel

  /** Produce `older`, leave a real gap on the wall clock, produce `newer`, and return the broker's
    * publish times keyed by value - the oracle both time-addressed modes are asserted against. */
  private def produceStraddling(fqn: String, gapMs: Long): Map[String, Long] =
    fixtures.produceUnbatched(fqn, older)
    awaitClockGap(System.currentTimeMillis(), gapMs)
    fixtures.produceUnbatched(fqn, newer)
    val times = fixtures.readAllMessages(fqn).map(m => m.getValue -> m.getPublishTime).toMap
    assert(
      (older ++ newer).forall(times.contains),
      s"the arrangement did not land on the broker: ${times.keys.toList.sorted}"
    )
    assert(
      older.map(times).max < newer.map(times).min,
      s"the two groups did not straddle the gap: old=${older.map(times)} new=${newer.map(times)}"
    )
    times

  test("CS-SF-6: Specific time shows only messages published at or after that instant") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    // 2s: the picker is second-granular, so the two groups have to sit in different seconds.
    val times = produceStraddling(fqn, gapMs = 2000)
    // The start of the second the first new message landed in: strictly after every old message
    // (the gap guarantees it) and at or before every new one.
    val cutoffMs = newer.map(times).min / 1000 * 1000
    assert(cutoffMs > older.map(times).max, s"cutoff $cutoffMs does not separate the groups: $times")

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Specific time")
    cs.setStartFromDateTime(LocalDateTime.ofInstant(Instant.ofEpochMilli(cutoffMs), ZoneId.systemDefault))
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, newer)
  }

  test("CS-SF-7: Relative time ago with a window that covers everything shows the whole topic") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, payload)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Relative time ago")
    cs.setStartFromRelative(1, "hour") // everything here was published seconds ago
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, payload)
  }

  test("CS-SF-8: Relative time ago with a narrow window excludes the older messages") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    // The window is resolved server-side at seek time, so the arrangement has to leave room for the
    // round trip on both sides: with a 20s gap and a 10s window the cutoff lands ~10s after the old
    // group and ~10s before the new one, wherever in that span the seek actually happens.
    produceStraddling(fqn, gapMs = 20000)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Relative time ago")
    cs.setStartFromRelative(10, "second")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, newer)
  }

  // -------------------------------------------------------------------------------------------
  // Approximate position (% of time)  (ApproximatePublishTimePosition)
  //
  // The sibling of data position above, and the reason both exist: "about half way in" is two
  // different questions. Where entry position counts stored entries, this one interpolates between
  // the first and last PUBLISH TIMES and seeks to the instant that falls out - so the same 50% lands
  // somewhere else entirely on a topic whose messages did not arrive evenly. CS-SF-17 is that
  // contrast, asserted on one topic with both modes.
  //
  // Every expectation here is derived from the broker's own publish times rather than written down,
  // for the same reason the entry-addressed ones are: hard-coding a set would encode one particular
  // arrangement as "the" answer. The arrangements leave SECONDS of margin between the cutoff and the
  // nearest message, so a produce round trip cannot move a message across it.
  // -------------------------------------------------------------------------------------------

  /** Publish `groups` in order with `gapMs` of real wall clock between the start of each, and answer
    * with the broker's publish time for every value produced.
    *
    * This is ARRANGEMENT: the only way to give a topic a time range is to publish across one. The
    * gaps are also the test's safety margin - each group is asserted to sit strictly after the one
    * before it, so a cutoff computed to fall inside a gap cannot accidentally land on a message. */
  private def produceSpacedGroups(fqn: String, groups: Seq[Seq[String]], gapMs: Long): Map[String, Long] =
    var groupStartedAt = System.currentTimeMillis()
    groups.zipWithIndex.foreach { (group, index) =>
      if index > 0 then
        awaitClockGap(groupStartedAt, gapMs)
        groupStartedAt = System.currentTimeMillis()
      fixtures.produceUnbatched(fqn, group)
    }

    val times = fixtures.readAllMessages(fqn).map(m => m.getValue -> m.getPublishTime).toMap
    assert(groups.flatten.forall(times.contains), s"the arrangement did not land on the broker: ${times.keys.toList.sorted}")
    groups.map(_.map(times)).sliding(2).foreach {
      case Seq(before, after) => assert(before.max < after.min, s"the groups do not straddle their gap: $before then $after")
      case _                  => ()
    }
    times

  /** The exact messages `percent` of the topic's TIME RANGE must deliver, computed from the broker's
    * publish times: the cutoff is `first + floor(percent/100 * (last - first))` and everything
    * published at or after it is shown. */
  private def expectedFromPublishTimePercent(times: Map[String, Long], percent: Int): Seq[String] =
    val first = times.values.min
    val last = times.values.max
    val cutoffMs = first + math.floor(percent / 100.0 * (last - first)).toLong
    times.filter((_, publishedAt) => publishedAt >= cutoffMs).keys.toSeq.sorted

  test("CS-SF-16: publish-time position lands proportionally through ELAPSED TIME") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    // Three groups six seconds apart, so the range is ~12s and both fractions below fall in the
    // middle of a gap - three seconds from the nearest message on either side.
    val early = Seq("t-01", "t-02")
    val middle = Seq("t-03", "t-04")
    val late = Seq("t-05", "t-06")
    val times = produceSpacedGroups(fqn, Seq(early, middle, late), gapMs = 6000)

    // 25% of a 12s range is ~3s in: past the early group, well short of the middle one.
    val quarter = expectedFromPublishTimePercent(times, 25)
    assert(quarter.toSet == (middle ++ late).toSet, s"25% of the time range resolved to $quarter")

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("25")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, quarter)

    // 75% is ~9s in: past the middle group, short of the late one. A mode that ignored the fraction
    // and always seeked to one end would satisfy one of these two assertions but never both.
    val threeQuarters = expectedFromPublishTimePercent(times, 75)
    assert(threeQuarters.toSet == late.toSet, s"75% of the time range resolved to $threeQuarters")

    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("75")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, threeQuarters)
  }

  test("CS-SF-17: at the same 50%, publish-time and entry positions land in different places") {
    // THE motivating case, and the whole reason one mode became two. Two messages long ago and then
    // a burst of ten: half the TIME is back in the empty stretch, while half the ENTRIES is inside
    // the burst. One control could not have meant both.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val old = Seq("old-1", "old-2")
    val burst = (1 to 10).map(i => f"b-$i%02d")
    val times = produceSpacedGroups(fqn, Seq(old, burst), gapMs = 10000)

    // Half of a ~10s range is ~5s in - five seconds after the old pair and five before the burst.
    val byPublishTime = expectedFromPublishTimePercent(times, 50)
    assert(byPublishTime.toSet == burst.toSet, s"50% of the publish-time range resolved to $byPublishTime")

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("50")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, byPublishTime)

    // The same 50%, counted over the 12 entries instead: six are left behind, so it starts on the
    // seventh message overall - the fifth of the burst.
    val byEntry = expectedFromEntryPercent(fqn, 50, messagesPerEntry = 1, messages = old ++ burst)
    assert(byEntry.toSet == burst.drop(4).toSet, s"50% of the entries resolved to $byEntry")
    assert(
      byEntry.size < byPublishTime.size,
      s"the two modes must not coincide here: entries=$byEntry publishTime=$byPublishTime"
    )

    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("50")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, byEntry)
  }

  test("CS-SF-18: publish-time endpoints - 0% is everything, 100% includes every final timestamp tie") {
    // Deliberately unlike entry position, whose 100% means "past the end" and shows nothing: the
    // time range ends AT the latest publish timestamp. A timestamp seek cannot split messages that
    // share that timestamp, so the final entry is deliberately a multi-message batch and every
    // member must be shown.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val bulk = (1 to 6).map(i => f"e-$i%02d")
    val finalBatch = Seq("e-last-1", "e-last-2", "e-last-3")
    fixtures.produceBatches(fqn, Seq(bulk))
    awaitClockGap(System.currentTimeMillis(), 2000)
    fixtures.produceBatches(fqn, Seq(finalBatch))
    val retained = fixtures.readAllMessages(fqn)
    val times = retained.map(m => m.getValue -> m.getPublishTime).toMap
    val finalTimes = finalBatch.map(times)
    assert(finalTimes.distinct.size == 1, s"the final batch does not share one publish timestamp: $finalTimes")
    assert(
      bulk.map(times).max < finalTimes.head,
      s"the final batch is not strictly newer than the bulk: bulk=${bulk.map(times)}, final=$finalTimes"
    )

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("0")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, bulk ++ finalBatch)

    val atTheEnd = expectedFromPublishTimePercent(times, 100)
    assert(atTheEnd.toSet == finalBatch.toSet, s"100% of the publish-time range resolved to $atTheEnd")

    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("100")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, finalBatch)
  }

  test("CS-SF-19: publish-time position rejects a percentage outside 0-100 without changing the session") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val early = Seq("t-01", "t-02")
    val late = Seq("t-03", "t-04")
    val times = produceSpacedGroups(fqn, Seq(early, late), gapMs = 6000)

    val cs = openOn(fqn, t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("150") // the model stores a fraction in [0, 1]; 150% has no meaning
    // The publish-time mode's own error, not entry position's: both render the same control, so this is
    // also the check that they are separately addressable in the real DOM.
    assertThat(cs.startFromPublishTimeFractionError).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10000))
    assertThat(cs.startFromEntryFraction).hasCount(0)

    // Play with the rejected text STILL ON SCREEN - the same claim CS-SF-14 makes for the data
    // mode, and for the same reason: correcting the field first proves validation recovery, not
    // that an invalid value cannot reach the session.
    assert(cs.playButton.isEnabled, "Play is disabled while the fraction is invalid - see the note in CS-SF-14")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, expectedFromPublishTimePercent(times, 50))

    // ... and the control is not inert: a valid change does move the session.
    val atTheEnd = expectedFromPublishTimePercent(times, 100)
    assert(
      atTheEnd.toSet != expectedFromPublishTimePercent(times, 50).toSet,
      s"100% and 50% resolve to the same set here, so the second leg proves nothing: $atTheEnd"
    )
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("100")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, atTheEnd)
  }

  test("CS-SF-22: publish-time position resolves ONE cutoff across separate logical topics") {
    val (tA, nsA, topicA) = fixtures.freshTopicParts()
    val fqnA = s"persistent://$tA/$nsA/$topicA"
    val (tB, nsB, topicB) = fixtures.freshTopicParts()
    val fqnB = s"persistent://$tB/$nsB/$topicB"

    // Re-aimed 2026-08-09. This cell asserted the PRE-P2.15 contract (a range per logical topic)
    // and had been failing since the session-wide cutoff landed - the implementation, its server
    // pins ("P2.15: SEPARATE topics share ONE cutoff") and docs/consume/modes-comparison.md all
    // specify one instant for the whole selection. The old per-topic answer is kept below as the
    // counterexample this cell now exists to EXCLUDE, so a regression back to it fails here.
    //
    // Give A a short early range and B a short late range, with a larger empty gap between them.
    // At 50%, one range per topic would keep each topic's newer message. The session-wide range
    // instead lands in the inter-topic gap: it keeps both B messages and drops all of A.
    fixtures.produceUnbatched(fqnA, Seq("a-old"))
    awaitClockGap(System.currentTimeMillis(), 1000)
    fixtures.produceUnbatched(fqnA, Seq("a-new"))
    awaitClockGap(System.currentTimeMillis(), 3000)
    fixtures.produceUnbatched(fqnB, Seq("b-old"))
    awaitClockGap(System.currentTimeMillis(), 1000)
    fixtures.produceUnbatched(fqnB, Seq("b-new"))

    def publishTimes(fqn: String): Map[String, Long] =
      fixtures.readAllMessages(fqn).map(message => message.getValue -> message.getPublishTime).toMap

    val timesA = publishTimes(fqnA)
    val timesB = publishTimes(fqnB)
    // What the session must do: one range across every selected topic, one cutoff instant.
    val sessionWide = expectedFromPublishTimePercent(timesA ++ timesB, 50)
    assert(sessionWide.toSet == Set("b-old", "b-new"), s"the session-wide range resolved to $sessionWide")

    // What it must NOT do: interpolate inside each topic's own history.
    val perTopic = expectedFromPublishTimePercent(timesA, 50) ++ expectedFromPublishTimePercent(timesB, 50)
    assert(perTopic.toSet == Set("a-new", "b-new"), s"the per-topic counterexample resolved to $perTopic")
    assert(sessionWide.toSet != perTopic.toSet, s"session-wide and per-topic answers unexpectedly coincide: $sessionWide")

    val cs = openOn(fqnA, tA, nsA, topicA)
    cs.setTargetTopicsSpecific(Seq(fqnA, fqnB))
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("50")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, sessionWide)
  }
