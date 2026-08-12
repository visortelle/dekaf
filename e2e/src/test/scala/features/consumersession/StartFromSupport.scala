package features.consumersession

import harness.DekafSuite
import harness.Eventually.eventually
import org.apache.pulsar.common.policies.data.TopicStats

import scala.jdk.CollectionConverters.*

/** Shared arrangement + assertion helpers for the Start-From outcome specs
  * (`CsStartFromOutcomesSpec`, `CsStartFromMatrixSpec`).
  *
  * The one assertion that matters: every test states the EXACT set of message values the session
  * must end up showing. Counting rows cannot express "skip first 5" - a run that skipped 50 and one
  * that skipped 5 both reach *some* count, and a transient count is reached by almost anything.
  */
/** How a test's data is written to the broker. Both shapes are ordinary application behavior; only
  * the second one was ever exercised before, which is why entry-vs-message defects in Start-From
  * went unseen. */
enum Produce(val label: String):
  /** Several messages share ONE broker entry - the Java producer's default behavior. */
  case Batched extends Produce("batched")
  /** One message per broker entry. */
  case Unbatched extends Produce("unbatched")

trait StartFromSupport extends DekafSuite:

  /** Messages per entry for `Produce.Batched`. Chosen so the test payloads below land in a handful
    * of entries, i.e. entry positions and message positions are far apart and cannot coincide. */
  val MessagesPerBatch = 4

  def produceAs(mode: Produce, fqn: String, values: Seq[String]): Unit = mode match
    case Produce.Batched   => fixtures.produceBatched(fqn, values, MessagesPerBatch)
    case Produce.Unbatched => fixtures.produceUnbatched(fqn, values)

  /** Handshake rows: produced only to prove the live stream is flowing, and excluded from every
    * payload assertion by this prefix. */
  val HandshakePrefix = "handshake-"

  /** The session must show EXACTLY `expected`, no more and no less.
    *
    * Set-based because a partitioned topic merges several consumers and has no total order. Waiting
    * for the whole set (rather than a count) is what makes it non-transient: a missing message keeps
    * polling until the deadline, and an extra one can never satisfy the equality.
    *
    * Rows come from [[ConsumerSessionPage.allColumnValues]], which walks the WHOLE virtualized
    * list. The mounted-viewport read this used to be built on could only ever see the last
    * viewport-worth of rows of the auto-scrolled table, so any expectation taller than one
    * viewport failed on its OLDEST rows (CS-SF-7/9/13/14, all "missing m-01" the moment the
    * tools pane opened by default and shrank the viewport).
    *
    * What it still does NOT prove is that nothing arrives AFTER the first matching poll - the
    * shape a too-wide start-from produces. Prefer [[assertLoadedExactlyWithCounter]], which closes
    * that with the toolbar counter; this bare form is for the quadrants where the counter cannot
    * be predicted. */
  def assertLoadedExactly(cs: ConsumerSessionPage, expected: Seq[String]): Unit =
    val rendered = eventually(timeoutMs = 45000, intervalMs = 400) {
      val all = cs.allColumnValues("value")
      val payload = all.filterNot(_.startsWith(HandshakePrefix))
      assert(
        payload.toSet == expected.toSet,
        s"the session shows ${payload.size} message(s): $payload\n  expected exactly ${expected.size}: $expected" +
          s"\n  missing: ${expected.toSet.diff(payload.toSet)}\n  unexpected: ${payload.toSet.diff(expected.toSet)}"
      )
      payload
    }
    assert(rendered.size == expected.size, s"a message is rendered more than once: $rendered")

  /** Same, plus the toolbar's loaded counter - two things the rendered rows alone cannot say.
    *
    * The message table is VIRTUALIZED, so a set built from DOM rows cannot rule out messages loaded
    * OFF-SCREEN; and the set assertion above is satisfied by the first poll that sees the right
    * rows, so a message arriving AFTER that - the shape a too-wide start-from produces - would slip
    * past it. The counter answers the first, and requiring the counter to STAY put answers the
    * second.
    *
    * `base` is what the counter already stood at before `expected` was produced. It is 0 whenever no
    * handshake rows are in play; a quadrant that needs them takes its baseline from
    * [[settledLoaded]], because how many handshakes survived is not knowable up front (the early
    * ones are dropped by design) yet all of them count towards `cs-loaded`. */
  def assertLoadedExactlyWithCounter(cs: ConsumerSessionPage, expected: Seq[String], base: Int = 0): Unit =
    assertLoadedExactly(cs, expected)
    val total = base + expected.size
    cs.awaitLoaded(total)
    val settled = settledLoaded(cs)
    assert(
      settled == total,
      s"the session loaded $settled message(s) once the counter stopped moving, expected $total " +
        s"(${expected.size} expected + $base already loaded before them). Rendered: ${cs.allColumnValues("value")}"
    )

  /** The loaded counter once it has STOPPED MOVING, i.e. two reads `quietMs` apart that agree.
    *
    * The window is quiescence, never readiness - nothing here is waiting for the app to catch up
    * with a request, it is waiting for the app to prove it has nothing more to deliver. That is the
    * only observable form "and no further message arrives" can take: a counter that has reached the
    * right value tells you nothing about the message still in flight behind it.
    *
    * LIMIT, stated so it is not mistaken for airtight: the quiet window is finite (~1.2s), so an
    * over-delivery arriving LATER than it - most plausibly a message the session left un-acked being
    * redelivered on the broker's ack timeout, tens of seconds out - would land after this returns and
    * still pass a "shows EXACTLY n" spec. The window is deliberately NOT widened to cover that: it is
    * on the hot path of every counting cell, and a redelivery interval is far too long to wait per
    * test. What actually forbids the over-delivery is pinned at the SERVER tier, where it is cheap and
    * deterministic - the session acks every delivered message exactly once and a failing progress push
    * cannot cost a skipped message its ack (`sessionOutputSerializationTest`, suite "a failing progress
    * push must not cost a skipped message"), and the start-from discard is applied exactly once and is
    * re-armed by neither a redelivery nor a resume (`startFromDiscardOnceTest`). This helper is the
    * UI-level cross-check on top of that, not the primary guard against duplication. */
  def settledLoaded(cs: ConsumerSessionPage, quietMs: Int = 1200): Int =
    eventually(timeoutMs = 30000, intervalMs = 200) {
      val before = cs.loadedCount
      page.waitForTimeout(quietMs)
      val after = cs.loadedCount
      assert(before == after, s"the loaded counter is still moving: $before then $after")
      after
    }

  /** Available-permit counts per consumer, keyed by the non-partitioned topic each is attached to.
    * `availablePermits > 0` is the signal that the client has actually issued flow permits. */
  private def sessionConsumerPermits(fqn: String, kind: fixtures.TopicKind): Map[String, List[Int]] =
    def permitsOf(st: TopicStats): List[Int] =
      st.getSubscriptions.values().asScala.toList
        .flatMap(sub => sub.getConsumers.asScala.toList.map(_.getAvailablePermits))
    if kind.isPartitioned then
      admin.topics().getPartitionedStats(fqn, true).getPartitions.asScala.toMap.map { case (p, st) => p -> permitsOf(st) }
    else Map(fqn -> permitsOf(admin.topics().getStats(fqn)))

  /** Wait until the session is consuming EVERY part of the topic - one attachment for a
    * non-partitioned topic, one per partition otherwise. */
  def awaitConsumersFlowing(fqn: String, kind: fixtures.TopicKind): Unit =
    val expected = math.max(kind.partitions, 1)
    eventually(timeoutMs = 30000, intervalMs = 400) {
      val permits =
        try sessionConsumerPermits(fqn, kind)
        catch case _: Throwable => Map.empty[String, List[Int]] // topic not materialized yet
      assert(
        permits.size == expected && permits.values.forall(_.exists(_ > 0)),
        s"the session is not consuming every part of $fqn: expected $expected attachment(s) with permits > 0, got $permits"
      )
    }

  /** Produce handshake messages until the session RENDERS one, i.e. until the whole path
    * (broker -> consumer -> listener -> gRPC stream -> table) is provably live.
    *
    * Needed on NON-PERSISTENT topics: nothing is retained there, so anything published before the
    * session's message handler is installed is acked, discarded and unrecoverable. A rendered row is
    * the only observable proof that window has closed. The retries are why the prefix is filtered
    * out of payload assertions. */
  def awaitSessionStreaming(cs: ConsumerSessionPage, fqn: String): Unit =
    var attempt = 0
    eventually(timeoutMs = 60000, intervalMs = 1200) {
      attempt += 1
      fixtures.produceUnbatched(fqn, Seq(s"$HandshakePrefix$attempt"))
      val rendered = cs.columnValues("value")
      assert(rendered.exists(_.startsWith(HandshakePrefix)), s"the session has not rendered a handshake message yet: $rendered")
    }

  /** Block until `gapMs` has elapsed since `sinceMs`.
    *
    * This is ARRANGEMENT, not a readiness wait: the time-addressed Start-From modes can only be
    * asserted if the test data straddles a known instant, and the only way to put messages on
    * either side of one is to publish them at different times. Expressed as a polled predicate so
    * it cannot silently become "sleep and hope the app caught up". */
  def awaitClockGap(sinceMs: Long, gapMs: Long): Unit =
    eventually(timeoutMs = gapMs + 30000, intervalMs = 200) {
      val elapsed = System.currentTimeMillis() - sinceMs
      assert(elapsed >= gapMs, s"only ${elapsed}ms of the required ${gapMs}ms gap has elapsed")
    }
