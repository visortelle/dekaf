package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat

/** The Topic Positions tab: the per-topic debug view in the Tools panel.
  *
  * WHAT ONLY AN END-TO-END TEST CAN SEE HERE. The server suite pins the arithmetic and the cursor
  * bookkeeping against plain values; the jest suite pins the row model against a hand-built
  * protobuf. Neither can tell whether the numbers a REAL broker produces survive the whole path -
  * whether the entry counts add up to what was actually published, and whether a figure the server
  * genuinely does not know arrives as a blank cell rather than as a confident 0%.
  *
  * POLLING IS GATED BY THE TAB ITSELF: opening it is the request, and only the tab on screen pays
  * the per-partition broker cost (the jest suite pins the hidden-tab half). The session records
  * its read position unconditionally either way, so the tab shows the full truth whenever it is
  * opened - there is nothing to remember to turn on first.
  */
class CsTopicPositionsSpec extends DekafSuite:

  /** Count the real grpc-web calls without delaying or replacing them. The script is installed
    * before navigation because a page evaluation would be discarded by the navigation itself. */
  private def installTopicPositionsRequestCounter(): Unit =
    context.addInitScript(
      """(() => {
        |  const marker = 'ConsumerService/GetTopicPositions';
        |  const openOrig = XMLHttpRequest.prototype.open;
        |  const sendOrig = XMLHttpRequest.prototype.send;
        |  XMLHttpRequest.prototype.open = function (method, url) {
        |    this.__isTopicPositionsRequest = String(url).indexOf(marker) !== -1;
        |    return openOrig.apply(this, arguments);
        |  };
        |  XMLHttpRequest.prototype.send = function () {
        |    if (this.__isTopicPositionsRequest) {
        |      window.__topicPositionsRequestCount = (window.__topicPositionsRequestCount || 0) + 1;
        |    }
        |    return sendOrig.apply(this, arguments);
        |  };
        |})();""".stripMargin
    )

  private def topicPositionsRequestCount: Int =
    page.evaluate("() => window.__topicPositionsRequestCount || 0") match
      case n: Number => n.intValue()
      case value     => throw new AssertionError(s"Topic Positions request counter is not numeric: $value")

  test("CS-TP-1: before the session is started the tab says so - no table, no raw server error") {
    // The tab is reachable the moment the page loads, so opening it before Play is the ORDINARY
    // case. Nothing exists to ask about yet: no poll is armed (the jest suite pins the zero-RPC
    // half), so no FAILED_PRECONDITION can reach the screen and the generated session name cannot
    // leak at the one moment the user has done nothing wrong.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 10)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()

    val tools = ToolsPanel(page)
    assertThat(tools.topicPositionsTab).isVisible()
    tools.topicPositionsTab.click()

    assertThat(tools.topicPositionsNotStarted).isVisible()
    assertThat(tools.topicPositionsTable).not().isVisible()
    assertThat(tools.topicPositionsError).not().isVisible()
    // The internal session name must not reach the screen.
    assertThat(page.getByText("__dekaf_")).not().isVisible()
  }

  test("CS-TP-2: first and last consumed are tracked before Topic Positions is opened") {
    // Read the broker's real ids before starting Dekaf. They are the end-to-end oracle: a unit
    // fixture cannot prove the id survived Pulsar -> listener bookkeeping -> protobuf -> browser.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val topicFqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(topicFqn, 5)
    val retained = fixtures.readAllMessages(topicFqn)
    val expectedFirst = fixtures.messageIdHex(retained.head.getMessageId)
    val expectedLast = fixtures.messageIdHex(retained.last.getMessageId)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.closeTools()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(5)
    // More tools is deliberately closed before consumption. Listener-side history must not depend on the
    // expensive broker-inspection tab having mounted or polled while consumption happened.

    cs.openTools()
    val tools = ToolsPanel(page)
    assertThat(tools.topicPositionsCell(topicFqn, TopicPositionsColumn.FirstConsumedId)).hasText(expectedFirst)
    assertThat(tools.topicPositionsCell(topicFqn, TopicPositionsColumn.LastConsumedId)).hasText(expectedLast)

    val cells = tools.topicPositionsCells(topicFqn)
    assert(cells(TopicPositionsColumn.FirstConsumedPublished).trim != "-",
      s"first consumed published time should be known, got '${cells(TopicPositionsColumn.FirstConsumedPublished)}'")
    assert(cells(TopicPositionsColumn.LastConsumedPublished).trim != "-",
      s"last consumed published time should be known, got '${cells(TopicPositionsColumn.LastConsumedPublished)}'")
  }

  test("CS-TP-3: a running session reports each partition, and the entry counts ADD UP") {
    // The arithmetic check that only a real broker can settle: three partitions, 30 messages, and
    // the per-partition entry totals must sum to exactly what was published.
    val (t, ns, topic, topicFqn) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.PersistentPartitioned)
    fixtures.produceStrings(topicFqn, 30)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.closeTools()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(30)
    cs.openTools()

    val tools = ToolsPanel(page)
    tools.topicPositionsTab.click()

    val partitions = (0 until 3).map(i => s"$topicFqn-partition-$i")
    partitions.foreach(p => assertThat(tools.topicPositionsRow(p)).isVisible())

    // WAIT for a settled frame first: the table refreshes once a second, and the frame on screen
    // when the tab opens can legally predate the last messages read - parsing its '-' cells would
    // test the refresh cycle's phase, not the arithmetic.
    assertThat(tools.topicPositionsRow("All topics")).containsText("30 / 30")

    // "ordinal / total" in the RETAINED ENTRY POSITION column; the denominators are what must
    // reconcile with the number published.
    val totals = partitions.map { p =>
      val cells = tools.topicPositionsCells(p)
      assert(cells(TopicPositionsColumn.FirstConsumedId).trim != "-",
        s"$p should report its first consumed id after reading with the tab closed")
      assert(cells(TopicPositionsColumn.FirstConsumedPublished).trim != "-",
        s"$p should report its first consumed publish time after reading with the tab closed")
      assert(cells(TopicPositionsColumn.LastConsumedId).trim != "-",
        s"$p should report its last consumed id after reading with the tab closed")
      assert(cells(TopicPositionsColumn.LastConsumedPublished).trim != "-",
        s"$p should report its last consumed publish time after reading with the tab closed")
      cells(TopicPositionsColumn.RetainedEntryPosition).split('/').last.trim.replace(",", "").toInt
    }
    assert(
      totals.sum == 30,
      s"per-partition entry totals ${totals.mkString(" + ")} = ${totals.sum}, but 30 messages were published to $topicFqn"
    )

    // The ALL TOPICS row sums what the per-partition rows show - the whole session, one line.
    val aggregate = tools.topicPositionsCells("All topics")
    assert(aggregate(TopicPositionsColumn.RetainedEntryPosition).replace(",", "").contains("30 / 30"),
      s"aggregate retained entry position should be 30 / 30, got '${aggregate(TopicPositionsColumn.RetainedEntryPosition)}'")
    assert(aggregate(TopicPositionsColumn.EntriesAfterCursor).trim == "0",
      s"aggregate entries after cursor should be 0, got '${aggregate(TopicPositionsColumn.EntriesAfterCursor)}'")
    // Message ids from independent partition logs cannot be combined honestly, but their publish
    // time envelope can: earliest first-consumed and latest last-consumed.
    assert(aggregate(TopicPositionsColumn.FirstConsumedId).trim == "-",
      s"aggregate first consumed id should be blank, got '${aggregate(TopicPositionsColumn.FirstConsumedId)}'")
    assert(aggregate(TopicPositionsColumn.LastConsumedId).trim == "-",
      s"aggregate last consumed id should be blank, got '${aggregate(TopicPositionsColumn.LastConsumedId)}'")
    assert(aggregate(TopicPositionsColumn.FirstConsumedPublished).trim != "-",
      s"aggregate first consumed published time should be known")
    assert(aggregate(TopicPositionsColumn.LastConsumedPublished).trim != "-",
      s"aggregate last consumed published time should be known")
  }

  test("CS-TP-4: a figure the server does not know is BLANK, not 0%") {
    // The distinction the whole view rests on. Starting at LATEST on a topic nobody is producing to
    // means the session has read nothing, so it has no position - while the topic itself still has
    // a first and a last message. Rendering the unknown as 0% would claim the session sits at the
    // BEGINNING of the topic when it is in fact parked at the end.
    val (t, ns, topic) = fixtures.freshTopicParts()
    val topicFqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(topicFqn, 10)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Latest message")
    cs.play()
    cs.openTools()

    val tools = ToolsPanel(page)
    tools.topicPositionsTab.click()
    assertThat(tools.topicPositionsRow(topicFqn)).isVisible()

    val cells = tools.topicPositionsCells(topicFqn)
    // The topic's own endpoints ARE known.
    assert(cells(TopicPositionsColumn.OldestRetainedId).trim.nonEmpty && cells(TopicPositionsColumn.OldestRetainedId).trim != "-",
      s"oldest retained message id should be known, got '${cells(TopicPositionsColumn.OldestRetainedId)}'")
    assert(
      cells(TopicPositionsColumn.NewestRetainedPublished).trim.nonEmpty &&
        cells(TopicPositionsColumn.NewestRetainedPublished).trim != "-",
      s"newest retained published time should be known, got '${cells(TopicPositionsColumn.NewestRetainedPublished)}'")
    // The session has consumed nothing - neither bound nor progress may be invented.
    assert(cells(TopicPositionsColumn.FirstConsumedId).trim == "-",
      s"first consumed id should be blank before anything is read, got '${cells(TopicPositionsColumn.FirstConsumedId)}'")
    assert(cells(TopicPositionsColumn.FirstConsumedPublished).trim == "-",
      s"first consumed published should be blank before anything is read, got '${cells(TopicPositionsColumn.FirstConsumedPublished)}'")
    assert(cells(TopicPositionsColumn.LastConsumedId).trim == "-",
      s"last consumed id should be blank before anything is read, got '${cells(TopicPositionsColumn.LastConsumedId)}'")
    assert(cells(TopicPositionsColumn.LastConsumedPublished).trim == "-",
      s"last consumed published should be blank before anything is read, got '${cells(TopicPositionsColumn.LastConsumedPublished)}'")
    assert(cells(TopicPositionsColumn.PublishTimeLag).trim == "-",
      s"publish-time lag should be blank without a cursor, got '${cells(TopicPositionsColumn.PublishTimeLag)}'")
    assert(cells(TopicPositionsColumn.PublishTimeFraction).trim == "-",
      s"publish-time position should be blank, got '${cells(TopicPositionsColumn.PublishTimeFraction)}'")
    assert(cells(TopicPositionsColumn.EntryPositionFraction).trim == "-",
      s"stored entry position percentage should be blank, got '${cells(TopicPositionsColumn.EntryPositionFraction)}'")
  }

  test("CS-TP-5: polling runs only while Topic Positions is visible") {
    installTopicPositionsRequestCounter()
    val (t, ns, topic) = fixtures.freshTopicParts()
    val topicFqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(topicFqn, 2)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.closeTools()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(2)

    // Topic Positions is the default tab internally, but the closed Tools panel is also a
    // visibility gate. Starting and consuming must not silently arm its broker-heavy poller.
    page.waitForTimeout(2200)
    assert(topicPositionsRequestCount == 0,
      s"Topic Positions made $topicPositionsRequestCount request(s) while Tools was closed")

    cs.openTools()
    val tools = ToolsPanel(page)
    assertThat(tools.topicPositionsRow(topicFqn)).isVisible()
    val openedCount = topicPositionsRequestCount
    assert(openedCount > 0, "opening Topic Positions did not make its initial request")
    // A visible tab keeps polling - the contract in this cell's title. The window is deliberately
    // GENEROUS and pins no cadence: the Table asks for 1000ms, but SWR floors the effective period
    // at its dedupingInterval (2000ms by default), so refreshes actually land every ~2s. Measured
    // on 2026-08-09 (samples at 500ms: first refresh at ~2.5-3s, then 5s, 7s, 9s), which is why the
    // old fixed 2200ms wait failed deterministically - it expired just before the first refresh.
    harness.Eventually.eventually(timeoutMs = 8000, intervalMs = 250) {
      assert(topicPositionsRequestCount > openedCount,
        s"visible Topic Positions did not refresh: request count stayed at $openedCount")
    }

    // Switching tabs unmounts the Table poller. Give the state transition a moment, then observe
    // more than two refresh intervals: no NEW request may start (an already-issued response may
    // still finish, which is harmless and deliberately not confused with another request here).
    tools.produceTab.click()
    assertThat(tools.produceSend).isVisible()
    page.waitForTimeout(150)
    val hiddenTabCount = topicPositionsRequestCount
    page.waitForTimeout(2200)
    assert(topicPositionsRequestCount == hiddenTabCount,
      s"Topic Positions kept polling behind Produce: $hiddenTabCount -> $topicPositionsRequestCount")

    // Reopening proves the counter and refresh lifecycle are live, then closing the whole panel
    // exercises the second visibility gate independently of tab selection.
    tools.topicPositionsTab.click()
    assertThat(tools.topicPositionsTable).isVisible()
    page.waitForTimeout(1200)
    assert(topicPositionsRequestCount > hiddenTabCount,
      s"Topic Positions did not resume polling after reopening: still $topicPositionsRequestCount")

    cs.closeTools()
    page.waitForTimeout(150)
    val closedPanelCount = topicPositionsRequestCount
    page.waitForTimeout(2200)
    assert(topicPositionsRequestCount == closedPanelCount,
      s"Topic Positions kept polling with Tools closed: $closedPanelCount -> $topicPositionsRequestCount")
  }

  test("CS-TP-6: sorting is live, and the ALL TOPICS row stays pinned on top through it") {
    val (t, ns, topic, topicFqn) = fixtures.freshTopicPartsOfKind(fixtures.TopicKind.PersistentPartitioned)
    fixtures.produceStrings(topicFqn, 30)

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(30)
    cs.openTools()

    val tools = ToolsPanel(page)
    tools.topicPositionsTab.click()
    assertThat(tools.topicPositionsRow("All topics")).isVisible()

    // The table opens sorted by topic ASCENDING (its defaultSort), so ONE click flips it to
    // descending: partition-2 must lead the real rows, and the aggregate must not move - it
    // summarizes the table, it does not compete with it. Descending is the interesting direction:
    // the Table implements it by reversing the sorted array, which is exactly the operation that
    // would flip a naive comparator-based pin to the bottom.
    tools.topicPositionsSortBy("topic")
    val rows = page.locator("[data-testid='topic-positions'] tbody tr").allTextContents()
    assert(rows.size() >= 4, s"expected the aggregate plus 3 partitions, got ${rows.size()}")
    assert(rows.get(0).contains("All topics"), s"the aggregate must stay pinned first, got '${rows.get(0).take(60)}'")
    assert(rows.get(1).contains("partition-2"), s"desc sort by topic should lead with partition-2, got '${rows.get(1).take(80)}'")
  }
