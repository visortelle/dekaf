package features.consumersession

import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

/** CHUNKING through the consumer session - the exact dual of the batching blind spot this suite
  * was rebuilt around. Batching packs MANY messages into ONE broker entry; chunking spreads ONE
  * message across MANY entries. `PulsarAdmin.examineMessage` counts entries either way, the
  * counting Start-From modes promise MESSAGES ("Skip first n messages", "Latest n messages"), and
  * until this spec no fixture ever produced a chunked message - so a chunk-unaware entry walk was
  * structurally unobservable, exactly as the entry-vs-message defect was before `produceBatched`.
  *
  * The broker facts underneath (the message really is several entries; a chunk-capable consumer
  * reassembles it) are pinned in `harness.MessageShapeFixtureSpec` SHAPE-1. Here the whole
  * pipeline is under test: the session's consumer, the start-from resolution, the gRPC stream and
  * the table must all treat the reassembled message as ONE message - in rendering, in counting,
  * and where counting is IMPOSSIBLE, in refusing.
  *
  * THE TWO COUNTED MODES END UP IN DIFFERENT PLACES, and that asymmetry is the point of the spec:
  *   - "Skip first n messages" counts what the consumer DELIVERS, and a chunk-capable consumer
  *     delivers a reassembled message once - so it stays exact on chunked data (CS-CHK-2);
  *   - "Latest n messages" counts stored ENTRIES walking backwards, and on chunked data an entry
  *     count is not a message count in either direction, so the server REFUSES rather than
  *     answering with a set nobody asked for (CS-CHK-3). The refusal is
  *     `handleStartFrom.isChunkPiece` / `logEntryOf` and it is unit-pinned in
  *     `markerEntriesTest`; what only a browser can show is that it reaches the USER instead of
  *     becoming a silently wrong session.
  *
  * All three tests are single-topic and single-stream, so no delivery-order layer is involved and
  * none is pinned.
  */
