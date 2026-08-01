package consumer.session_runner

import org.apache.pulsar.client.admin.PulsarAdmin

import java.time.ZonedDateTime
import org.apache.pulsar.client.api.{Consumer, PulsarClient, Message as PulsarMessage, MessageId as PulsarMessageId, MessageIdAdv}
import _root_.topic.{TopicPartitioningType, getTopicPartitioning}
import _root_.consumer.start_from.{ApproximateDataPosition, ApproximateTimePosition, ConsumerSessionStartFrom, DateTime, DateTimeUnit, EarliestMessage, LatestMessage, MessageId, NthMessageAfterEarliest, NthMessageBeforeLatest, RelativeDateTime}

import org.apache.pulsar.client.impl.MessageIdImpl

import scala.util.{Failure, Success, Try}
import scala.jdk.CollectionConverters.*
import com.typesafe.scalalogging.Logger
import consumer.session_runner.ConsumerSessionTargetRunner.logger

def getPartitions(adminClient: PulsarAdmin, topicFqn: String): Vector[String] =
    val tenant = topicFqn.split('/')(2)
    val namespace = topicFqn.split('/')(3)
    val namespaceFqn = s"$tenant/$namespace"
    val partitions = adminClient.topics
        .getList(namespaceFqn)
        .asScala
        .filter(partitionFqn => partitionFqn.matches(s"$topicFqn-partition-\\d+"))
        .toVector
    partitions

/** Key the admin client uses to report how many messages the entry it just expanded holds. Set by
  * `TopicsImpl.getIndividualMsgsFromBatch`; absent for a message that was not batched.
  *
  * VERIFIED against Pulsar 3.2.1: 100 messages sent with the default (batching) producer became ONE
  * entry, and `examineMessage` answered with `X-Pulsar-num-batch-message -> 100` in
  * `getProperties`.
  */
val batchSizeProperty = "X-Pulsar-num-batch-message"

/** How many messages the entry behind `message` holds, read from a source a PRODUCER CANNOT FORGE.
  *
  * This count drives the backward walk's running total and the per-topic overshoot discard, so a
  * value under producer control would let a crafted message overshoot the count and make the discard
  * swallow real messages from the head of the stream.
  *
  * `X-Pulsar-num-batch-message` lives in `getProperties`, right beside the arbitrary keys a producer
  * sets, and the admin client only overwrites it (from the entry's real batch metadata) for entries
  * it actually expands as batches - so a forged value survives on an UNBATCHED message. The message
  * id is the non-forgeable witness: the admin client returns a batch id (batch index >= 0) exactly
  * for a real batch, which a producer cannot fake onto an unbatched message.
  *
  *  - Batched id carrying its own batch size: use that - it is not a property at all.
  *  - Batched id without one: fall back to the verified property, but only as a POSITIVE number.
  *  - Unbatched id: exactly one message, whatever `getProperties` claims - the forged case.
  *
  * The fallback direction is deliberate: an unrecognised or out-of-range value is read as a single
  * message, which makes the walk go DEEPER (over-deliver) rather than swallow.
  */
def messagesInEntryOf(message: PulsarMessage[Array[Byte]]): Int =
    message.getMessageId match
        case adv: MessageIdAdv if adv.getBatchIndex >= 0 =>
            val fromId = adv.getBatchSize
            if fromId > 0 then fromId
            else
                message.getProperties.asScala
                    .get(batchSizeProperty)
                    .flatMap(value => Try(value.toInt).toOption)
                    .filter(_ >= 1)
                    .getOrElse(1)
        case _ => 1

/** Strip the batch index off an id so it addresses the ENTRY.
  *
  * The admin client hands back a `BatchMessageIdImpl` pinned to batch index 0. Seeking to THAT id
  * only delivers the whole entry while the consumer was built with `startMessageIdInclusive()`
  * (without it the first message of the entry is skipped, which would silently shift every discard
  * count by one). Seeking to the bare entry id behaves the same either way - VERIFIED against
  * Pulsar 3.2.1 on a 3-entry x 10-message topic: both flags delivered the entry from its first
  * message.
  */
def entryIdOf(messageId: PulsarMessageId): PulsarMessageId = messageId match
    case id: MessageIdImpl => new MessageIdImpl(id.getLedgerId, id.getEntryId, id.getPartitionIndex)
    case other             => other

/** One entry of a log, as the backward walk reads it: where it is, when it was published, and how
  * many messages it holds.
  *
  * The publish time is what makes a MERGED backward walk possible across partitions. It costs
  * nothing to carry - `examineMessage` returns a whole message - and it used to be thrown away,
  * which is why narrowing the over-fetch afterwards needed a buffer of delivered messages.
  *
  * All messages of a batched entry share the entry's publish time (Pulsar stamps it once, on the
  * batch's `MessageMetadata`), so an entry-level publish time is exact for every message in it.
  */
final case class LogEntry[A](entryId: A, publishTime: Long, messagesInEntry: Int)

/** The k-th ENTRY counted back from the end of `topicFqn` (k = 1 is the last entry), or `None` once
  * k is past the start of the log.
  *
  * `examineMessage` is ENTRY-addressed on both sides, but its failure modes differ: counting back
  * from `latest` past the start FAILS (ManagedLedgerException "Incorrect parameter input", surfaced
  * as an admin 500), while counting from `earliest` past the end silently CLAMPS to the last entry.
  * Only the first is used here; the caller guards the clamping case as well.
  *
  * `None` means the BROKER SAID there is nothing there, and nothing else. A broker that could not
  * answer - a timeout, a 401, a 404, a 500 about something else - throws, because the caller reads
  * `None` as "this log is exhausted" and seeks to EARLIEST: erasing an operational failure into it
  * turned "the latest 5" into the whole backlog with the session reporting success. See
  * [[isEmptyLogAnswer]] for the measured classification.
  */
def entryFromLatest(adminClient: PulsarAdmin, topicFqn: String)(k: Long): Option[LogEntry[PulsarMessageId]] =
    brokerAnswer(s"examining entry $k counted back from the end", topicFqn)(adminClient.topics.examineMessage(topicFqn, "latest", k)).map { message =>
        if isChunkPiece(message) then
            throw StartFromUnresolvableException(
                s"Could not resolve the requested start-from position: $topicFqn stores CHUNKED messages (one message split " +
                    "across several entries), and 'Latest n messages' counts entries - an entry count is not a message count " +
                    "there. Use a time-based position or 'Skip first n messages', which counts what is actually delivered.",
                null
            )
        LogEntry(entryIdOf(message.getMessageId), message.getPublishTime, messagesInEntryOf(message))
    }

/** Whether this examined message is one CHUNK of a larger logical message.
  *
  * A chunking producer stores ONE logical message as SEVERAL ledger entries, which the consumer
  * reassembles - so counting entries counts fragments, and every count the walk produces is
  * silently wrong. Read from the message's own metadata behind a guarded impl cast; anything
  * unreadable counts as "not chunked", so an exotic client type degrades to the old behaviour
  * rather than refusing valid topics. */
def isChunkPiece(message: PulsarMessage[Array[Byte]]): Boolean = message match
    case impl: org.apache.pulsar.client.impl.MessageImpl[?] =>
        Try {
            val metadata = impl.getMessageBuilder
            metadata != null && metadata.hasNumChunksFromMsg && metadata.getNumChunksFromMsg > 1
        }.getOrElse(false)
    case _ => false

/** The FIRST entry `topicFqn` retains right now, or `None` when it retains nothing. One lookup;
  * the retention re-check reads it per contributing topic after a latest-n walk resolves. */
def earliestRetainedEntryId(adminClient: PulsarAdmin, topicFqn: String): Option[PulsarMessageId] =
    brokerAnswer("examining the first retained entry", topicFqn)(adminClient.topics.examineMessage(topicFqn, "earliest", 1))
        .map(message => entryIdOf(message.getMessageId))

/** How many times ONE backward step may re-read a topic whose end moved forward under it before the
  * walk REFUSES.
  *
  * A handful of appends can land inside the milliseconds of one admin round trip, and the walk
  * re-anchors past them. A log that keeps outrunning the walk for this many consecutive lookups has
  * no resolvable "last n" at this moment, and both silent endings are wrong answers delivered as
  * success: classifying it as exhaustion seeks EARLIEST (the whole backlog - the original defect),
  * and stopping short delivers fewer than n. The walk therefore fails with
  * [[StartFromUnresolvableException]], naming the topic, so the user can retry when the producer
  * quietens or reach for a time position instead.
  *
  * A broker that CLAMPS to its last entry forever (defensive - Pulsar 3.2 FAILS past the start
  * rather than clamping) must not burn this bound or be refused: it is told apart from growth by
  * ONE verification lookup - re-asking the k that produced the last ACCEPTED entry. A clamped end
  * never moves, so that k answers the same entry again; a grown end answers a newer one. The clamp
  * therefore still resolves as `Everything`, one lookup later than the old first-repeat guard - the
  * guard that could not tell a clamp from a single concurrent append.
  */
