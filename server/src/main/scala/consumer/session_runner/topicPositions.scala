package consumer.session_runner

import com.google.protobuf.ByteString
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.MessageId as PulsarMessageId
import org.apache.pulsar.client.impl.MessageIdImpl

/** The per-topic debug view behind the session's "Topic Positions" tab: where each physical topic
  * begins and ends, and how far the session has read through it.
  *
  * EVERYTHING HERE IS PURE. The three broker lookups a row needs (first entry, last entry, internal
  * stats) sit behind plain arguments, so every arrangement worth reasoning about - an empty topic, a
  * topic occupying one instant, a cursor whose ledger has aged out, a clock that ran backwards - is
  * a table test rather than a fixture. The impure part is one adapter in ConsumerServiceImpl.
  *
  * WHY A HIGH-WATER MARK AND NOT "THE LAST MESSAGE ON SCREEN". The cursor is recorded where messages
  * are ACKNOWLEDGED, so it counts what the session read, not what survived its filters. A filter
  * that drops 99% of a topic would otherwise make both progress figures read almost zero while the
  * session was in fact nearly finished.
  */

/** How far this session has read into one physical topic. */
final case class TopicCursor(messageId: PulsarMessageId, publishTime: Long)

/** The oldest and newest log positions this session has processed from one physical topic.
  *
  * Both endpoints move only OUTWARD in Pulsar message-id order. That makes an older redelivery
  * harmless and keeps the range stable even when producer publish clocks move backwards. When two
  * observations have the same id (notably non-persistent topics, whose ids may all be `0:0`), the
  * first observation is retained and the newest observation refreshes `last`.
  */
final case class TopicConsumedBounds(first: TopicCursor, last: TopicCursor)

/** Widen consumed bounds with one newly processed message. */
def widenConsumedBounds(existing: TopicConsumedBounds, incoming: TopicCursor): TopicConsumedBounds =
    val firstComparison = incoming.messageId.compareTo(existing.first.messageId)
    val lastComparison = incoming.messageId.compareTo(existing.last.messageId)
    val first =
        if firstComparison < 0 then incoming
        else existing.first
    val last =
        if lastComparison > 0 || (lastComparison == 0 && incoming.publishTime != existing.last.publishTime) then incoming
        else existing.last
    // A redelivery inside the already-known range is the common no-op case. Reuse the immutable
    // value instead of allocating another one on the hot listener path.
    if (first eq existing.first) && (last eq existing.last) then existing
    else TopicConsumedBounds(first, last)

/** One ledger of a topic's managed ledger, reduced to what an ordinal needs. */
final case class LedgerSpan(ledgerId: Long, entries: Long)

/** An endpoint of a retained log - its first or last message. */
final case class LogEndpoint(messageId: PulsarMessageId, publishTime: Long)

/** Everything one row of the table is computed from.
  *
  * `first`/`last` are absent for an EMPTY topic, which is not a failure: `examineMessage` answers
  * "latest" by throwing there and "earliest" with a 412, and both are classified as "the log is
  * empty" rather than as broker trouble (see [[isEmptyLogAnswer]]). `unavailableReason` is for a
  * topic that could not be asked at all - a non-persistent one, which Pulsar refuses to examine with
  * a 405 - and is the difference between "nothing to report" and "nothing is known".
  */
final case class TopicPositionInputs(
    topicFqn: String,
    first: Option[LogEndpoint],
    last: Option[LogEndpoint],
    firstConsumed: Option[TopicCursor],
    cursor: Option[TopicCursor],
    ledgers: Vector[LedgerSpan],
    currentLedgerEntries: Long,
    retainedEntries: Long,
    unavailableReason: Option[String]
)

/** One assembled row. Every figure is optional because every one of them can be genuinely unknown,
  * and a blank cell is honest where a zero would be a lie.
  */
final case class TopicPositionRow(
    topicFqn: String,
    first: Option[LogEndpoint],
    last: Option[LogEndpoint],
    firstConsumed: Option[TopicCursor],
    cursor: Option[TopicCursor],
    cursorTimeFraction: Option[Double],
    cursorEntryFraction: Option[Double],
    cursorEntryOrdinal: Option[Long],
    retainedEntries: Option[Long],
    unavailableReason: Option[String]
)

