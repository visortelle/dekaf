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
  *     interior to place anything in, and the same rule ApproximateTimePosition follows applies
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
  * sizes stayed uniform across the topic's life - exactly the approximation ApproximateDataPosition
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

/** Collapse the per-listener cursor maps of one session into one cursor per topic, keeping the
  * FURTHEST each topic has been read.
  *
  * A session can consume the same topic from more than one target - two targets differing only in
  * their filters is an ordinary configuration - and each keeps its own listener, so each keeps its
  * own read position. The table has one row per topic, so the two have to be reconciled, and the
  * furthest is the only answer that means "how far has this session read".
  *
  * Ordered by MESSAGE ID, not by publish time. Publish time is stamped by the producer and can run
  * backwards between two messages; ledger-and-entry order is the log's own order and cannot.
  */
def furthestCursors(perListener: Iterable[Map[String, TopicCursor]]): Map[String, TopicCursor] =
    perListener.flatten.foldLeft(Map.empty[String, TopicCursor]) { case (acc, (topicFqn, cursor)) =>
        val furthest = acc.get(topicFqn) match
            case Some(existing) if existing.messageId.compareTo(cursor.messageId) >= 0 => existing
            case _                                                                     => cursor
        acc.updated(topicFqn, furthest)
    }

/** Put one row on the wire.
  *
  * ABSENT STAYS ABSENT. Every optional here maps to an unset protobuf wrapper rather than to a zero,
  * because the client renders a blank cell for "not known" and a real figure for "known to be zero",
  * and the two are different answers: a cursor at the very first entry IS 0% through, while a topic
  * whose cursor has aged out is not.
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
        unavailableReason = row.unavailableReason
    )