val maxLatestNReanchorSteps: Int = 64

/** The wall-clock budget for resolving one 'Latest n messages' request.
  *
  * The count cap ([[latestNMaxAccepted]]) bounds N, but N is a poor proxy for COST: the walk pays
  * roughly one synchronous `examineMessage` per ENTRY, so a batched topic answers ten million in
  * thousands of lookups while an unbatched one would need ten million of them - hours, inside a
  * session-create call that shows no progress and cannot be cancelled. Time is the honest bound:
  * a resolution that cannot finish inside this budget fails with the same "narrow the request"
  * guidance the count cap gives, instead of grinding on. */
val latestNResolveBudgetMs: Long = 30_000L

/** Entry-position order for the backward walk: `a` is strictly older than `b` when its id sorts
  * before `b`'s. `MessageIdImpl.compareTo` orders by ledger then entry then partition, so an earlier
  * append is strictly less. This is what tells a genuine step back from a `latest, k` answer that
  * only moved because the log grew under the walk. */
def latestNEntryIsOlder(a: PulsarMessageId, b: PulsarMessageId): Boolean = a.compareTo(b) < 0

/** Where ONE physical topic has to start so that the session's topics TOGETHER deliver the last n
  * messages. */
enum LatestNSeek[+A]:
    /** Everything this topic holds is older than the cut, so it contributes no history at all: seek
      * it to LATEST. NOT to earliest - that would show the whole log. */
    case Nothing

    /** The walk consumed this topic's whole log: seek to EARLIEST and discard nothing. */
    case Everything

    /** Seek to `entryId` and drop the first `discard` messages delivered from it - the overshoot
      * inside the entry the walk stopped on, which a seek cannot express because it can only land
      * on an entry boundary. */
    case FromEntry(entryId: A, discard: Long)

/** Resolve "deliver exactly the last `n` messages across these topics, newest first by publish
  * time" into a starting position per topic - WITHOUT reading a single message.
  *
  * ONE MERGED BACKWARD WALK, not one walk per topic plus a buffer afterwards. Each topic gets a
  * cursor stepping back through its entries; repeatedly take the cursor whose current entry has the
  * LARGEST publish time, add that entry's message count to a running total, and step that cursor
  * back one. Stop when the total reaches n. Because a cursor only ever moves backwards, the entries
  * taken from a topic are always a contiguous suffix of its log - so "seek to the oldest entry
  * taken" delivers exactly the messages the walk chose, plus everything newer, and nothing else.
  *
  * MEMORY IS O(NUMBER OF TOPICS): one cursor and one entry's metadata each. Nothing is buffered and
  * no message payload is ever held. This replaced a bounded top-n heap of exactly n DELIVERED
  * messages, which made "the latest n" the one start-from whose memory was a number the user typed,
  * and which could let a live message evict a historical one because both went through the same
  * heap. Neither failure mode exists here: the cut is decided before anything is delivered.
  *
  * COST IS O(n / batch size + topics) admin lookups - strictly cheaper than the per-topic walks it
  * replaces (those cost O(topics * n / batch size)), and independent of how big the topics are.
  *
  * THE CUT IS BY APPEND POSITION WITHIN A TOPIC AND BY ENTRY PUBLISH TIME ACROSS TOPICS, which is
  * the contract [[MessageOrderKey]] states and not a stronger one. A partition whose producer clock
  * stepped backwards can hold a high-timestamp message deeper in its log than the walk ever reaches,
  * and it will not be found - finding it would mean scanning the whole log, which is O(topic) at any
  * n. The publish-time tie-break is the same one [[MessageOrderKey]] uses (time, then topic name),
  * so an entry-level cut and a message-level order cannot disagree.
  *
  * PURE: the broker sits behind `entryFromLatest`, so batched / unbatched / uneven / exhausted /
  * clamped / empty logs, and every interleaving across topics, are testable with a plain lambda.
  *
  * `entryFromLatest(topic)(k)` must answer with the k-th entry counted back from the end of that
  * topic (k = 1 is the last entry), or `None` once k is past its start.
  *
  * THE ANCHOR MOVES WHILE THE WALK RUNS. `examineMessage(topic, "latest", k)` counts back from
  * whatever the end is at the moment it is asked, so a producer appending during session creation
  * shifts position k forward under the cursor: a single append makes the next step answer with the
  * entry JUST taken, a burst makes it answer with a NEWER one. Neither is exhaustion. The walk tells
  * a real step back from a re-anchored answer with `entryIsOlder` (a total order on entry positions
  * - `MessageIdImpl.compareTo` in production), and steps k forward until the answer is strictly
  * older, re-anchoring past the growth. A topic ends on `None` or on a VERIFIED clamp; a log still
  * outrunning the walk at the re-anchor bound FAILS the resolution loudly instead of answering
  * with the whole backlog or a short count. See [[maxLatestNReanchorSteps]].
  *
  * `entryIsOlder(a, b)` must be true exactly when position `a` sits strictly BEFORE `b` in the log.
  */