/** The ledger list with Pulsar's open-ledger hole filled in.
  *
  * THE HOLE: `getInternalStats` reports the CURRENT (still open) ledger with `entries: 0` and
  * `size: 0` - the real count lives in `currentLedgerEntries` alongside the list, not in the entry
  * itself. Measured on a 6060-entry single-ledger topic: `ledgers: [{ledgerId: 7057, entries: 0}]`
  * with `currentLedgerEntries: 6060`. Walking the list as reported therefore puts EVERY cursor in
  * the open ledger at ordinal 1, i.e. "0% through", for the whole life of that ledger - which on a
  * topic that has never rolled is the whole topic.
  *
  * The correction is positional, not value-based: the open ledger is the LAST one, so only the last
  * element is patched, and only when it reports nothing. A closed ledger that genuinely holds zero
  * entries in the middle of the list is left alone.
  */
def retainedLedgerSpans(ledgers: Vector[LedgerSpan], currentLedgerEntries: Long): Vector[LedgerSpan] =
    if ledgers.isEmpty then ledgers
    else
        val last = ledgers.last
        if last.entries > 0 || currentLedgerEntries <= 0 then ledgers
        else ledgers.init :+ last.copy(entries = currentLedgerEntries)

/** The cursor's 1-BASED ordinal among the entries the topic still retains.
  *
  * `None` when the cursor's ledger is not in the retained list at all, which is what a cursor that
  * has aged out from under retention looks like: the session read entries that have since been
  * trimmed. Reporting 0, or clamping it to the first retained entry, would both claim the session is
  * at the beginning when it is in fact past the beginning - so it reports nothing.
  *
  * ENTRIES, NOT MESSAGES. A batched entry counts once here however many messages it carries; see
  * [[cursorEntryFractionOf]] for why the distinction is named rather than hidden.
  */
def entryOrdinalOf(ledgers: Vector[LedgerSpan], cursorLedgerId: Long, cursorEntryId: Long): Option[Long] =
    val index = ledgers.indexWhere(_.ledgerId == cursorLedgerId)
    if index < 0 then None
    else
        val before = ledgers.take(index).map(_.entries).sum
        // `cursorEntryId` is 0-based within its ledger, so +1 makes the whole thing 1-based: the
        // very first retained entry is ordinal 1, matching how `examineMessage` addresses entries.
        Some(before + cursorEntryId + 1)

/** Where the cursor sits in the topic's TIME range, in [0.0, 1.0].
  *
  * `None` unless there is a cursor AND both endpoints AND a range with an interior:
  *
  *   - FIRST == LAST - everything the topic holds was published inside one millisecond - has no
  *     interior to place anything in, and the same rule ApproximatePublishTimePosition follows applies
  *     here: no position separates the messages, so no fraction describes one. Reporting 0.0 or 1.0
  *     would both be inventions.
  *   - A RANGE REPORTED BACKWARDS (first > last) is not a range. Publish time is stamped by the
  *     PRODUCER, so a clock that stepped back can produce one; a negative denominator would hand
  *     back a nonsense fraction that looks like a real measurement.
  *
  * CLAMPED into [0.0, 1.0] because the three lookups are not atomic: the last entry is read before
  * the cursor is, so a message published in between puts the cursor past the recorded end. That is a
  * stale denominator, not a cursor that overran the topic, and 1.0 is the honest rendering of it.
  */
def cursorTimeFractionOf(first: Option[LogEndpoint], last: Option[LogEndpoint], cursor: Option[TopicCursor]): Option[Double] =
    for
        f <- first
        l <- last
        c <- cursor
        if l.publishTime > f.publishTime
    yield ((c.publishTime - f.publishTime).toDouble / (l.publishTime - f.publishTime).toDouble).max(0.0).min(1.0)

/** Where the cursor sits among the topic's STORED ENTRIES, in [0.0, 1.0].
  *
  * ENTRIES, NOT MESSAGES, and the name says so. Pulsar addresses stored data by entry, and a batched
  * entry holds many messages, so this tracks a message-count percentage only as closely as batch
  * sizes stayed uniform across the topic's life - exactly the approximation ApproximateEntryPosition
  * documents for the same reason. Calling it "% of messages" would be a number the broker cannot
  * actually produce without a message-ordinal index, which needs an operator opt-in that is off by
  * default in every Pulsar version.
  *
  * `None` on a topic retaining nothing: there is no denominator, and 0/0 is not 0%.
  */
def cursorEntryFractionOf(cursorEntryOrdinal: Option[Long], retainedEntries: Long): Option[Double] =
    if retainedEntries <= 0 then None
    else cursorEntryOrdinal.map(ordinal => (ordinal.toDouble / retainedEntries.toDouble).max(0.0).min(1.0))

