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

  test("CS-TP-3: a running session reports each partition, and the entry counts ADD UP") {
    // The arithmetic check that only a real broker can settle: three partitions, 30 messages, and
    // the per-partition entry totals must sum to exactly what was published.
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

    val partitions = (0 until 3).map(i => s"$topicFqn-partition-$i")
    partitions.foreach(p => assertThat(tools.topicPositionsRow(p)).isVisible())

    // WAIT for a settled frame first: the table refreshes once a second, and the frame on screen
    // when the tab opens can legally predate the last messages read - parsing its '-' cells would
    // test the refresh cycle's phase, not the arithmetic.
    assertThat(tools.topicPositionsRow("All topics")).containsText("30 / 30")

    // "ordinal / total" in the ENTRIES READ column (cell 1 - consumption columns lead the table);
    // the totals are what must reconcile.
    val totals = partitions.map { p =>
      val cells = tools.topicPositionsCells(p)
      cells(1).split('/').last.trim.replace(",", "").toInt
    }
    assert(
      totals.sum == 30,
      s"per-partition entry totals ${totals.mkString(" + ")} = ${totals.sum}, but 30 messages were published to $topicFqn"
    )

    // The ALL TOPICS row sums what the per-partition rows show - the whole session, one line.
    val aggregate = tools.topicPositionsCells("All topics")
    assert(aggregate(1).replace(",", "").contains("30 / 30"), s"aggregate entries read should be 30 / 30, got '${aggregate(1)}'")
    assert(aggregate(2).trim == "0", s"aggregate entries left should be 0, got '${aggregate(2)}'")
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
    assert(cells(6).trim.nonEmpty && cells(6).trim != "-", s"first message id should be known, got '${cells(6)}'")
    assert(cells(9).trim.nonEmpty && cells(9).trim != "-", s"last published should be known, got '${cells(9)}'")
    // The session's position is not - including the lag clock, which without a cursor is a guess.
    assert(cells(10).trim == "-", s"cursor id should be blank before anything is read, got '${cells(10)}'")
    assert(cells(4).trim == "-", s"'behind' should be blank without a cursor, got '${cells(4)}'")
    assert(cells(5).trim == "-", s"% of time range should be blank, got '${cells(5)}'")
    assert(cells(3).trim == "-", s"% of entries should be blank, got '${cells(3)}'")
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
