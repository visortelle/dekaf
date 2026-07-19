package features.consumersession

import harness.DekafSuite
import org.apache.pulsar.client.api.Schema

class CsTableSpec extends DekafSuite:
  private def loaded(n: Int): ConsumerSessionPage =
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", n)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs

  /** Load a session over messages with the given distinctive keys, in the given (publish) order. */
  private def loadedKeyed(keys: Seq[String]): ConsumerSessionPage =
    val (t, ns, topic) = fixtures.freshTopicParts()
    val producer = client.newProducer(Schema.STRING).topic(s"persistent://$t/$ns/$topic").create()
    try keys.foreach(k => producer.newMessage().key(k).value(s"v-$k").send())
    finally producer.close()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(keys.size)
    cs

  test("CS-20: the table has 17 columns and a header that stays fixed while the rows scroll") {
    // Enough rows to make the message viewport scrollable. NOTE: the table is virtualized
    // (react-virtuoso), so the DOM row count is ~viewport-sized - wait on the loaded counter, not rows.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 60)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitHeader() // the table is rendered (headerCount uses count(), which does not auto-wait)
    cs.awaitLoaded(60)
    assert(cs.headerCount == 17, s"expected 17 columns, got ${cs.headerCount}")

    // Vertical stickiness: the header keeps its on-screen y position WHILE the rows actually scroll.
    // A running session auto-scrolls to the bottom, so scroll to the TOP first - otherwise a
    // downward scroll from the bottom moves nothing and the header trivially stays put (false pass).
    cs.pauseFromToolbar() // stop the stream so the scroll position is stable
    cs.assertState("paused")
    cs.scrollTableToTop()
    val indexBefore = cs.firstRenderedIndex
    val topBefore = cs.th("publishTime").boundingBox().y
    cs.scrollTableDown(600)
    val indexAfter = cs.firstRenderedIndex
    val topAfter = cs.th("publishTime").boundingBox().y
    assert(indexAfter > indexBefore,
      s"the rows did not actually scroll ($indexBefore -> $indexAfter) - stickiness can't be proven")
    assert(math.abs(topAfter - topBefore) <= 2,
      s"header moved when the rows scrolled (not vertically sticky): $topBefore -> $topAfter")
  }

  test("CS-21: clicking a sortable header re-orders the rows; a drag-resize does NOT sort") {
    // Deliberately unsorted publish order, so an ascending sort has to actually move rows.
    val cs = loadedKeyed(Seq("k-3", "k-1", "k-2"))
    cs.assertSort("publishTime:asc") // default
    assert(cs.columnValues("key") == List("k-3", "k-1", "k-2"), s"publish order was: ${cs.columnValues("key")}")

    cs.sortBy("key")
    cs.assertSort("key:asc")
    assert(cs.columnValues("key") == List("k-1", "k-2", "k-3"), s"asc order was: ${cs.columnValues("key")}")

    cs.sortBy("key")
    cs.assertSort("key:desc")
    assert(cs.columnValues("key") == List("k-3", "k-2", "k-1"), s"desc order was: ${cs.columnValues("key")}")

    // Dragging the "value" resize handle changes its width but must NOT re-sort (suppressSortClickRef).
    cs.resizeColumn("value", 80)
    cs.assertSort("key:desc")
    assert(cs.columnValues("key") == List("k-3", "k-2", "k-1"), "a drag-resize re-ordered the rows")
    assert(cs.storedColumnWidth("value") > 240, s"value width not increased: ${cs.storedColumnWidth("value")}")
  }

  test("CS-22: a resized column width persists across reload and is re-applied to the DOM") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(3)

    // Baseline the LIVE DOM width BEFORE the drag, then prove the drag actually widened the rendered
    // column - otherwise an implementation that only writes localStorage (never applying it) would
    // leave both the pre- and post-reload widths at the default and pass.
    val domBaseline = cs.columnDomWidth("value")
    cs.resizeColumn("value", 80)
    val stored = cs.storedColumnWidth("value")
    assert(stored > 240, s"width not persisted after resize: $stored")
    val domAfterResize = cs.columnDomWidth("value")
    assert(domAfterResize > domBaseline + 20,
      s"resize was not applied to the live DOM: ${domBaseline}px -> ${domAfterResize}px")

    // Reload resets the session to its config view, so replay to render the table again.
    page.reload()
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(3)

    // Storage kept it AND the restored column renders at the widened width, not the default.
    assert(cs.storedColumnWidth("value") == stored,
      s"stored width not stable across reload: $stored -> ${cs.storedColumnWidth("value")}")
    val domAfterReload = cs.columnDomWidth("value")
    assert(math.abs(domAfterReload - domAfterResize) <= 3,
      s"restored column rendered at ${domAfterReload}px, expected ~${domAfterResize}px (persisted width not re-applied)")
  }