/** The ledger and entry of a message id, with any BATCH INDEX stripped.
  *
  * A batched message's id carries a third coordinate, and the ordinal walk is entry-addressed - two
  * messages of one batch share an entry and must land on one ordinal, not two.
  */
def ledgerAndEntryOf(messageId: PulsarMessageId): Option[(Long, Long)] = entryIdOf(messageId) match
    case id: MessageIdImpl => Some((id.getLedgerId, id.getEntryId))
    case _                 => None

/** Assemble one row from what the broker said and what the session has read. */
def buildTopicPositionRow(inputs: TopicPositionInputs): TopicPositionRow =
    val spans = retainedLedgerSpans(inputs.ledgers, inputs.currentLedgerEntries)
    val ordinal = for
        c <- inputs.cursor
        (ledgerId, entryId) <- ledgerAndEntryOf(c.messageId)
        o <- entryOrdinalOf(spans, ledgerId, entryId)
    yield o

    TopicPositionRow(
        topicFqn = inputs.topicFqn,
        first = inputs.first,
        last = inputs.last,
        firstConsumed = inputs.firstConsumed,
        cursor = inputs.cursor,
        cursorTimeFraction = cursorTimeFractionOf(inputs.first, inputs.last, inputs.cursor),
        cursorEntryFraction = cursorEntryFractionOf(ordinal, inputs.retainedEntries),
        cursorEntryOrdinal = ordinal,
        // A topic that could not be asked reports no denominator either - `retainedEntries` is 0
        // there only because nothing filled it in, and a "0 entries" cell would read as an empty
        // topic rather than an unavailable one.
        retainedEntries = Option.when(inputs.unavailableReason.isEmpty && inputs.retainedEntries >= 0)(inputs.retainedEntries),
        unavailableReason = inputs.unavailableReason
    )

/** Collapse the per-listener consumed ranges of one session into one range per physical topic.
  *
  * Overlapping enabled targets may each consume the same topic. The table has one row for that
  * topic, so its range is the union: the earliest first and furthest last message-id endpoints.
  */
def mergeConsumedBounds(perListener: Iterable[Map[String, TopicConsumedBounds]]): Map[String, TopicConsumedBounds] =
    perListener.flatten.foldLeft(Map.empty[String, TopicConsumedBounds]) { case (acc, (topicFqn, bounds)) =>
        val merged = acc.get(topicFqn) match
            case None => bounds
            case Some(existing) =>
                val firstComparison = bounds.first.messageId.compareTo(existing.first.messageId)
                val lastComparison = bounds.last.messageId.compareTo(existing.last.messageId)
                // Equal-id tie breakers make aggregation deterministic and useful for
                // non-persistent topics, whose messages may all carry the same id. They never
                // reorder distinct persistent log positions by an untrusted producer clock.
                val first =
                    if firstComparison < 0 || (firstComparison == 0 && bounds.first.publishTime < existing.first.publishTime)
                    then bounds.first
                    else existing.first
                val last =
                    if lastComparison > 0 || (lastComparison == 0 && bounds.last.publishTime > existing.last.publishTime)
                    then bounds.last
                    else existing.last
                TopicConsumedBounds(first, last)
        acc.updated(topicFqn, merged)
    }

/** Put one row on the wire.
  *
  * ABSENT STAYS ABSENT. Every optional here maps to an unset protobuf wrapper rather than to a zero,
  * because the client renders a blank cell for "not known" and a real figure for "known to be zero",
  * and the two are different answers: the first of N stored entries has position 1/N, while a topic
  * whose session position has aged out is not known.
  */
def topicPositionToPb(row: TopicPositionRow): consumerPb.TopicPosition =
    consumerPb.TopicPosition(
        topicFqn = row.topicFqn,
        firstMessageId = row.first.map(e => ByteString.copyFrom(e.messageId.toByteArray)),
        firstPublishTime = row.first.map(_.publishTime),
        lastMessageId = row.last.map(e => ByteString.copyFrom(e.messageId.toByteArray)),
        lastPublishTime = row.last.map(_.publishTime),
        cursorMessageId = row.cursor.map(c => ByteString.copyFrom(c.messageId.toByteArray)),
        cursorPublishTime = row.cursor.map(_.publishTime),
        cursorTimeFraction = row.cursorTimeFraction,
        cursorEntryFraction = row.cursorEntryFraction,
        retainedEntries = row.retainedEntries,
        cursorEntryOrdinal = row.cursorEntryOrdinal,
        unavailableReason = row.unavailableReason,
        firstConsumedMessageId = row.firstConsumed.map(c => ByteString.copyFrom(c.messageId.toByteArray)),
        firstConsumedPublishTime = row.firstConsumed.map(_.publishTime)
    )