def resolveLatestN[A](
    n: Long,
    topicFqns: Vector[String],
    entryFromLatest: String => Long => Option[LogEntry[A]],
    entryIsOlder: (A, A) => Boolean,
    resolveBudgetMs: Long = latestNResolveBudgetMs,
    nowMs: () => Long = () => System.nanoTime() / 1_000_000L
): Map[String, LatestNSeek[A]] =
    val topics = topicFqns.distinct
    if n <= 0 then topics.map(_ -> LatestNSeek.Nothing).toMap
    else
        val startedAtMs = nowMs()
        def checkBudget(): Unit =
            val elapsed = nowMs() - startedAtMs
            if elapsed > resolveBudgetMs then
                throw StartFromUnresolvableException(
                    s"Could not resolve the requested start-from position: 'Latest n messages' has been walking entry metadata for " +
                        s"${elapsed}ms, past its ${resolveBudgetMs}ms budget - the topics hold more entries than can be walked " +
                        "interactively (an unbatched topic costs one broker lookup per message). Ask for fewer messages, use " +
                        "'Skip first n messages' (which streams and reports progress), or a time-based position.",
                    null
                )

        val nextK = scala.collection.mutable.Map.from(topics.map(_ -> 1L))
        // The entry each cursor is currently offering. A topic missing from here has either run off
        // the start of its log or had its offer taken and not yet been stepped.
        val head = scala.collection.mutable.Map.empty[String, LogEntry[A]]
        val previousEntryId = scala.collection.mutable.Map.empty[String, A]
        // The k that ANSWERED with the accepted entry, at the moment it was accepted. Re-asking it
        // is what tells a clamping broker (same answer - the end never moved) from a log that grew
        // under the walk (a newer answer). See [[maxLatestNReanchorSteps]].
        val acceptedAtK = scala.collection.mutable.Map.empty[String, Long]
        val oldestTaken = scala.collection.mutable.Map.empty[String, A]
        val exhausted = scala.collection.mutable.Set.empty[String]

        def step(topicFqn: String): Unit =
            // Advance k until the answer is STRICTLY OLDER than the entry last taken from this topic,
            // re-anchoring past anything appended since the previous step. An answer that is not
            // older is the moving anchor, not exhaustion: the same id means one append shifted k back
            // onto the entry just taken (the old code read that as exhausted and fell back to
            // EARLIEST - the whole backlog for a "latest n"); a newer id means a burst arrived (the
            // old code took it, walking the cursor forward off the contiguous suffix and
            // double-counting). Only `None` and a VERIFIED clamp end the topic; a log still
            // outrunning the walk at the re-anchor bound fails the resolution rather than answering
            // with a set nobody asked for - see [[maxLatestNReanchorSteps]] for both trades.
            var reanchors = 0
            var settled = false
            while !settled do
                checkBudget()
                entryFromLatest(topicFqn)(nextK(topicFqn)) match
                    case None =>
                        exhausted += topicFqn
                        settled = true
                    case Some(entry) =>
                        val previous = previousEntryId.get(topicFqn)
                        if previous.forall(prev => entryIsOlder(entry.entryId, prev)) then
                            head(topicFqn) = entry
                            previousEntryId(topicFqn) = entry.entryId
                            acceptedAtK(topicFqn) = nextK(topicFqn)
                            nextK(topicFqn) = nextK(topicFqn) + 1
                            settled = true
                        else
                            // The SAME id again is ambiguous - one append per round trip and a
                            // clamping broker look identical from here - so it is settled by one
                            // verification lookup at the k that produced the accepted entry: a
                            // clamped end never moves and answers the same entry (exhausted); a
                            // grown end answers a newer one (re-anchor). `None` there means the log
                            // was trimmed under the walk past even the accepted entry - nothing
                            // older is left to take. A NEWER id needs no verification: only growth
                            // produces it.
                            val verifiedClamp =
                                previous.contains(entry.entryId) && {
                                    entryFromLatest(topicFqn)(acceptedAtK(topicFqn)) match
                                        case Some(check) => previous.contains(check.entryId)
                                        case None        => true
                                }
                            if verifiedClamp then
                                exhausted += topicFqn
                                settled = true
                            else if reanchors >= maxLatestNReanchorSteps then
                                throw StartFromUnresolvableException(
                                    s"Could not resolve the requested start-from position: 'Latest n messages' walked $topicFqn " +
                                        s"backwards, but new messages kept arriving faster than the walk could step for " +
                                        s"$maxLatestNReanchorSteps consecutive lookups. Retry when the topic is quieter, or use a " +
                                        "time-based position or 'Skip first n messages' instead.",
                                    null
                                )
                            else
                                nextK(topicFqn) = nextK(topicFqn) + 1
                                reanchors += 1

        topics.foreach(step)

        var total = 0L
        var lastTaken: Option[String] = None
        // A max-heap of current heads keyed (publish time, topic), so selecting each entry costs
        // O(log topics) instead of a scan of every topic per entry. A head changes only when its
        // topic's entry is TAKEN (and the topic re-stepped), so the heap is pushed at exactly
        // those points; a popped pair that no longer matches the live head map is stale and
        // discarded. The tuple tie-break is the same one the scan used, so the cut is unchanged.
        val selection = scala.collection.mutable.PriorityQueue.empty[(Long, String)]
        head.foreach((topicFqn, entry) => selection.enqueue(entry.publishTime -> topicFqn))
        var walking = true
        while walking do
            var chosen: Option[String] = None
            while chosen.isEmpty && selection.nonEmpty do
                val (publishTime, topicFqn) = selection.dequeue()
                if head.get(topicFqn).exists(_.publishTime == publishTime) then chosen = Some(topicFqn)
            chosen match
                case None => walking = false
                case Some(topicFqn) =>
                    val entry = head(topicFqn)
                    total += (entry.messagesInEntry max 1)
                    oldestTaken(topicFqn) = entry.entryId
                    lastTaken = Some(topicFqn)
                    head.remove(topicFqn)
                    if total >= n then walking = false
                    else
                        step(topicFqn)
                        head.get(topicFqn).foreach(next => selection.enqueue(next.publishTime -> topicFqn))

        // The entry the walk STOPPED on may hold more messages than were still needed, and those
        // are the OLDEST inside it. They cannot be seeked past - a seek lands on an entry boundary -
        // so they are dropped from the head of that one topic's stream.
        val overshoot = (total - n) max 0L

        topics.map { topicFqn =>
            topicFqn -> (oldestTaken.get(topicFqn) match
                // Contributed nothing, but its tail WAS inspected: anchor there, not at seek-time
                // latest. The walk already paid for this knowledge (the untaken head IS the
                // inspected tail), and seeking to "latest" AT SEEK TIME silently jumped anything
                // published between the inspection and the seek - a live message lost outright,
                // where every contributing topic kept its concurrent appends. The anchor entry
                // itself is delivered and dropped per topic (the same head-drop the overshoot
                // uses), which is exactly "everything after the inspected tail".
                case None =>
                    head.get(topicFqn) match
                        case Some(tail) => LatestNSeek.FromEntry(tail.entryId, (tail.messagesInEntry max 1).toLong)
                        // EMPTY when inspected: everything the topic holds at seek time arrived
                        // after the inspection, so all of it is live traffic the session must
                        // show - which is what seeking EARLIEST delivers. "Latest" would race the
                        // same appends the anchor above exists to keep.
                        case None       => LatestNSeek.Everything
                case Some(entryId) if overshoot > 0 && lastTaken.contains(topicFqn)   => LatestNSeek.FromEntry(entryId, overshoot)
                case Some(_) if exhausted.contains(topicFqn)                          => LatestNSeek.Everything
                case Some(entryId)                                                    => LatestNSeek.FromEntry(entryId, 0L))
        }.toMap

/** Whether `topicFqn` names a topic that stores nothing.
  *
  * A non-persistent topic has no backlog, no history and no entry to address: messages go straight
  * from producer to whoever is connected. `PulsarAdmin.topics.examineMessage` refuses one outright
  * (HTTP 405, "Examine messages on a non-persistent topic is not allowed").
  *
  * Decided from the FQN and NOT from that 405: the admin call sits inside a `Try(...).toOption`, so
  * catching the refusal would turn a request the session cannot satisfy into a silent fallback to
  * earliest or latest - the user asks for a position in history and gets a different one, with the
  * session looking like it worked. The `Try` stays as a backstop; this is the mechanism.
  *
  * Only the scheme counts. "persistent://public/default/non-persistent-audit" is an ordinary
  * persistent topic that happens to be named after the word.
  */
def isNonPersistentTopic(topicFqn: String): Boolean = topicFqn.startsWith("non-persistent://")

/** Whether this start-from needs messages to still be stored somewhere.
  *
  * Everything except "latest message" does. `EarliestMessage` is deliberately in the needs-history
  * set: a seek to earliest on a non-persistent topic does not fail, it silently behaves as "from
  * now" - answering a request for the start of the topic with the live tail.
  *
  * The catch-all treats an unrecognised mode as needing a history, so a mode added later fails
  * loudly on a non-persistent topic rather than degrading quietly.
  */
def startFromNeedsRetainedHistory(startFrom: ConsumerSessionStartFrom): Boolean = startFrom match
    case _: LatestMessage            => false
    case _: EarliestMessage          => true
    case _: NthMessageAfterEarliest  => true
    case _: NthMessageBeforeLatest   => true
    case _: MessageId                => true
    case _: DateTime                 => true
    case _: RelativeDateTime         => true
    // Both approximate modes are proportions OF A HISTORY, and both need the broker to say what
    // that history is - the entry count for one, the first and last publish times for the other.
    // `examineMessage` answers neither on a non-persistent topic (405), so neither can compute a
    // position there.
    case _: ApproximateDataPosition  => true
    case _: ApproximateTimePosition  => true
    case _                           => true

/** Why this start-from cannot be honoured on these topics, or `None` if it can.
  *
  * Rejects only when NOTHING in the resolved set retains anything. A session may legitimately mix
  * persistent and non-persistent topics, and failing all of it because one topic is live-only would
  * make history positions unusable on any such session - the mixed case is handled by seeking the
  * persistent topics to the requested position and the rest to "now" (see [[handleStartFrom]]).
  *
  * An empty resolved set is not this function's problem: `ConsumerSessionRunner.make` already
  * rejects a session that resolved to no topics, with a message that points at the target.
  */
def startFromRejectionReason(startFrom: ConsumerSessionStartFrom, topicFqns: Vector[String]): Option[String] =
    val allLiveOnly = topicFqns.nonEmpty && topicFqns.forall(isNonPersistentTopic)
    Option.when(allLiveOnly && startFromNeedsRetainedHistory(startFrom)) {
        val named = topicFqns.take(3).mkString(", ")
        val andMore = if topicFqns.size > 3 then s" and ${topicFqns.size - 3} more" else ""
        s"Start-from ${startFrom.getClass.getSimpleName} needs a retained message history, but every topic this session resolved to is " +
            s"non-persistent ($named$andMore). A non-persistent topic stores no messages, so only LatestMessage can be used on one."
    }

/** Why this start-from's COUNT cannot be honoured, or `None` if it can.
  *
  * The count arrives over gRPC as a plain `int64` that any client can fill in with anything. The
  * browser validates it too, so this is the TRUST BOUNDARY rather than the only guard - and a
  * boundary refuses rather than clamps, because a clamp answers a different question in silence:
  * "skip the first -1 messages" was read as EARLIEST (the whole topic) and "the latest -1 messages"
  * as LATEST (nothing retained at all).
  *
  * SKIP-N HAS DELIBERATELY NO UPPER BOUND. Skipping n messages is O(n) whatever n is - Pulsar keeps
  * no message-ordinal index, so the only exact way to reach message n is to stream n and throw them
  * away - and the start-from progress API exists precisely so a long skip can be watched rather
  * than forbidden. Any cap here would be an invented number, not a limit of the design.
  *
  * LATEST-N HAS ONE, and it is an OPERATIONAL bound, stated as such. The walk behind latest-n
  * costs one broker lookup per entry, synchronously, while session creation holds the per-name
  * lifecycle lock and reports no progress. The old boundary (Int.MaxValue, a leftover of a heap
  * implementation that no longer exists) still admitted a request the server would grind on for
  * hours; [[latestNMaxAccepted]] is the honest ceiling - at worst tens of thousands of entry
  * lookups even on unbatched topics, i.e. minutes not hours - and the rejection says what to use
  * instead. It is never NARROWED: narrowing served a different request without saying so.
  *
  * PURE, so every boundary is pinned by test.
  */
