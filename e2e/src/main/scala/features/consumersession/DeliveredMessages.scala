package features.consumersession

/** The IDENTITY oracle for what a consumer session delivered.
  *
  * WHY THIS EXISTS. "Zero loss" used to be concluded from the final loaded COUNT: produce 55,000,
  * see 55,000, done. A count cannot distinguish correct from merely plausible - one message lost
  * anywhere plus one delivered twice anywhere reaches exactly the same number - and the count the
  * consumer-session toolbar shows is not even read from the delivered rows: it is the server's own
  * `numMessageSent`, so a send counted but never rendered, or a rendered row the server never
  * counted, are both invisible to it. `harness.DeliveredMessagesSpec` pins that difference by
  * running both oracles over the same wrong data.
  *
  * MULTISET, not order. Delivery order across a pause is deliberately NOT a promise: a message
  * refused at the closed gate is negative-acknowledged and comes back on the broker's redelivery
  * schedule, so it can legitimately arrive behind a newer one (see `ConsumerListener`'s
  * "OUTWARD-ONLY BOUNDS" note). Ordering is a separate contract with its own coverage in
  * `CsMergeOrderSpec`, which reads arrival ordinals rather than a set. So the comparison here
  * counts occurrences: a duplicate is as much a failure as a loss, and neither can hide behind the
  * other.
  *
  * BOUNDED DIAGNOSTICS. These sets run to tens of thousands, so a bare `==` failure would print
  * two unreadable walls. The report says how many are missing, how many are unexpected, how many of
  * the unexpected are DUPLICATES of expected values, and shows a sample of each.
  */
object DeliveredMessages:

  /** How many samples of each kind a failure report shows. */
  private val SampleSize = 10

  private def occurrences(values: Seq[String]): Map[String, Int] =
    values.groupMapReduce(identity)(_ => 1)(_ + _)

  /** `None` when `delivered` and `expected` are the same MULTISET, otherwise the diagnosis. */
  def difference(delivered: Seq[String], expected: Seq[String]): Option[String] =
    val deliveredCounts = occurrences(delivered)
    val expectedCounts = occurrences(expected)

    // (value, how many copies are owed / how many are surplus)
    def shortfall(want: Map[String, Int], have: Map[String, Int]): List[(String, Int)] =
      want.iterator
        .map((value, wanted) => value -> (wanted - have.getOrElse(value, 0)))
        .filter(_._2 > 0)
        .toList
        .sortBy(_._1)

    val missing = shortfall(expectedCounts, deliveredCounts)
    val unexpected = shortfall(deliveredCounts, expectedCounts)

    if missing.isEmpty && unexpected.isEmpty then None
    else
      // A surplus copy of a value that WAS expected is a duplicate delivery; a surplus copy of a
      // value that was not expected is the wrong message entirely. Naming which one it is turns a
      // failure into a diagnosis - they have completely different causes.
      val (duplicates, foreign) = unexpected.partition((value, _) => expectedCounts.contains(value))
      def sample(what: String, entries: List[(String, Int)]): String =
        if entries.isEmpty then ""
        else
          val shown = entries.take(SampleSize).map((value, n) => if n == 1 then value else s"$value x$n")
          val more = if entries.size > SampleSize then s", ... (${entries.size - SampleSize} more)" else ""
          s"\n  $what: ${entries.map(_._2).sum} message(s) over ${entries.size} value(s): ${shown.mkString(", ")}$more"
      Some(
        s"delivered ${delivered.size} message(s), expected ${expected.size}" +
          sample("MISSING (never delivered)", missing) +
          sample("DUPLICATED (delivered more than once)", duplicates) +
          sample("FOREIGN (not in the expected set at all)", foreign)
      )

  /** Fail unless `delivered` is EXACTLY `expected`, counting duplicates. `what` names the set so a
    * spec asserting several of them says which one broke. */
  def assertExactly(delivered: Seq[String], expected: Seq[String], what: String): Unit =
    difference(delivered, expected).foreach(problem => throw new AssertionError(s"$what: $problem"))