class CsChunkingSpec extends StartFromSupport:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def count(ms: Int) = new LocatorAssertions.HasCountOptions().setTimeout(ms.toDouble)

  /** SMALL ON PURPOSE, in both dimensions.
    *
    * 90 payload bytes at 32 bytes per chunk is 3 broker entries - the same shape a megabyte at the
    * default chunk size has, and the shape the assertions need. It is small because the value
    * column renders `limitString(value, 100)`: a 40 KiB payload (what this spec used to produce)
    * reaches the table as a 100-character prefix plus an ellipsis, and so does a TORN fragment of
    * it - the exact defect CS-CHK-1 exists to catch would have rendered identically to the correct
    * result and passed. At 90 characters the whole value renders (92 with the JSON quotes, inside
    * the 100 limit), so the assertion really does discriminate an intact message from a 32-byte
    * fragment.
    *
    * VERIFIED against Pulsar 3.2.1 on a throwaway topic: a 90-byte value with
    * `chunkMaxMessageSize = 32` becomes exactly 3 entries carrying `num_chunks_from_msg = 3` and
    * chunk ids 0, 1, 2, and a reader reassembles them into ONE message equal to the value, with
    * nothing following it. `produceChunked` asserts the entry count itself and throws if the data
    * did not chunk, so a fixture that silently degraded could not make these tests vacuous. */
  private val ChunkBytes = 32
  private val chunkedValue = "chunk-" + "x" * 84

  /** m-01, m-02, CHUNKED, m-04, m-05 - five messages in 2 + 3 + 2 = 7 broker entries, so message
    * positions and entry positions cannot coincide anywhere past m-02. Returns (t, ns, topic). */
  private def arrangeAroundChunk(): (String, String, String) =
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceUnbatched(fqn, Seq("m-01", "m-02"))
    val chunks = fixtures.produceChunked(fqn, chunkedValue, chunkBytes = ChunkBytes)
    fixtures.produceUnbatched(fqn, Seq("m-04", "m-05"))
    // The arrangement premise, restated against the broker: 4 plain entries + the chunk entries.
    val entries = fixtures.numberOfEntries(fqn)
    assert(entries == 4 + chunks, s"expected ${4 + chunks} entries around the chunked message, got $entries")
    assert(chunks == 3, s"the arrangement assumes 3 chunk entries, got $chunks")
    (t, ns, topic)

  test("CS-CHK-1: a chunked message arrives INTACT and renders as ONE row, not one per chunk") {
    // What fails here [phase-2 bite-check - needs the running app]: a session consumer that
    // surfaced chunks as rows shows 7 rows and a counter of 7 (fails the counter leg); a decode
    // that tears or truncates the payload delivers a 32-byte fragment where the exact set expects
    // all 90 characters, which is visible now that the value fits inside the cell's 100-character
    // render limit.
    val (t, ns, topic) = arrangeAroundChunk()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, Seq("m-01", "m-02", chunkedValue, "m-04", "m-05"))
  }

  test("CS-CHK-2: Skip first n counts a chunked message as ONE message, not as its entries") {
    // Skip 3 MESSAGES of [m-01, m-02, CHUNKED, m-04, m-05] leaves exactly {m-04, m-05}. An
    // entry-addressed skip of 3 cuts INSIDE the chunked message (the first three entries are
    // m-01, m-02 and chunk 1 of 3) and either delivers the chunked message too or a torn
    // fragment of it - both fail the exact set. This mode stays EXACT on chunked data because it
    // counts what the consumer delivers, which is the reassembled message, once.
    // [phase-2 bite-check - needs the running app]
    val (t, ns, topic) = arrangeAroundChunk()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("3")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, Seq("m-04", "m-05"))
  }

  test("CS-CHK-3: Latest n REFUSES when its backward walk reaches a chunk, and shows nothing instead") {
    // THE CORRECTED EXPECTATION. This test used to assert that Latest-3 delivered exactly
    // {CHUNKED, m-04, m-05} - written on the assumption that the start-from code is chunk-UNAWARE
    // and ought to be taught to count chunked messages as one. It is not unaware, and it cannot
    // be taught that: the walk reads ENTRY metadata, and on a chunked topic entries and messages
    // have no fixed relationship in either direction, so there is no count to substitute. It
    // therefore REFUSES, and refusing is the correct behavior - the wrong answer it declines to
    // give is exactly the one the old assertion demanded be accepted.
    //
    // The walk is what triggers it, so the refusal is precise rather than topic-wide: from the end
    // the entries are m-05, m-04, chunk 3, chunk 2, chunk 1, m-02, m-01, so a request for 3
    // messages MUST step onto chunk 3 (the second leg below pins the other side of that boundary).
    //
    // [phase-2 bite-check - needs the running app. A walk that silently counted chunk entries
    // would leave the session `running` with rows on screen and no error, failing all three
    // assertions here; a refusal that never reached the browser would fail the first.]
    val (t, ns, topic) = arrangeAroundChunk()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("3")
    cs.play()

    // The server's own words, surfaced by `notifyError` - the same path CS-FC-3/4's creation-time
    // refusals take. Matched on the phrase that names the cause, not on the whole sentence.
    val refusal = page.getByText(
      java.util.regex.Pattern.compile("stores CHUNKED messages", java.util.regex.Pattern.CASE_INSENSITIVE)
    ).first()
    assertThat(refusal).isVisible(vis(15000))

    // AND NOT A WRONG SET. A create that was refused leaves nothing running, so the session falls
    // back to `new` and no row is ever rendered - the observable difference between "declined" and
    // "answered with the last three entries".
    cs.assertState("new")
    assertThat(cs.messages).hasCount(0, count(5000))

    // The remedy the refusal names works on the very same topic: 'Skip first n messages' counts
    // what is delivered, so it stays exact where the entry walk could not be.
    cs.setStartFrom("Skip first n messages")
    cs.startFromN.fill("3")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, Seq("m-04", "m-05"))
  }

  test("CS-CHK-4: Latest n still answers when its walk stops SHORT of the chunk") {
    // The other side of CS-CHK-3's boundary, and what keeps that refusal honest: the walk refuses
    // when it actually reaches a chunk entry, not because the topic once stored one. The last 2
    // messages are m-04 and m-05, the last 2 entries, and the walk stops before chunk 3 - so this
    // is a correct answer and must be delivered, not refused. Without this leg, a walk that
    // refused every topic containing any chunked message would still pass CS-CHK-3.
    // [phase-2 bite-check - needs the running app]
    val (t, ns, topic) = arrangeAroundChunk()

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Latest n messages")
    cs.startFromN.fill("2")
    cs.play()
    cs.assertState("running")
    assertLoadedExactlyWithCounter(cs, Seq("m-04", "m-05"))
  }
