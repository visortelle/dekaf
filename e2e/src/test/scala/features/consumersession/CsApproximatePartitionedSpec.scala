package features.consumersession

import org.apache.pulsar.client.api.Message as PulsarMessage

/** The two APPROXIMATE Start-From modes on a PARTITIONED topic - the shape in which their
  * definitions actually differ from one another.
  *
  * `CsStartFromOutcomesSpec` covers both modes on a persistent NON-partitioned topic, where each
  * mode sees exactly one physical log; on that shape "resolve every log independently" and "pool one
  * answer across the logs" are the same sentence, so neither rule is under test. The production
  * wiring (`handleStartFrom`, the two `Approximate*` branches) differs precisely here:
  *
  *   - **Approximate position (% of data)** resolves EVERY PHYSICAL TOPIC INDEPENDENTLY: each partition leaves
  *     `floor(fraction x its own entry count)` entries behind, so a partition holding two entries
  *     and one holding eight start at different depths.
  *   - **Approximate position (% of time)** groups the physical topics by their LOGICAL topic, pools
  *     `min(first publish time)` .. `max(last publish time)` across the group, and seeks EVERY
  *     partition to that ONE instant - so a partition that went idle early cannot drag the cutoff
  *     backwards, and a partition that only started late is not given a range of its own.
  *
  * ONE arrangement drives both, and it is deliberately skewed on BOTH axes at once - the partitions
  * hold 8 / 4 / 2 / 0 messages and cover three different stretches of the range:
  *
  * {{{
  *      t = 0s        t = 4s        t = 8s        t = 12s
  * p0                 a-01..a-04    a-05..a-08                  8 messages, the middle of the range
  * p1   b-01..b-04                                              4 messages, then idle for 12s
  * p2                               c-01          c-02          2 messages, only the late half
  * p3                                                           EMPTY - materialized, never written
  * }}}
  *
  * p3 IS THE ONE PARTITION THAT HOLDS NOTHING, and it is here rather than in a unit test because the
  * "empty" answer is a fact about the BROKER, not about the arithmetic. `PulsarAdmin.examineMessage`
  * does not report an empty topic as an empty range - it FAILS (pinned at the broker level by
  * `harness.BatchingFixtureSpec` BATCH-4), so an empty partition reaches the server as an error that
  * it has to tell apart from an operational one. Both modes then have to SKIP it: counting it as
  * time zero would drag the pooled range's start back to 1970 and put every interior fraction before
  * the real data, i.e. turn 50% into Earliest. The pure arithmetic for that rule lives in
  * `server/.../consumer/session_runner/approximatePublishTimePositionTest`; what only a real broker can
  * show is that the failure is classified as "this partition holds nothing" and not as "the lookup
  * broke", and that the session still starts.
  *
  * An empty partition is arrangeable here for the same reason the skew is: the schedule addresses
  * the PHYSICAL partitions directly and simply never names p3. (This spec's doc used to say the
  * opposite - that it could not be arranged through the parent's router - which was true of the
  * router and irrelevant, since nothing here goes through it.)
  *
  * The pooled endpoints are each owned by exactly ONE partition, which is what makes the pooling
  * rule falsifiable rather than merely satisfied: `min(first)` is p1's t=0 and `max(last)` is p2's
  * t=12, so taking the max of the firsts, or the min of the lasts, or skipping an idle partition,
  * every one of them moves the cutoff somewhere else. At 50% it lands at t=6s, in the middle of the
  * only four-second gap in the arrangement, two seconds clear of the nearest message on either side.
  *
  * The two modes therefore answer differently, and each differs from the mistake it is exposed to.
  * Both facts are asserted BEFORE the UI is driven, so a run can never pass by the answers having
  * quietly converged:
  *
  *   - data 50% -> per partition: 4 of 8, 2 of 4 and 1 of 2 entries left behind, which keeps p1's
  *     later half. A single cut through the POOLED stream would have kept a-04 and c-01 instead.
  *   - time 50% -> one cutoff at t=6s for EVERY partition: none of p1 (idle since t=0, six seconds
  *     before the cutoff) and BOTH of p2 (on its own 8s..12s range, 50% would be t=10s and would
  *     drop c-01). p3 contributes no endpoint at all; counted as time zero it would drag the pooled
  *     start to 1970 and hand back the whole topic.
  *
  * Every expectation is derived from the broker - real entry counts and real publish times - rather
  * than written down, for the same reason `CsStartFromOutcomesSpec` does it: a hard-coded set would
  * encode one particular arrangement as "the" answer instead of the rule.
  */
