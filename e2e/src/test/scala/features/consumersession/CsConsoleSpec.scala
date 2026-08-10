package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import java.util.regex.Pattern
import scala.collection.mutable

class CsConsoleSpec extends DekafSuite:

  test("CS-30: More tools is open by default and exposes Produce / REPL / Logs tabs") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    assertThat(cs.toolsButton).containsText("More tools")
    assertThat(cs.toolsCloseButton).isVisible()

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

  test("CS-30R: Tools panel height is resizable and persists across toggling and reload") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    assertThat(cs.toolsResizeHandle).isVisible()

    // Preserve the former 400rem default (360 CSS px under Dekaf's 0.9px root scale).
    val defaultHeight = cs.toolsPanelDomHeight
    assert(math.abs(defaultHeight - 360) <= 3,
      s"the resizable Tools panel changed its old 400rem default: $defaultHeight")

    // A large preference restored in a shorter viewport is capped without rewriting it. More
    // importantly, the FIRST drag starts at the VISIBLE cap, not the hidden 900px preference -
    // otherwise this 90px drag would appear to do nothing.
    cs.setStoredPaneSize("consumer-session-tools", 900)
    page.reload()
    cs.openTools()
    val before = cs.toolsPanelDomHeight
    assert(before >= cs.sessionDomHeight * 0.80 - 3,
      s"Tools should be draggable well beyond the old 65% cap: $before of ${cs.sessionDomHeight}")
    assert(before <= cs.sessionDomHeight * 0.85 + 3,
      s"oversized Tools preference was not capped: $before of ${cs.sessionDomHeight}")
    assert(cs.storedPaneSize("consumer-session-tools") == 900,
      s"responsive cap must not overwrite the preference: ${cs.storedPaneSize("consumer-session-tools")}")

    // Drive the actual top edge down. For a bottom pane that must SHRINK its rendered height.
    cs.resizeToolsBy(90)
    val resized = cs.toolsPanelDomHeight
    assert(resized < before - 40, s"dragging the Tools top edge down did not shrink it: $before -> $resized")
    val stored = cs.storedPaneSize("consumer-session-tools")
    assert(stored > 0, s"the resized Tools height was not persisted: $stored")

    // Closing through the panel cross and reopening must not reset the pane to its default height.
    cs.closeTools()
    assertThat(cs.toolsResizeHandle).not().isVisible()
    cs.openTools()
    assertThat(cs.toolsResizeHandle).isVisible()
    val afterReopen = cs.toolsPanelDomHeight
    assert(math.abs(afterReopen - resized) <= 3,
      s"Tools height changed after hide/reopen: $resized -> $afterReopen")

    // The shared pane contract is browser-persistent, like navtree/split sizes.
    page.reload()
    cs.openTools()
    assertThat(cs.toolsResizeHandle).isVisible()
    assert(cs.storedPaneSize("consumer-session-tools") == stored,
      s"stored Tools height changed across reload: $stored -> ${cs.storedPaneSize("consumer-session-tools")}")
    val afterReload = cs.toolsPanelDomHeight
    assert(math.abs(afterReload - resized) <= 3,
      s"persisted Tools height was not re-applied after reload: $resized -> $afterReload")

    // The lower bound is intentionally compact too: users can reclaim nearly all vertical space.
    cs.resizeToolsBy(2000)
    assert(cs.toolsPanelDomHeight <= 100,
      s"Tools could not be dragged down to its expanded minimum range: ${cs.toolsPanelDomHeight}")
  }

  test("CS-31: REPL is disabled until a run, then exposes lastMessage and clears") {
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
    cs.awaitLoaded(1)
    assertThat(tools.replRun).isEnabled()

    // The help advertises this public binding. Exercise the complete browser -> gRPC -> shared
    // Graal context path so a private-only implementation cannot make that promise regress again.
    tools.writeRepl("lastMessage.value")
    page.waitForTimeout(300)
    tools.replRun.click()
    assertThat(tools.replLogs).containsText("msg-1", new LocatorAssertions.ContainsTextOptions().setTimeout(15000))

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
    ToolsPanel(page).produceTab.click() // Topic Positions is the default, so reveal Produce explicitly.

    val editor = page.getByTestId("produce-value").locator(".monaco-editor").first()
    assertThat(editor).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(30000))

    // The editor rendering is necessary but not sufficient: assert WHERE Monaco came from.
    val fromDekaf = requested.toList.filter(_.contains("/ui/static/dist/vs/"))
    assert(fromDekaf.nonEmpty, s"Monaco was not fetched from Dekaf's own origin; requests: ${requested.toList}")
    val fromCdn = requested.toList.filter(_.contains("jsdelivr"))
    assert(fromCdn.isEmpty, s"the editor still reaches for the public CDN: $fromCdn")
  }

  test("CS-32: Context Logs omit ordinary messages and keep the explicit-output empty state") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 1)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.openTools()
    val tools = ToolsPanel(page)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(1)
    tools.logsTab.click()
    assertThat(tools.logs).isVisible()
    assertThat(page.getByText("logDebug")).isVisible()
    // Message ingestion itself used to console.log the full JSON object, making this tab a noisy
    // duplicate of the message table even when the user wrote no logging code.
    assertThat(tools.logs).not().containsText("msg-1")
  }
