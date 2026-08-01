package consumer.session_runner

import zio.test.*
import zio.test.Assertion.*
import org.apache.pulsar.client.impl.{BatchMessageIdImpl, MessageIdImpl}

/** The per-topic debug view's arithmetic and its refusals.
  *
  * Every case here is one the broker actually produces - the open-ledger hole is measured, the empty
  * topic and the non-persistent refusal are the failure modes `startFromLookups` already classifies,
  * and the backwards range is what a producer clock that stepped back leaves behind. The point of
  * the suite is that each of them reports NOTHING rather than a plausible-looking zero.
  */
object topicPositionsTest extends ZIOSpecDefault:

    private def msgId(ledger: Long, entry: Long) = MessageIdImpl(ledger, entry, -1)
    private def endpoint(publishTime: Long, ledger: Long = 1, entry: Long = 0) =
        LogEndpoint(msgId(ledger, entry), publishTime)
    private def cursorAt(publishTime: Long, ledger: Long = 1, entry: Long = 0) =
        TopicCursor(msgId(ledger, entry), publishTime)

    private val inputs = TopicPositionInputs(
        topicFqn = "persistent://t/n/topic",
        first = None,
        last = None,
        cursor = None,
        ledgers = Vector.empty,
        currentLedgerEntries = 0,
        retainedEntries = 0,
        unavailableReason = None
    )

    def spec = suite("topicPositions")(
        suite("the open-ledger hole")(
            test("the CURRENT ledger's real entry count is used where the list reports zero") {
                // Measured on a live 6060-entry topic: the one open ledger reports entries 0 while
                // currentLedgerEntries holds 6060. Walking the list as reported puts every cursor in
                // that ledger at ordinal 1 - "0% through" for the whole life of the ledger.
                val patched = retainedLedgerSpans(Vector(LedgerSpan(7057, 0)), currentLedgerEntries = 6060)
                assertTrue(patched == Vector(LedgerSpan(7057, 6060)))
            },
            test("a CLOSED ledger reporting zero in the middle of the list is left alone") {
                val ledgers = Vector(LedgerSpan(1, 0), LedgerSpan(2, 50), LedgerSpan(3, 0))
                val patched = retainedLedgerSpans(ledgers, currentLedgerEntries = 7)
                // Only the last is patched; the leading zero is somebody else's business.
                assertTrue(patched == Vector(LedgerSpan(1, 0), LedgerSpan(2, 50), LedgerSpan(3, 7)))
            },
            test("a last ledger that already reports entries is NOT overwritten") {
                val ledgers = Vector(LedgerSpan(1, 10), LedgerSpan(2, 20))
                assertTrue(retainedLedgerSpans(ledgers, currentLedgerEntries = 999) == ledgers)
            },
            test("an empty ledger list stays empty rather than growing a phantom ledger") {
                assertTrue(retainedLedgerSpans(Vector.empty, currentLedgerEntries = 500).isEmpty)
            }
        ),
        suite("entry ordinal")(
            test("counts every entry in the ledgers BEFORE the cursor's own, and is 1-based") {
                val ledgers = Vector(LedgerSpan(1, 100), LedgerSpan(2, 50), LedgerSpan(3, 10))
                // Entry 0 of ledger 2 is the 101st retained entry.
                assertTrue(entryOrdinalOf(ledgers, 2, 0).contains(101L)) &&
                assertTrue(entryOrdinalOf(ledgers, 2, 49).contains(150L)) &&
                assertTrue(entryOrdinalOf(ledgers, 1, 0).contains(1L)) &&
                assertTrue(entryOrdinalOf(ledgers, 3, 9).contains(160L))
            },
            test("a cursor whose ledger has AGED OUT reports nothing, not the beginning") {
                // Retention trimmed ledger 1 from under a session that had read it. Answering 1, or
                // 0%, would claim the session is at the start when it is in fact past it.
                val ledgers = Vector(LedgerSpan(2, 50), LedgerSpan(3, 10))
                assertTrue(entryOrdinalOf(ledgers, 1, 5).isEmpty)
            }
        ),
        suite("time fraction")(
            test("places the cursor proportionally between the endpoints") {
                val f = cursorTimeFractionOf(Some(endpoint(1000)), Some(endpoint(2000)), Some(cursorAt(1500)))
                assertTrue(f.contains(0.5))
            },
            test("a topic occupying ONE INSTANT has no interior, so no fraction describes it") {
                // first == last: no position separates the messages. 0.0 and 1.0 would both be
                // inventions - the same rule ApproximateTimePosition follows.
                val f = cursorTimeFractionOf(Some(endpoint(1000)), Some(endpoint(1000)), Some(cursorAt(1000)))
                assertTrue(f.isEmpty)
            },
            test("a range reported BACKWARDS is refused rather than turned into a negative fraction") {
                // Publish time is stamped by the producer, so a clock that stepped back produces it.
                val f = cursorTimeFractionOf(Some(endpoint(2000)), Some(endpoint(1000)), Some(cursorAt(1500)))
                assertTrue(f.isEmpty)
            },
            test("a cursor PAST the recorded end clamps to 1.0 - a stale denominator, not an overrun") {
                // The endpoints and the cursor are not read atomically: a message published between
                // the two lookups leaves the cursor beyond the last entry that was recorded.
                val f = cursorTimeFractionOf(Some(endpoint(1000)), Some(endpoint(2000)), Some(cursorAt(9999)))
                assertTrue(f.contains(1.0))
            },
            test("no cursor and no endpoints each yield nothing") {
                assertTrue(cursorTimeFractionOf(Some(endpoint(1000)), Some(endpoint(2000)), None).isEmpty) &&
                assertTrue(cursorTimeFractionOf(None, Some(endpoint(2000)), Some(cursorAt(1500))).isEmpty) &&
                assertTrue(cursorTimeFractionOf(Some(endpoint(1000)), None, Some(cursorAt(1500))).isEmpty)
            }
        ),
        suite("entry fraction")(
            test("is the ordinal over the retained count") {
                assertTrue(cursorEntryFractionOf(Some(50L), 100L).contains(0.5))
            },
            test("the BOUNDARIES read as proportion CONSUMED: first of N is 1/N, last is 1.0, a single entry is 1.0") {
                // The contract the proto states: a cursor exists only once something was consumed,
                // so there is no 0.0 with a cursor present - sitting ON the first of 100 entries
                // means one entry consumed, 1%. A one-entry topic is fully consumed by its first
                // read. Pinned here so a future switch to geometric position (ordinal-1 over N)
                // has to change the contract on purpose, in both places.
                assertTrue(cursorEntryFractionOf(Some(1L), 100L).contains(0.01)) &&
                assertTrue(cursorEntryFractionOf(Some(100L), 100L).contains(1.0)) &&
                assertTrue(cursorEntryFractionOf(Some(1L), 1L).contains(1.0))
            },
            test("a topic retaining NOTHING has no denominator, and 0/0 is not 0%") {
                assertTrue(cursorEntryFractionOf(Some(1L), 0L).isEmpty)
            },
            test("clamps rather than exceeding 1.0 when the count is staler than the cursor") {
                assertTrue(cursorEntryFractionOf(Some(150L), 100L).contains(1.0))
            }
        ),
        suite("batch ids")(
            test("two messages of ONE BATCH share the entry, so they share the ordinal") {
                // The ordinal walk is entry-addressed. A batch index is a third coordinate inside the
                // entry and must not shift the count.
                val ledgers = Vector(LedgerSpan(1, 100))
                val first = BatchMessageIdImpl(1, 7, -1, 0)
                val fifth = BatchMessageIdImpl(1, 7, -1, 4)
                val rowOf = (id: org.apache.pulsar.client.api.MessageId) =>
                    buildTopicPositionRow(
                        inputs.copy(
                            cursor = Some(TopicCursor(id, 1500)),
                            ledgers = ledgers,
                            retainedEntries = 100
                        )
                    ).cursorEntryOrdinal
                assertTrue(rowOf(first) == rowOf(fifth)) && assertTrue(rowOf(first).contains(8L))
            }
        ),
        suite("assembled rows")(
            test("an EMPTY topic reports no endpoints and no reason - it answered, with nothing in it") {
                val row = buildTopicPositionRow(inputs)
                assertTrue(row.first.isEmpty) && assertTrue(row.last.isEmpty) &&
                assertTrue(row.unavailableReason.isEmpty) &&
                assertTrue(row.cursorTimeFraction.isEmpty) && assertTrue(row.cursorEntryFraction.isEmpty)
            },
            test("an UNAVAILABLE topic reports a reason and withholds the entry count") {
                // A non-persistent topic: Pulsar refuses to examine it (405). Its retained count is 0
                // only because nothing filled it in, and a "0 entries" cell reads as an empty topic.
                val row = buildTopicPositionRow(inputs.copy(unavailableReason = Some("non-persistent topic")))
                assertTrue(row.unavailableReason.contains("non-persistent topic")) &&
                assertTrue(row.retainedEntries.isEmpty)
            },
            test("a fully populated row carries both fractions and the ordinal") {
                val row = buildTopicPositionRow(
                    inputs.copy(
                        first = Some(endpoint(1000, ledger = 1, entry = 0)),
                        last = Some(endpoint(2000, ledger = 1, entry = 99)),
                        cursor = Some(cursorAt(1500, ledger = 1, entry = 49)),
                        ledgers = Vector(LedgerSpan(1, 0)),
                        currentLedgerEntries = 100,
                        retainedEntries = 100
                    )
                )
                assertTrue(row.cursorTimeFraction.contains(0.5)) &&
                assertTrue(row.cursorEntryOrdinal.contains(50L)) &&
                assertTrue(row.cursorEntryFraction.contains(0.5)) &&
                assertTrue(row.retainedEntries.contains(100L))
            }
        )
    )
