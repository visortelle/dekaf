package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions

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

    assertThat(tools.produceSend).isVisible() // Produce is the default active tab
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