/** How many of one session's physical topics the Topic Positions poll may ask the broker about at
  * once. Deliberately narrower than the start-from position lookups: this one is POLLED, so its
  * cost recurs for as long as the tab is open, while a position resolution happens once per Play.
  * Every task still runs on the server-wide budget shared with those lookups
  * ([[approximatePositionLookupGlobalParallelism]]), so the two cannot multiply. */
val topicPositionLookupParallelism: Int = 8

/** The wall-clock budget for one scan. Past it the poll answers with what it could not do rather
  * than holding the broker and the client indefinitely; the tab simply asks again. */
val topicPositionScanBudgetMs: Long = 20_000

/** How many Topic Positions scans may be in progress across the whole server. Each of these threads
  * only WAITS - it dispatches the per-topic lookups onto the shared budget and collects them - so
  * this bounds pile-up, not broker load; the coalescing below already limits a session to one scan
  * at a time however fast its tab polls. */
private val topicPositionScanConcurrency: Int = 8

private val topicPositionScanThreadNumber = java.util.concurrent.atomic.AtomicInteger(0)

private lazy val topicPositionScanExecutor: java.util.concurrent.ExecutorService =
    java.util.concurrent.Executors.newFixedThreadPool(
        topicPositionScanConcurrency,
        (runnable: Runnable) =>
            val thread = Thread(runnable, s"topic-positions-scan-${topicPositionScanThreadNumber.incrementAndGet()}")
            thread.setDaemon(true)
            thread
    )

/** ONE Topic Positions scan per session at a time, however fast its tab polls.
  *
  * The tab polls once a second and a session may hold up to 2,000 physical topics, each costing two
  * `examineMessage` calls plus `getInternalStats`. Run as the RPC used to run them - serially, on
  * the gRPC thread, before returning an already-completed Future - a single browser could hold a
  * service thread for a sweep of thousands of admin calls, and every tick started ANOTHER sweep on
  * top of the one still running. So: the scan leaves the caller's thread, its per-topic lookups go
  * through the server-wide bounded budget with a wall-clock deadline and cancellation, and a poll
  * arriving while a scan is in flight JOINS it instead of starting a second one. Joining hands back
  * an answer at most one scan old, which is exactly what a once-a-second poll of a slow sweep can
  * honestly show.
  *
  * The scan-registry entry is removed BEFORE its promise completes, so the next poll after a scan
  * finishes always starts a fresh one.
  */
final class TopicPositionScanner(
    parallelism: Int = topicPositionLookupParallelism,
    budgetMs: Long = topicPositionScanBudgetMs,
    execute: Runnable => Unit = topicPositionScanExecutor.execute
):
    private val inFlight = java.util.concurrent.ConcurrentHashMap[String, scala.concurrent.Future[Vector[TopicPositionRow]]]()

    /** Scans running right now - a test's window, and what a saturation metric would read. */
    private[consumer] def scansInFlight: Int = inFlight.size

    def scan(
        sessionName: String,
        topicFqns: Vector[String],
        lookup: String => TopicPositionRow
    ): scala.concurrent.Future[Vector[TopicPositionRow]] =
        val topics = topicFqns.distinct.sorted
        if topics.isEmpty then scala.concurrent.Future.successful(Vector.empty)
        else
            val promise = scala.concurrent.Promise[Vector[TopicPositionRow]]()
            val joined = inFlight.putIfAbsent(sessionName, promise.future)
            if joined != null then joined
            else
                val started = scala.util.Try(execute(() =>
                    val outcome = scala.util.Try {
                        val rows = boundedParallelTopicLookup(
                            topics,
                            operation = s"the topic positions of consumer session $sessionName",
                            lookup = lookup,
                            budgetMs = budgetMs,
                            parallelism = parallelism,
                            remediation = "Narrow the session's topic selector, or close the Topic Positions tab while it reads."
                        )
                        topics.flatMap(rows.get)
                    }
                    // Out of the registry FIRST: a caller that sees this promise complete and polls
                    // again must get a new scan, never a finished one it can never leave.
                    inFlight.remove(sessionName, promise.future)
                    promise.complete(outcome)
                    ()
                ))
                started.failed.foreach { err =>
                    inFlight.remove(sessionName, promise.future)
                    promise.failure(err)
                }
                promise.future