/** The most a 'Latest n messages' request may ask for.
  *
  * A sanity bound on N, NOT the cost bound: the walk pays roughly one broker lookup per ENTRY, so
  * this many messages is thousands of lookups on a well-batched topic and ten million on an
  * unbatched one - which no interactive request survives. The honest cost bound is
  * [[latestNResolveBudgetMs]]: a walk that cannot finish in time fails with guidance, whatever N
  * was. This ceiling stays to refuse the absurd outright (and to give the UI a number to mirror -
  * see `latestMessageCountMax` in the frontend, pinned to this by test on both sides). */
val latestNMaxAccepted: Long = 10_000_000L

/** THE DUPLICATE-TARGET CONTRACT for the counted modes, stated once, and it is MODE-SPECIFIC.
  *
  * "Latest n": the count is per SESSION across its unique TOPICS, and when two enabled targets
  * select the SAME topic each target delivers its own counted set through its own subscription.
  * Two targets on one 10-message topic with "latest 3" therefore show three rows EACH (six in
  * total, tagged with their target), not three split between them: a second target exists
  * precisely to show a second view - its own filters, its own coloring - and starving one view to
  * feed the other would make either target's output depend on the mere existence of the other.
  * The metadata walk is still memoised per topic, so the broker is asked once however many
  * targets share it.
  *
  * "Skip first n" REFUSES overlapping targets instead (see [[skipOverlapRejectionReason]]): its
  * count is spent by ONE session-wide budget over the merged delivered stream, so with two
  * subscriptions on one topic the budget would be spent on COPIES - a message dropped through one
  * target while the other still shows it, in whichever interleaving the brokers produced. Until a
  * per-source-message semantics exists (decide each unique message once, apply the decision to
  * every view), refusing loudly is the only answer that means something.
  */
def startFromCountRejectionReason(startFrom: ConsumerSessionStartFrom): Option[String] = startFrom match
    case v: NthMessageAfterEarliest if v.n < 0 =>
        Some(s"Start-from 'Skip first n messages' needs n to be zero or more, but it was ${v.n}.")
    case v: NthMessageBeforeLatest if v.n < 0 =>
        Some(s"Start-from 'Latest n messages' needs n to be zero or more, but it was ${v.n}.")
    case v: NthMessageBeforeLatest if v.n > latestNMaxAccepted =>
        Some(
            s"Start-from 'Latest n messages' accepts at most $latestNMaxAccepted, but ${v.n} were asked for. " +
                "The last n are located by walking entry metadata backwards, one broker lookup per entry, while session " +
                "creation waits with no progress to show - a larger n would grind for hours. " +
                "Use 'Skip first n messages' (which streams and reports progress) or a time position to reach further back."
        )
    case _ => None

/** Why 'Latest n messages' cannot be honoured against read-compacted targets, or `None`.
  *
  * Compacted reading changes WHAT IS VISIBLE - only the newest message per key survives before
  * the compaction horizon - while the walk counts raw STORED entries. The two disagree whenever
  * a key repeats, so the exact-count promise cannot be kept over a view the walk cannot see.
  * Skip-n is fine on the same target: it counts what is actually DELIVERED. */
def latestNReadCompactedRejectionReason(startFrom: ConsumerSessionStartFrom, readCompactedTargetIndexes: Vector[Int]): Option[String] =
    startFrom match
        case v: NthMessageBeforeLatest if v.n > 0 && readCompactedTargetIndexes.nonEmpty =>
            Some(
                s"Start-from 'Latest n messages' counts STORED entries, but target(s) ${readCompactedTargetIndexes.sorted.mkString(", ")} " +
                    "read compacted - only the newest message per key is visible there, so the stored count and the visible count " +
                    "disagree whenever a key repeats. Use a time-based position or 'Latest message', or turn off compacted reading."
            )
        case _ => None

/** Why a counted SKIP cannot run over these enabled targets' topic sets, or `None`.
  *
  * See the duplicate-target contract above: skip-n's budget is session-wide over the merged
  * stream, so two subscriptions on one physical topic spend it on COPIES and neither target's
  * output means "everything after the first n". Refused at creation, before any consumer exists. */
def skipOverlapRejectionReason(startFrom: ConsumerSessionStartFrom, topicsPerEnabledTarget: Vector[Vector[String]]): Option[String] =
    startFrom match
        case v: NthMessageAfterEarliest if v.n > 0 =>
            val seenBy = topicsPerEnabledTarget.flatMap(_.distinct).groupBy(identity).view.mapValues(_.size)
            val overlapping = seenBy.collect { case (topicFqn, targets) if targets > 1 => topicFqn }.toVector.sorted
            Option.when(overlapping.nonEmpty) {
                val named = overlapping.take(3).mkString(", ")
                val andMore = if overlapping.size > 3 then s" and ${overlapping.size - 3} more" else ""
                s"Start-from 'Skip first n messages' cannot run while two enabled targets select the same topic ($named$andMore): " +
                    "the skip counts the session's merged stream once, so it would drop a message through one target while the " +
                    "other still shows it. Disable one of the overlapping targets or give them disjoint topics."
            }
        case _ => None

/** Why a resolved latest-n cut can no longer be applied, or `None`: an anchor entry the walk
  * counted was REMOVED by retention in the gap between resolving and seeking. Seeking to a
  * trimmed anchor silently lands past it, and the session then holds fewer than the n it reported
  * it would - a wrong answer delivered as success. One `earliestEntry` lookup per contributing
  * topic; a topic that now retains NOTHING has lost its anchor by definition. */
def latestNAnchorRejectionReason[A](
    cut: Map[String, LatestNSeek[A]],
    earliestEntry: String => Option[A],
    entryIsOlder: (A, A) => Boolean
): Option[String] =
    cut.toVector.sortBy(_._1).collectFirst {
        case (topicFqn, LatestNSeek.FromEntry(anchor, _))
            if earliestEntry(topicFqn).map(first => entryIsOlder(anchor, first)).getOrElse(true) =>
            s"Could not apply the requested start-from position: retention removed the resolved anchor entry on $topicFqn " +
                "between resolving 'Latest n messages' and seeking to it, so the session would silently hold fewer than the " +
                "n that was asked for. Retry; if it keeps happening, the topic's retention is shorter than the time it takes " +
                "to position against it."
    }

/** Split by whether the topic behind each item retains anything: `(has a history, live tail only)`. */
def splitByRetainedHistory[A](items: Vector[A], topicOf: A => String): (Vector[A], Vector[A]) =
    items.partition(item => !isNonPersistentTopic(topicOf(item)))

/** Where an [[ApproximateDataPosition]] lands on ONE physical topic. */
enum ApproximateDataSeek:
    /** The very beginning of the retained log. */
    case Earliest

    /** Past the last retained message - what "latest" means, i.e. nothing retained is shown. */
    case Latest

    /** The 1-based ENTRY ordinal counted from the earliest retained entry, as
      * `examineMessage(topic, "earliest", entryOrdinal)` addresses it.
      *
      * NOT named `ordinal`: every Scala 3 enum case already has an `ordinal` member.
      */
    case Entry(entryOrdinal: Long)

/** Reject a fraction that is not one. Shared by both approximate modes, and `what` names the mode
  * that refused it - two modes now carry a fraction, and a session can only be fixed if the error
  * says which control was wrong.
  *
  * NaN needs its own check: every comparison against it is false, so a plain range test would let it
  * through and it would then floor into an ordinal of 1 (data) or an epoch millisecond of 0 (time).
  */
private def requireFraction(fraction: Double, what: String): Unit =
    if fraction.isNaN then throw new IllegalArgumentException(s"Start-from $what must be a fraction between 0.0 and 1.0, but it was NaN.")
    if fraction < 0.0 || fraction > 1.0 then
        throw new IllegalArgumentException(s"Start-from $what must be a fraction between 0.0 and 1.0, but it was $fraction.")

