package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern
import scala.collection.mutable

class CsConsoleSpec extends DekafSuite:

  test("CS-30: Tools panel exposes Produce / REPL / Logs tabs (Produce present on a topic)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()

    val tools = ToolsPanel(page)
    assertThat(tools.produceTab).isVisible()
    assertThat(tools.replTab).isVisible()
    assertThat(tools.logsTab).isVisible()

    // Topic Positions is the default active tab - the "where am I?" view leads.
    assertThat(tools.topicPositionsNotStarted).isVisible()
    tools.produceTab.click(); assertThat(tools.produceSend).isVisible()
    tools.replTab.click(); assertThat(tools.replRun).isVisible()
    tools.logsTab.click(); assertThat(page.getByText("logDebug")).isVisible()
  }

  test("CS-31: REPL is disabled until a run, then executes and clears") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 1)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    val tools = ToolsPanel(page)
    tools.replTab.click()
    assertThat(tools.replRun).isDisabled() // isConsumerCreated === false before running

    cs.setStartFrom("Earliest message")
    cs.play()
    cs.assertState("running")
    assertThat(tools.replRun).isEnabled()

    // Click the Monaco editor surface (not just the wrapper) so the hidden textarea receives focus.
    tools.replEditor.locator(".monaco-editor").click()
    page.waitForTimeout(300)
    page.keyboard().`type`("2 + 2")
    page.waitForTimeout(300)
    tools.replRun.click()
    assertThat(tools.replLogs).containsText("4", new LocatorAssertions.ContainsTextOptions().setTimeout(15000))

    tools.replClear.click()
    assertThat(tools.replLogs).hasText("")
    assertThat(tools.replClear).isDisabled()
  }

  // Monaco is NOT part of the JS bundle: `@monaco-editor/react` fetches it at runtime through its
  // own AMD loader, whose default base is `cdn.jsdelivr.net`. Every code editor in Dekaf therefore
  // used to depend on the public internet - seconds of third-party network before the first editor
  // appeared, and no editor at all offline, air-gapped, or behind a proxy that blocks the CDN.
  // `ui/build.js` now copies `monaco-editor/min/vs` next to the bundle and `CodeEditor.tsx` points
  // the loader at that same-origin path.
  //
  // Nothing pinned it, because a runner with working internet cannot tell "served by Dekaf" from
  // "downloaded from jsdelivr" - both mount an editor. Blocking the CDN outright is what makes the
  // difference observable, and makes this a permanent regression rather than a property of the
  // network the run happened to have.
  test("CS-33: a code editor mounts with the public CDN blocked, from Dekaf's own origin") {
    val requested = mutable.ListBuffer.empty[String]
    page.onRequest(r => requested += r.url())
    // Not merely observed - REFUSED. On a runner with internet a regression would silently succeed
    // through the CDN, and the assertion below would pass while the offline case stayed broken.
    page.route(Pattern.compile(".*jsdelivr.*"), _.abort())

    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    ToolsPanel(page).produceTab.click() // Topic Positions is the default tab now // the Produce tab is default-active and mounts a CodeEditor for the value

    val editor = page.getByTestId("produce-value").locator(".monaco-editor").first()
    assertThat(editor).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30000))

    // The editor rendering is necessary but not sufficient: assert WHERE Monaco came from.
    val fromDekaf = requested.toList.filter(_.contains("/ui/static/dist/vs/"))
    assert(fromDekaf.nonEmpty, s"Monaco was not fetched from Dekaf's own origin; requests: ${requested.toList}")
    val fromCdn = requested.toList.filter(_.contains("jsdelivr"))
    assert(fromCdn.isEmpty, s"the editor still reaches for the public CDN: $fromCdn")
  }

  test("CS-32: Context Logs render (empty-state placeholder for logDebug output)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    val tools = ToolsPanel(page)
    tools.logsTab.click()
    assertThat(tools.logs).isVisible()
    assertThat(page.getByText("logDebug")).isVisible()
    // NOTE: no text/level filter control exists; generating real debugStdout needs a JS filter/projection (see NOTES).
  }