class CsApproximatePartitionedSpec extends StartFromSupport:

  /** FOUR partitions, spelled out rather than taken from `TopicKind.PersistentPartitioned` (three),
    * because the fourth is the empty one and is part of the arrangement. */
  private val kind = fixtures.TopicKind(persistent = true, partitions = 4)

  /** The partition deliberately left holding nothing. */
  private val EmptyPartition = 3

  /** Real wall clock between the arrangement's groups. Both modes are asserted at 50%, whose cutoff
    * lands in the middle of the second gap, so this is also the safety margin: 4s puts the nearest
    * message two seconds away and no produce round trip can move one across it. */
  private val GroupGapMs = 4000L

  /** What each partition is given, group by group: the index is which 4s slot it is published in,
    * the map is partition -> values. */
  private val schedule: Seq[Map[Int, Seq[String]]] = Seq(
    Map(1 -> Seq("b-01", "b-02", "b-03", "b-04")),
    Map(0 -> Seq("a-01", "a-02", "a-03", "a-04")),
    Map(0 -> Seq("a-05", "a-06", "a-07", "a-08"), 2 -> Seq("c-01")),
    Map(2 -> Seq("c-02"))
  )

  /** Publish the schedule straight to the partitions, unbatched (one message per broker ENTRY, so
    * entry-position arithmetic and a message count coincide and the expectation stays
    * readable), with a real gap between groups.
    *
    * Addressing the partitions directly is the only way to control the skew: the parent topic's
    * router decides where a message lands, and neither "p1 gets four messages and then goes idle"
    * nor "p2 only exists in the late half" can be arranged through it. The gaps are ARRANGEMENT, not
    * readiness waits - the only way to give a topic a time range is to publish across one. */
  private def arrange(fqn: String): Unit =
    var groupStartedAt = System.currentTimeMillis()
    schedule.zipWithIndex.foreach { (group, index) =>
      if index > 0 then
        awaitClockGap(groupStartedAt, GroupGapMs)
        groupStartedAt = System.currentTimeMillis()
      group.toSeq.sortBy(_._1).foreach((partition, values) => fixtures.produceUnbatched(s"$fqn-partition-$partition", values))
    }

  /** Assert the arrangement landed as the class doc describes it, and hand back what each partition
    * really holds, oldest first - the oracle both expectations are derived from. A drifted
    * arrangement must fail HERE, naming the arrangement, rather than surfacing later as an
    * unexplained set mismatch. */
  private def arrangedContents(fqn: String): Vector[Vector[PulsarMessage[String]]] =
    // Reading every partition also MATERIALIZES the empty one: `createPartitionedTopic` writes
    // metadata, and a partition nothing ever touched may not exist as a topic at all. The reader
    // creates it, so the session meets the case this spec is about - a partition the broker knows
    // and reports as holding nothing - rather than a missing topic, which is a different failure.
    val perPartition = (0 until kind.partitions).toVector.map(p => fixtures.readAllMessages(s"$fqn-partition-$p"))
    val arranged = schedule.flatMap(_.toSeq).groupBy(_._1).view.mapValues(_.flatMap(_._2)).toMap
    (0 until kind.partitions).foreach { p =>
      val expected = arranged.getOrElse(p, Seq.empty)
      assert(perPartition(p).map(_.getValue) == expected, s"partition $p holds ${perPartition(p).map(_.getValue)}, arranged $expected")
      assert(
        perPartition(p).map(_.getPublishTime) == perPartition(p).map(_.getPublishTime).sorted,
        s"partition $p is not in publish-time order: ${perPartition(p).map(m => m.getValue -> m.getPublishTime)}"
      )
    }
    // EXACTLY ONE empty partition, and it is the one the arrangement names. Asserted through the
    // broker's own entry count as well: "materialized and holding nothing" is the arranged state,
    // and a partition that does not exist would fail here, naming itself.
    val empties = perPartition.zipWithIndex.filter(_._1.isEmpty).map(_._2)
    assert(empties == Vector(EmptyPartition), s"expected partition $EmptyPartition and only it to be empty, empty were: $empties")
    val emptyEntries = fixtures.numberOfEntries(s"$fqn-partition-$EmptyPartition")
    assert(emptyEntries == 0L, s"partition $EmptyPartition was supposed to hold nothing, the broker reports $emptyEntries entries")

    // The two skews the whole spec rests on, over the partitions that hold something: they must hold
    // DIFFERENT numbers of messages, and must cover DIFFERENT stretches of the time range.
    val nonEmpty = perPartition.filter(_.nonEmpty)
    assert(nonEmpty.map(_.size).distinct.size == nonEmpty.size, s"the counts are not skewed: ${perPartition.map(_.size)}")
    val spans = nonEmpty.map(msgs => msgs.head.getPublishTime -> msgs.last.getPublishTime)
    assert(spans.distinct.size == nonEmpty.size, s"the time spans are not skewed: $spans")
    // ... and exactly one partition owns each pooled endpoint, or the pooling rule is not falsifiable.
    assert(spans.count(_._1 == spans.map(_._1).min) == 1, s"the pooled EARLIEST is not owned by one partition: $spans")
    assert(spans.count(_._2 == spans.map(_._2).max) == 1, s"the pooled LATEST is not owned by one partition: $spans")
    perPartition

  /** Where entry position starts on ONE partition: leave `floor(fraction x entries)` entries behind. */
  private def entryAnswer(perPartition: Vector[Vector[PulsarMessage[String]]], entriesOf: Int => Long): Vector[String] =
    perPartition.zipWithIndex.flatMap { case (msgs, p) =>
      val entries = entriesOf(p)
      assert(entries == msgs.size, s"partition $p: $entries entries for ${msgs.size} unbatched messages")
      msgs.drop(math.floor(0.5 * entries).toInt).map(_.getValue)
    }

  // -------------------------------------------------------------------------------------------

  test("CS-SF-20: data position resolves EACH PARTITION on its own entry count") {
    val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
    arrange(fqn)
    val perPartition = arrangedContents(fqn)

    // The contract, applied per physical topic. The entry count comes from the broker even though
    // the fixture is unbatched - the mode is defined over ENTRIES, and reading it back is what keeps
    // that visible (and asserts the fixture really did write one message per entry).
    val expected = entryAnswer(perPartition, p => fixtures.numberOfEntries(s"$fqn-partition-$p"))
    assert(
      expected.toSet == Set("a-05", "a-06", "a-07", "a-08", "b-03", "b-04", "c-02"),
      s"the arrangement no longer produces the documented per-partition answer: $expected"
    )

    // The mistake this cell exists to catch: one cut through the pooled stream instead of one cut
    // per partition. Same number of messages, different messages - so only an exact SET separates
    // them, and they must genuinely differ or this test proves nothing.
    val pooled = perPartition.flatten.sortBy(_.getPublishTime).map(_.getValue).takeRight(expected.size)
    assert(pooled.toSet != expected.toSet, s"the pooled answer coincides with the per-partition one: $pooled")

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic, kind.scheme)
    cs.setStartFrom("Approximate position (% of data)")
    cs.setStartFromEntryPercent("50")
    cs.play()
    cs.assertState("running")
    // EVERY partition, the empty one included, is really part of this session. Without this the
    // empty partition would be decorative: a server that dropped it from the target list, or never
    // subscribed to it because it could not resolve a position for it, would deliver exactly the
    // same messages and pass.
    awaitConsumersFlowing(fqn, kind)
    assertLoadedExactlyWithCounter(cs, expected)
  }

  test("CS-SF-21: publish-time position pools ONE cutoff across a logical topic's partitions") {
    val (t, ns, topic, fqn) = fixtures.freshTopicPartsOfKind(kind)
    arrange(fqn)
    val perPartition = arrangedContents(fqn)

    // The contract: min over the partitions' FIRST publish times .. max over their LAST, one
    // interpolated instant, every partition seeked to it. Over the partitions that HOLD something -
    // an empty one has no first and no last, and is skipped rather than counted as time zero.
    val nonEmpty = perPartition.filter(_.nonEmpty)
    val earliest = nonEmpty.map(_.head.getPublishTime).min
    val latest = nonEmpty.map(_.last.getPublishTime).max
    val cutoff = earliest + math.floor(0.5 * (latest - earliest)).toLong
    val all = perPartition.flatten
    // The cutoff has to fall in a GAP, or a produce round trip decides the outcome instead of the rule.
    assert(
      all.forall(m => math.abs(m.getPublishTime - cutoff) > 1000),
      s"the cutoff $cutoff is within a second of a message: ${all.map(m => m.getValue -> m.getPublishTime)}"
    )
    val expected = all.filter(_.getPublishTime >= cutoff).map(_.getValue)
    assert(
      expected.toSet == Set("a-05", "a-06", "a-07", "a-08", "c-01", "c-02"),
      s"the arrangement no longer produces the documented pooled answer: $expected"
    )

    // The mistake this cell exists to catch: a range per PARTITION instead of one per logical topic.
    // p1 went idle at t=0 and the pooled cutoff leaves all of it behind; on a range of its own its
    // later half comes back. p2 started at t=8 and the pooled cutoff keeps both of its messages; on
    // a range of its own 50% is t=10 and c-01 is dropped.
    val perPartitionAnswer = nonEmpty.flatMap { msgs =>
      val first = msgs.head.getPublishTime
      val last = msgs.last.getPublishTime
      if last <= first then msgs.map(_.getValue) // a partition occupying one instant resolves to Earliest
      else msgs.filter(_.getPublishTime >= first + math.floor(0.5 * (last - first)).toLong).map(_.getValue)
    }
    assert(perPartitionAnswer.toSet != expected.toSet, s"a per-partition range gives the same answer here: $perPartitionAnswer")
    // And the sibling mode must not coincide either, or a session that ran the wrong one would pass.
    val byEntry = entryAnswer(perPartition, p => perPartition(p).size.toLong)
    assert(byEntry.toSet != expected.toSet, s"the entry mode gives the same answer here: $byEntry")
    // The mistake the EMPTY partition exposes: counting it as time zero rather than skipping it.
    // Its "first publish time" would be the epoch, so the pooled range would start in 1970 and 50%
    // of it lands decades before this topic existed - i.e. the whole topic comes back. Derived, not
    // asserted as a hunch: this is the position such an implementation would seek to.
    val emptyAsTimeZeroCutoff = math.floor(0.5 * latest).toLong
    val emptyAsTimeZeroAnswer = all.filter(_.getPublishTime >= emptyAsTimeZeroCutoff).map(_.getValue)
    assert(
      emptyAsTimeZeroAnswer.toSet != expected.toSet,
      s"counting the empty partition as time zero gives the same answer here, so this arrangement cannot catch it: $emptyAsTimeZeroAnswer"
    )

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic, kind.scheme)
    cs.setStartFrom("Approximate position (% of time)")
    cs.setStartFromPublishTimePercent("50")
    cs.play()
    cs.assertState("running")
    awaitConsumersFlowing(fqn, kind) // including the empty partition - see CS-SF-20
    assertLoadedExactlyWithCounter(cs, expected)
  }