/** Resolve "start approximately `fraction` of the way through the DATA this topic still holds" into
  * a position.
  *
  * THE ROUNDING RULE: leave `floor(fraction * numberOfEntries)` entries behind, so the 1-based entry
  * to seek to is that plus one, clamped into `[1, numberOfEntries]`. Rounding DOWN means the
  * position never overshoots the proportion asked for - 0.5 of 100 entries leaves exactly 50 behind
  * and starts on entry 51 - and it keeps the mapping monotonic in the fraction.
  *
  * THE ENDPOINTS ARE EXACT, and are not entry ordinals at all: 0.0 is `MessageId.earliest` and 1.0
  * is `MessageId.latest`, so they behave exactly as the "Earliest message" and "Latest message"
  * modes, including 1.0 showing nothing retained and only what arrives from now on.
  *
  * AN EMPTY TOPIC resolves to Earliest for any interior fraction: there is no backlog to be a
  * proportion of, and `examineMessage` FAILS on a topic with no entries ("Could not examine messages
  * due to the total message is zero") rather than answering, so an ordinal must never be asked for.
  * The session then behaves as "Earliest message" does on an empty topic - it shows what gets
  * published from now on. 1.0 still means Latest, so the endpoint contract holds even there.
  *
  * ENTRY GRANULARITY, not message granularity - this is WHY the mode is called approximate. Pulsar
  * has no message-ordinal index unless the operator enables brokerEntryMetadataInterceptors (empty
  * by default), so the only position that resolves in constant time at any topic size is an entry
  * ordinal. With batching (the Java producer default) one entry holds many messages, so the position
  * lands on the START of the entry that covers the requested point - VERIFIED against Pulsar 3.2.1:
  * 100 messages in 10 entries of 10, fraction 0.5 -> entry 6 -> first delivered b-51, fraction 0.25
  * -> entry 3 -> first delivered b-21 (the exact message-proportional point would have been b-26).
  * The fraction is taken over STORED ENTRIES; it diverges from the same fraction over messages
  * exactly as far as batch sizes varied over the topic's lifetime.
  *
  * PURE: `numberOfEntries` is a plain argument, so every log size and every rejected input is
  * testable without a broker.
  *
  * @throws IllegalArgumentException
  *   for NaN, an infinity, or a fraction outside [0.0, 1.0] - see [[requireFraction]].
  */
def resolveApproximateDataPosition(fraction: Double, numberOfEntries: Long): ApproximateDataSeek =
    requireFraction(fraction, "approximate data position")

    if fraction <= 0.0 then ApproximateDataSeek.Earliest
    else if fraction >= 1.0 then ApproximateDataSeek.Latest
    else if numberOfEntries <= 0 then ApproximateDataSeek.Earliest
    else
        // No clamp needed, and none added: the guards above leave 0 < fraction < 1 and
        // numberOfEntries > 0, so floor(fraction * numberOfEntries) is between 0 and
        // numberOfEntries - 1 and the ordinal lands inside [1, numberOfEntries] on its own. The
        // range is pinned by test instead - a clamp here would have hidden a rounding change rather
        // than caught it.
        val entriesToLeaveBehind = math.floor(fraction * numberOfEntries).toLong
        ApproximateDataSeek.Entry(entriesToLeaveBehind + 1)

/** How many entries `topicFqn` still holds. Entry-addressed, and answered from the managed ledger's
  * own counters, so it costs the same on a topic of ten messages and on one of ten billion.
  */
def retainedEntryCount(adminClient: PulsarAdmin, topicFqn: String): Long =
    adminClient.topics.getInternalStats(topicFqn).numberOfEntries

/** The k-th ENTRY counted from the START of `topicFqn` (k = 1 is the first retained entry), as an
  * entry-addressed id to seek to.
  *
  * `None` when the BROKER SAYS there is nothing there - an empty topic, which fails rather than
  * answering. A broker that could not answer at all throws instead: the caller falls back to
  * EARLIEST on `None`, which is honest for an entry that has aged out from under a stale entry
  * count and dishonest for a transient 500. Counting from "earliest" past the END does not fail: it
  * silently CLAMPS to the last entry, which is why the caller must never hand it an ordinal larger
  * than the entry count.
  */
def entryFromEarliest(adminClient: PulsarAdmin, topicFqn: String)(entryOrdinal: Long): Option[PulsarMessageId] =
    brokerAnswer(s"examining entry $entryOrdinal counted from the start", topicFqn)(
        adminClient.topics.examineMessage(topicFqn, "earliest", entryOrdinal)
    ).map(message => entryIdOf(message.getMessageId))

/** The publish times of the FIRST and LAST messages one physical topic still holds. */
final case class TopicTimeSpan(firstPublishTimeMs: Long, lastPublishTimeMs: Long)

/** Where an [[ApproximateTimePosition]] lands. Unlike [[ApproximateDataSeek]] this is one answer for
  * a whole LOGICAL topic: every partition is seeked to the same instant.
  */
enum ApproximateTimeSeek:
    /** The very beginning of the retained log. */
    case Earliest

    /** The first message published at or after this epoch millisecond, i.e. an ordinary
      * `Consumer.seek(timestamp)` - the same broker path the "Specific time" mode uses.
      */
    case Timestamp(publishTimeMs: Long)

/** Resolve "start approximately `fraction` of the way through the TIME RANGE this topic still
  * covers" into a position for the WHOLE logical topic.
  *
  * THE RANGE is `min(first publish time)` .. `max(last publish time)` taken across every partition
  * of the topic, and the cutoff is `earliest + floor(fraction * (latest - earliest))`. Every
  * partition is then seeked to that one instant.
  *
  * WHY MIN/MAX AND NOT A PER-PARTITION QUANTILE. Min/max makes the endpoints exact by construction,
  * makes the mapping monotonic in the fraction, and makes the answer independent of how many
  * partitions the topic has - the same range split three ways or six ways resolves identically. It
  * also avoids the defect the DATA mode has to special-case: an idle partition given its own
  * proportional cutoff hands back messages from the far past, whereas here it simply has nothing at
  * or after the topic-wide instant.
  *
  * THE ENDPOINTS ARE EXACT AND ARE NOT INTERPOLATED. 0.0 is `MessageId.earliest` - the same position
  * "Earliest message" takes, and the one reading that stays right even if the recorded times are
  * already stale. 1.0 is the publish time of the LAST message, so 100% still shows something; that
  * is deliberately unlike the data mode, whose 1.0 means "past the end".
  *
  * AN EMPTY TOPIC - one no partition can answer for - resolves to Earliest at EVERY fraction,
  * including 1.0. `examineMessage` FAILS on a topic with no entries rather than answering, so there
  * is no range and no last message to be exact about; on a topic holding nothing "the beginning" and
  * "the end" are the same position, namely whatever arrives next. Partitions that individually hold
  * nothing are SKIPPED rather than counted as time zero - counting them would drag `earliest` back
  * to 1970 and put every interior fraction before the real data.
  *
  * A TOPIC THAT OCCUPIES ONE INSTANT (first == last, i.e. everything was published inside the same
  * millisecond) has no interior to interpolate into, so every interior fraction resolves to
  * Earliest. There is no division anywhere here - the fraction multiplies the span - so this is a
  * definition rather than a guard against a divide-by-zero: every message shares the one instant, no
  * position separates them, and "all of it" is the only honest answer. 1.0 still answers with that
  * instant, which delivers the same set. The same rule covers a range reported BACKWARDS, which a
  * producer clock that jumped can produce, since publish time is stamped by the producer.
  *
  * MILLISECOND GRANULARITY: a timestamp seek cannot separate messages published in the same
  * millisecond, so the cutoff always lands on a whole millisecond boundary and takes everything
  * stamped with it.
  *
  * PURE: the broker sits behind `timeSpanOf`, so every arrangement - balanced partitions, uneven
  * ones, an idle one, an empty topic, both endpoints - is testable with a plain lambda. Cost in
  * production is two admin calls per partition, both O(1) in the size of the topic, and ZERO for
  * fraction 0.0, which needs no range at all.
  *
  * @throws IllegalArgumentException
  *   for NaN, an infinity, or a fraction outside [0.0, 1.0] - see [[requireFraction]].
  */
def resolveApproximateTimePosition(
    fraction: Double,
    partitionFqns: Vector[String],
    timeSpanOf: String => Option[TopicTimeSpan]
): ApproximateTimeSeek =
    requireFraction(fraction, "approximate time position")

    if fraction <= 0.0 then ApproximateTimeSeek.Earliest
    else
        val spans = partitionFqns.distinct.flatMap(timeSpanOf)
        if spans.isEmpty then ApproximateTimeSeek.Earliest
        else
            val earliest = spans.map(_.firstPublishTimeMs).min
            val latest = spans.map(_.lastPublishTimeMs).max
            if fraction >= 1.0 then ApproximateTimeSeek.Timestamp(latest)
            else if latest <= earliest then ApproximateTimeSeek.Earliest
            else ApproximateTimeSeek.Timestamp(earliest + math.floor(fraction * (latest - earliest)).toLong)

/** The publish times of the first and last messages `topicFqn` still holds, or `None` when the
  * BROKER SAYS it holds nothing - an empty topic, where `examineMessage` fails rather than
  * answering. A non-persistent one (405) is ruled out by the caller before this is reached.
  *
  * A broker that could not answer THROWS rather than answering `None`. The range this feeds is
  * min(first) .. max(last) across every partition, and a partition silently dropped out of it
  * produced a confident cutoff over a narrower range - a different position, reported as success.
  *
  * `examineMessage(topic, "latest", 1)` addresses the last ENTRY, and every message of a producer
  * batch carries that entry's publish time, so the entry's time IS the last message's time.
  */
def publishTimeSpan(adminClient: PulsarAdmin, topicFqn: String): Option[TopicTimeSpan] =
    for
        first <- brokerAnswer("reading the first retained message", topicFqn)(adminClient.topics.examineMessage(topicFqn, "earliest", 1L))
        last <- brokerAnswer("reading the last retained message", topicFqn)(adminClient.topics.examineMessage(topicFqn, "latest", 1L))
    yield TopicTimeSpan(first.getPublishTime, last.getPublishTime)

/** The LOGICAL topic a physical one belongs to: a partition's parent topic, or the topic itself.
  *
  * Only the `-partition-N` suffix Pulsar itself mints is stripped. A non-partitioned topic literally
  * named `orders-partition-3` would be grouped under `orders` - the same ambiguity Pulsar's own
  * `TopicName` carries, and the reason the broker refuses to create such a name.
  */
def logicalTopicOf(topicFqn: String): String =
    val partitionOf = """^(.*)-partition-\d+$""".r
    topicFqn match
        case partitionOf(parent) => parent
        case _                   => topicFqn

def getIsSingleNonPartitionedTopic(adminClient: PulsarAdmin, topics: Vector[String]): Boolean =
    // `.type` is essential: getTopicPartitioning returns a TopicPartitioning record, and comparing
    // the whole record to a TopicPartitioningType was ALWAYS false - which silently disabled the
    // single-topic fast path, so every start-from seeked by publishTime instead of by message id.
    topics.size == 1 && getTopicPartitioning(adminClient, topics.head).`type` == TopicPartitioningType.NonPartitioned

/** Resolve a "N units ago" start position against a supplied `now`.
  *
  * Split out of the seek path (and given an explicit `now`) so all unit x rounding combinations are
  * testable with a frozen clock. `ZonedDateTime.truncatedTo` REJECTS units larger than a day, so
  * Week/Month/Year must be rounded with date adjusters - passing them to truncatedTo threw
  * UnsupportedTemporalTypeException, i.e. "1 month ago, rounded to the start of the month" - an
  * ordinary UI selection - failed the whole session with a generic error.
  */
def resolveRelativeDateTime(v: RelativeDateTime, now: ZonedDateTime): ZonedDateTime =
    import java.time.temporal.ChronoUnit
    v.unit match
        case DateTimeUnit.Year =>
            val dt = now.minusYears(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.DAYS).withDayOfYear(1) else dt
        case DateTimeUnit.Month =>
            val dt = now.minusMonths(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.DAYS).withDayOfMonth(1) else dt
        case DateTimeUnit.Week =>
            val dt = now.minusWeeks(v.value)
            if v.isRoundedToUnitStart then
                dt.truncatedTo(ChronoUnit.DAYS).`with`(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
            else dt
        case DateTimeUnit.Day =>
            val dt = now.minusDays(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.DAYS) else dt
        case DateTimeUnit.Hour =>
            val dt = now.minusHours(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.HOURS) else dt
        case DateTimeUnit.Minute =>
            val dt = now.minusMinutes(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.MINUTES) else dt
        case DateTimeUnit.Second =>
            val dt = now.minusSeconds(v.value)
            if v.isRoundedToUnitStart then dt.truncatedTo(ChronoUnit.SECONDS) else dt

/** The message `messageId` names in `topicFqn`, or `None` if that topic genuinely does not hold it.
  *
  * `None` MEANS "NOT THERE", AND NOTHING ELSE. Every operational failure used to collapse into the
  * same `None` - a message id that could not be parsed at all, a reader the broker refused to
  * create, an unreachable topic, a read that timed out - and the caller then reported "Message with
  * such ID not found", which is a diagnosis of the user's input for what was a fault in the server
  * or the broker. Worse, on a multi-topic session it made an unreachable topic indistinguishable
  * from one that simply does not hold the id, so the session could be positioned from whichever
  * topics happened to answer.
  *
  * A malformed id is an INVALID ARGUMENT (the client sent something that is not a message id at
  * all); everything else that prevents an answer is a [[StartFromUnresolvableException]].
  */
def getMessageById(pulsarClient: PulsarClient, topicFqn: String, messageId: Array[Byte]): Option[PulsarMessage[Array[Byte]]] =
    val subscriptionName = s"dekaf_${java.util.UUID.randomUUID.toString}"

    val resolvedMessageId = Try(PulsarMessageId.fromByteArrayWithTopic(messageId, topicFqn)) match
        case Success(messageId) => messageId
        case Failure(err) =>
            throw new IllegalArgumentException(
                s"Start-from message id could not be read: it is not a Pulsar message id (${messageId.length} bytes). ${err.getMessage}",
                err
            )

    def unresolvable(what: String, err: Throwable): Nothing =
        throw StartFromUnresolvableException(
            s"Could not resolve the requested start-from position: $what failed for $topicFqn. ${err.getMessage}",
            err
        )

    val reader = Try {
        pulsarClient
            .newReader()
            .topic(topicFqn)
            .startMessageId(resolvedMessageId)
            .startMessageIdInclusive()
            .subscriptionName(subscriptionName)
            .create()
    } match
        case Success(reader)  => reader
        case Failure(err)     => unresolvable("opening a reader at the requested message id", err)

    try
        val hasMessage = Try(reader.hasMessageAvailable) match
            case Success(available) => available
            case Failure(err)       => unresolvable("asking whether the requested message id is still retained", err)

        if !hasMessage then None
        else
            Try(reader.readNext(5, java.util.concurrent.TimeUnit.SECONDS)) match
                // `readNext` answers with null when the wait ran out. The broker said the message
                // was there and then did not hand it over, which is a fault and not an absence.
                case Success(null)    => unresolvable("reading the message at the requested message id", new java.util.concurrent.TimeoutException("the read timed out after 5s"))
                case Success(message) => Option.when(message.getMessageId.toByteArray sameElements messageId)(message)
                case Failure(err)     => unresolvable("reading the message at the requested message id", err)
    finally Try(reader.close())

/** How ONE consumer is positioned for a Message-ID start-from, once the message has been found. */
enum MessageIdSeek:
    /** The exact message. Only the topic that OWNS the id can be positioned this way - a Pulsar
      * message id addresses a ledger and entry of one topic and means nothing in another. */
    case ById(messageId: PulsarMessageId)

    /** The message's publish INSTANT - the only position that exists across topics, and only
      * approximately the same place: everything published in that same millisecond is included. */
    case ByPublishTime(atMs: Long)

/** Where each of a session's consumers starts, for a start-from that names one message id.
  *
  * THE OWNING TOPIC IS SEEKED BY ID, EXACTLY. It used to be seeked by publish time along with every
  * other topic as soon as the session covered more than one, so "start from this message" silently
  * became "start from this millisecond" even on the topic the user picked the message from - and any
  * earlier message sharing that millisecond, or sharing its producer batch, came with it.
  *
  * EVERY OTHER TOPIC IS SEEKED BY PUBLISH TIME, and that is a real approximation rather than an
  * oversight: a message id is unique only within one topic, so there is no exact corresponding
  * position in the others. The instant is the closest thing that exists, and it is inclusive of
  * everything stamped with the same millisecond.
  *
  * PURE, so both halves are pinned without a broker. Two targets on the owning topic each have their
  * own consumer and both get the exact id.
  */
def messageIdSeeks[C](
    consumers: Vector[C],
    topicOf: C => String,
    ownerTopicFqn: String,
    messageId: PulsarMessageId,
    publishTime: Long
): Vector[(C, MessageIdSeek)] =
    consumers.map { consumer =>
        val seek =
            if topicOf(consumer) == ownerTopicFqn then MessageIdSeek.ById(messageId)
            else MessageIdSeek.ByPublishTime(publishTime)
        consumer -> seek
    }

def topicsToNonPartitionedTopic(pulsarAdmin: PulsarAdmin, topics: Vector[String]) =
    topics.flatMap { topicFqn =>
        getTopicPartitioning(pulsarAdmin, topicFqn).`type` match
            case TopicPartitioningType.NonPartitioned => Vector(topicFqn)
            case TopicPartitioningType.Partitioned    => getPartitions(pulsarAdmin, topicFqn)
    }

/** The one message a Message-ID start-from resolves to, looked up across the physical topics the
  * session covers.
  *
  * DISTINCT, and that is the whole point: a session's topic vector is the CONCATENATION of every
  * enabled target's resolved topics, and two targets may legitimately select the same topic - each
  * has its own consumer, filters and colouring. Looking the id up once per NAME rather than once
  * per physical topic read the same message twice and refused a valid session with "Multiple
  * messages found for the same message id". Every target's consumer is still seeked; only the
  * LOOKUP is deduplicated.
  *
  * Two GENUINELY different topics answering is still refused: a message id is only unique within
  * one topic, so there is no way to know which of them the user meant.
  *
  * PURE: the broker sits behind `lookup`, so the shapes that matter - nothing found, one found, the
  * same physical topic named twice, two genuinely different topics answering - are all testable
  * with a plain lambda.
  */
def resolveMessageIdAcrossTopics[M](topicFqns: Vector[String], lookup: String => Option[M]): Option[M] =
    topicFqns.distinct.flatMap(topicFqn => lookup(topicFqn)) match
        case Vector()    => None
        case Vector(msg) => Some(msg)
        case _           => throw new RuntimeException("Multiple messages found for the same message id")

/** The one message the id names, together with the topic that OWNS it - which is what lets that
  * topic be seeked exactly while the rest are seeked by publish time (see [[messageIdSeeks]]). */
def getMessageByIdMultiTopic(
    pulsarAdmin: PulsarAdmin,
    pulsarClient: PulsarClient,
    nonPartitionedTopicFqns: Vector[String],
    messageId: Array[Byte]
): Option[(String, PulsarMessage[Array[Byte]])] =
    resolveMessageIdAcrossTopics(
        nonPartitionedTopicFqns,
        topicFqn => getMessageById(pulsarClient, topicFqn, messageId).map(message => topicFqn -> message)
    )

/** Seek every consumer of a session to its start position, and report what the seek could not
  * express exactly: messages to discard from the head of a stream, and the global reordering the two
  * counting modes need on top.
  *
  * The two counting modes are EXACT under batching and across partitions, and both are GLOBAL: they
  * count the session's whole merged stream, ordered by publish time. Neither can be done with a seek
  * alone, because a seek only ever lands on an entry boundary - see [[StartFromDiscardPlan]].
  *
  * "EXACT" IS ABOUT THE COUNT WITHOUT QUALIFICATION, and about WHICH messages only as far as the
  * logs really are in publish-time order: publish time is stamped by the producer, and Pulsar
  * preserves append order within a partition rather than clock order. [[MessageOrderKey]] states
  * precisely what is and is not guaranteed, including that delivery SEQUENCE after a skip's cut is
  * the brokers' order rather than the global one.
  *
  *  - "Skip first n messages" ([[NthMessageAfterEarliest]]): seek everything to the very beginning,
  *    then drop the GLOBALLY-FIRST n by publish time across every physical topic and deliver the
  *    rest. On a single log that is exactly "start at message n+1" and costs nothing but a head-drop
  *    counter. Across partitions it is a streaming k-way merge over one held message per topic
  *    ([[GlobalSkipMerge]]) - the count is exactly n, the choice of WHICH n is exact as far as the
  *    logs are in publish-time order, and n is never buffered, because "skip first n" has
  *    deliberately no cap.
  *
  *  - "Latest n messages" ([[NthMessageBeforeLatest]]): ONE MERGED BACKWARD WALK over every
  *    physical topic's entry metadata ([[resolveLatestN]]) - take whichever topic's current entry
  *    was published latest, count its messages, step that topic back one entry, until n messages
  *    are accounted for. Each topic is then seeked to the oldest entry the walk took from it (or to
  *    LATEST if it contributed none), and the overshoot inside the single entry the walk stopped on
  *    is dropped from that topic's head. NOTHING IS BUFFERED and no delivered message takes part in
  *    the decision: the cut is known before the consumers are resumed. Memory is O(number of
  *    topics) and cost is O(n / batch size + topics) admin lookups. A session over p partitions
  *    shows exactly n messages and not n * p, and it starts showing them immediately rather than
  *    waiting for every partition to drain.
  *
  *  - "About % through the data" ([[ApproximateDataPosition]]): PER PHYSICAL TOPIC, and deliberately
  *    stays that way. The fraction is resolved against that topic's own entry count and seeked to,
  *    so a session 60% of the way into a 4-partition topic is 60% into each of the four logs, and a
  *    session over several enabled targets is 60% into every topic they resolve to. That is not the
  *    same position as "60% of the merged stream" unless the logs are the same size. Unlike the two
  *    counting modes it cannot be made global cheaply: a count of n can be reached by streaming n
  *    messages and stopping, whereas a FRACTION of the merged stream is only known once the whole of
  *    it has been measured, which is O(topic) at any n. Rounding, endpoints, why the position is
  *    only approximate, and empty topics: see [[resolveApproximateDataPosition]].
  *
  *  - "About % through the time range" ([[ApproximateTimePosition]]): PER LOGICAL TOPIC. The topic's
  *    partitions are pooled into one publish-time range - the earliest first message to the latest
  *    last message - and every partition is seeked to the single instant that fraction picks out of
  *    it. Still per topic and not per session: two enabled targets position against their own
  *    backlogs, not against a merged view. The seek is BY TIMESTAMP, so it rides the same broker
  *    path as [[DateTime]] and needs nothing new from the consumer. Endpoints, rounding, empty
  *    topics and a topic that occupies one instant: see [[resolveApproximateTimePosition]].
  *
  *    The two approximate modes answer different questions and that is the whole reason they are
  *    two: on a topic where almost everything arrived in the last hour of a 30-day retention, half
  *    the MESSAGES are behind you inside that last hour, while half the TIME is behind you fifteen
  *    days back.
  *
  * NON-PERSISTENT TOPICS keep nothing, so no history position exists on one. If EVERY topic the
  * session resolved to is non-persistent, a history mode is REJECTED up front (see
  * [[startFromRejectionReason]]) rather than degrading into a seek that silently means "from now".
  * A MIXED session is not rejected: the persistent topics get the position that was asked for and
  * the non-persistent ones are seeked to latest, which is the only position they have. One wrinkle
  * follows from that - "skip first n" counts the MERGED DELIVERED stream, so on a mixed session
  * anything the non-persistent topics deliver live counts towards its n as well. Such a topic holds
  * no backlog, so it never holds the merge up waiting for a head it will not produce. "Latest n"
  * counts stored entries instead of delivered messages, so a non-persistent topic contributes
  * nothing to its n and simply streams alongside the historical tail.
  */
def handleStartFrom(
    startFrom: ConsumerSessionStartFrom,
    consumers: Vector[Consumer[Array[Byte]]],
    adminClient: PulsarAdmin,
    pulsarClient: PulsarClient,
    nonPartitionedTopicFqns: Vector[String]
): StartFromPlan =
    // Before anything is resumed or seeked: a position that cannot exist on these topics is a
    // validation error, not something to discover halfway through seeking them.
    startFromRejectionReason(startFrom, nonPartitionedTopicFqns).foreach(reason => throw new IllegalArgumentException(reason))
    startFromCountRejectionReason(startFrom).foreach(reason => throw new IllegalArgumentException(reason))

    // The consumers STAY PAUSED for all of this. They used to be resumed here, which opened a
    // delivery window over every broker round trip below - the backward entry walk, reading each
    // topic's last message id - while the session was still being built: its counters and ordering
    // layer are armed by the caller AFTER this returns, and its message handler is still a no-op.
    // Whatever arrived in that window was therefore consumed by nobody, and a session could swallow
    // its own backlog and then deliver nothing. Seeking does not need a running consumer; pausing
    // only withholds flow permits.

    // Everything below positions the topics that HAVE a history. A non-persistent topic can only
    // start from now, whatever the session asked for.
    val (historyConsumers, liveOnlyConsumers) = splitByRetainedHistory(consumers, _.getTopic)
    // DISTINCT: two enabled targets may select the same topic, and the session's FQN vector is the
    // concatenation of what each resolved to. The CONSUMERS are deliberately not deduplicated -
    // every one of them still has to be seeked - but a topic that is asked ABOUT twice pushed the
    // single-topic fast path off (`size == 1`) and made the Message-ID lookup read one physical
    // message once per name.
    val historyTopicFqns = nonPartitionedTopicFqns.filterNot(isNonPersistentTopic).distinct
    liveOnlyConsumers.foreach(_.seek(PulsarMessageId.latest))

    // Resolving the streams costs one broker call per topic, so the gate is checked FIRST and the
    // layer is only built for a session that will actually use one.
    val isGlobal = needsGlobalOrdering(startFrom, consumers.size)
    lazy val globalOrdering: StartFromOrderingPlan =
        if isGlobal then globalOrderingPlanFor(startFrom, startFromStreamsAt(consumers)) else StartFromOrderingPlan.PassThrough

    val plan: StartFromPlan = startFrom match
        case _: EarliestMessage =>
            historyConsumers.foreach(_.seek(PulsarMessageId.earliest))
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)
        case _: LatestMessage =>
            historyConsumers.foreach(_.seek(PulsarMessageId.latest))
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)
        case v: NthMessageAfterEarliest =>
            // Seek + discard, NOT examineMessage. examineMessage is ENTRY-addressed and clamps past
            // the end without failing, so "skip 5" on a topic whose 100 messages are one batched
            // entry used to ask for entry 6, get the last entry, and skip fifty. Streaming n
            // messages and throwing them away is O(n) - and n is a number the user typed.
            historyConsumers.foreach(_.seek(PulsarMessageId.earliest))
            if isGlobal then
                // The merge owns the counter, so the listener must NOT also hold one: two counters
                // over the same messages would drop 2n. It is the progress source as well - the
                // number the client is shown is the merge's own budget draining.
                StartFromPlan(StartFromDiscardPlan.Nothing, globalOrdering)
            else if v.n > 0 then StartFromPlan(StartFromDiscardPlan.SharedTotal(v.n), StartFromOrderingPlan.PassThrough)
            else StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)

        case v: NthMessageBeforeLatest =>
            if v.n <= 0 then
                // "the last 0 messages" is nothing at all - the same position "Latest message" uses.
                historyConsumers.foreach(_.seek(PulsarMessageId.latest))
                StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)
            else
                // RESOLVE EVERY TOPIC BEFORE SEEKING ANY OF THEM - the same discipline both
                // approximate modes follow, and for the same reason: a broker that stops answering
                // half way through must not leave part of the session sitting at a position nobody
                // asked for.
                val cut = resolveLatestN(v.n, historyConsumers.map(_.getTopic).distinct, entryFromLatest(adminClient, _), latestNEntryIsOlder)
                // RETENTION RE-CHECK, after resolving and before any seek: see
                // [[latestNAnchorRejectionReason]]. Every topic verifies before any topic seeks -
                // the same all-or-nothing discipline the resolution itself follows.
                latestNAnchorRejectionReason(cut, earliestRetainedEntryId(adminClient, _), latestNEntryIsOlder)
                    .foreach(reason => throw StartFromUnresolvableException(reason, null))
                val discards = scala.collection.mutable.Map.empty[NonPartitionedTopicFqn, Long]
                historyConsumers.foreach { consumer =>
                    val topicFqn = consumer.getTopic
                    cut.getOrElse(topicFqn, LatestNSeek.Nothing) match
                        // Everything this topic holds is older than the cut. LATEST, not earliest:
                        // seeking a non-contributing partition to the beginning would show all of it.
                        case LatestNSeek.Nothing    => consumer.seek(PulsarMessageId.latest)
                        case LatestNSeek.Everything => consumer.seek(PulsarMessageId.earliest)
                        case LatestNSeek.FromEntry(entryId, discard) =>
                            consumer.seek(entryId)
                            if discard > 0 then discards(topicFqn) = discard
                }
                // A PER-TOPIC head-drop and never a session-wide one: this is the overshoot inside
                // the single entry the walk stopped on, not a skip the user asked for, so it must
                // not be reported as progress. Two targets on that topic each drop their own copy.
                StartFromPlan(StartFromDiscardPlan.PerTopic(discards.toMap), StartFromOrderingPlan.PassThrough)
        case v: MessageId =>
            if getIsSingleNonPartitionedTopic(adminClient, historyTopicFqns) then
                val messageId = MessageId.toPulsar(v).getOrElse(throw new RuntimeException(s"Failed to parse message ID."))

                val topicFqn = historyTopicFqns.head

                getMessageById(pulsarClient, topicFqn, messageId.toByteArray) match
                    case Some(message) => historyConsumers.foreach(_.seek(message.getMessageId))
                    case None          => throw new RuntimeException(s"Message with such ID not found in the topic: $topicFqn.")
            else
                getMessageByIdMultiTopic(adminClient, pulsarClient, historyTopicFqns, v.messageIdBytes) match
                    case Some((ownerTopicFqn, message)) =>
                        // The topic the id belongs to gets the EXACT message; the others get the
                        // instant it was published at, which is the only cross-topic position a
                        // message id has. See [[messageIdSeeks]].
                        messageIdSeeks(historyConsumers, _.getTopic, ownerTopicFqn, message.getMessageId, message.getPublishTime)
                            .foreach { (consumer, seekTo) =>
                                seekTo match
                                    case MessageIdSeek.ById(messageId)     => consumer.seek(messageId)
                                    case MessageIdSeek.ByPublishTime(atMs) => consumer.seek(atMs)
                            }
                    case None => throw new RuntimeException(s"Message with such ID not found.")
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)
        case v: DateTime =>
            val timestamp = v.dateTime.toEpochMilli
            historyConsumers.foreach(_.seek(timestamp))
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)
        case v: RelativeDateTime =>
            // Resolve ONCE, outside the loop: evaluating now() per consumer seeks each partition of
            // a multi-topic session to a slightly different boundary.
            val startAt = resolveRelativeDateTime(v, ZonedDateTime.now()).toInstant.toEpochMilli
            historyConsumers.foreach(_.seek(startAt))
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)

        case v: ApproximateDataPosition =>
            // Resolve EVERY topic before seeking any of them: a rejected fraction, or a broker that
            // will not answer, must not leave half the session sitting at a position nobody asked
            // for. Two admin calls per physical topic, both O(1) in the size of the topic (three
            // when the recheck below fires).
            val positions = historyConsumers.map { consumer =>
                val topicFqn = consumer.getTopic
                val seekTo = resolveApproximateDataPosition(v.fraction, retainedEntryCount(adminClient, topicFqn)) match
                    case ApproximateDataSeek.Earliest => PulsarMessageId.earliest
                    case ApproximateDataSeek.Latest   => PulsarMessageId.latest
                    case ApproximateDataSeek.Entry(entryOrdinal) =>
                        // The entry count and the examine are two calls, and retention can trim
                        // BETWEEN them. `examineMessage(earliest, k)` past the current end silently
                        // CLAMPS TO THE NEWEST entry - the exact opposite of the contract, which
                        // promises the earliest fallback when the position is gone. The recheck
                        // makes the trim detectable: a count now smaller than the ordinal means
                        // the answer in hand is the clamp, not the position.
                        entryFromEarliest(adminClient, topicFqn)(entryOrdinal) match
                            case None => PulsarMessageId.earliest
                            case Some(answer) =>
                                if retainedEntryCount(adminClient, topicFqn) < entryOrdinal then PulsarMessageId.earliest
                                else answer
                consumer -> seekTo
            }
            positions.foreach((consumer, seekTo) => consumer.seek(seekTo))
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)

        case v: ApproximateTimePosition =>
            // ONE position per LOGICAL topic, so a partitioned topic is a single time range rather
            // than one range per partition. The lookup is memoised across the group because two
            // enabled targets may deliver the same physical topic through separate consumers, and
            // the broker must not be asked the same question twice.
            val spans = scala.collection.mutable.Map.empty[String, Option[TopicTimeSpan]]
            def spanOf(topicFqn: String): Option[TopicTimeSpan] =
                spans.getOrElseUpdate(topicFqn, publishTimeSpan(adminClient, topicFqn))

            // Same resolve-then-seek discipline as the data mode above, and for the same reason.
            val seeksByTopic = historyConsumers
                .map(_.getTopic)
                .distinct
                .groupBy(logicalTopicOf)
                .view
                .mapValues(partitionFqns => resolveApproximateTimePosition(v.fraction, partitionFqns, spanOf))
                .toMap

            historyConsumers.foreach { consumer =>
                seeksByTopic(logicalTopicOf(consumer.getTopic)) match
                    case ApproximateTimeSeek.Earliest        => consumer.seek(PulsarMessageId.earliest)
                    case ApproximateTimeSeek.Timestamp(atMs) => consumer.seek(atMs)
            }
            StartFromPlan(StartFromDiscardPlan.Nothing, StartFromOrderingPlan.PassThrough)

    // Belt and braces: they should never have been resumed, and the caller resumes them itself.
    consumers.foreach(_.pause())
    plan
