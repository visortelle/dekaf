package features.consumersession

import harness.DekafSuite
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import java.util.regex.Pattern

class CsDetailsSpec extends DekafSuite:
  private def loadedPaused(n: Int): ConsumerSessionPage =
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", n)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.waitMessages(n)
    cs.pauseFromToolbar()
    cs.assertState("paused")
    cs

  test("CS-24: MessageDetails closes only via its close button") {
    val cs = loadedPaused(3)
    cs.clickFirstMessage()
    assertThat(cs.messageDetails).isVisible()

    // Clicking elsewhere keeps a single selection -> panel stays open.
    cs.messages.nth(1).click()
    assertThat(cs.messageDetails).isVisible()
    cs.th("key").click()
    assertThat(cs.messageDetails).isVisible()

    cs.messageDetailsClose.click()
    assertThat(cs.messageDetails).isHidden()
  }

  test("CS-25: click-to-copy a cell copies + toasts; the Topic cell is a link") {
    context.grantPermissions(java.util.List.of("clipboard-read", "clipboard-write"))
    val cs = loadedPaused(3)

    cs.cell("value").first().click() // Field onClick copies the displayed value (JSON-quoted for a STRING schema)
    assertThat(page.getByText("copied to clipboard")).isVisible()
    val copied = page.evaluate("() => navigator.clipboard.readText()").toString
    assert(copied.contains("msg-1"), s"clipboard mismatch: $copied")

    // Topic renders as an <a> with an href (FQN -> route link).
    assertThat(cs.cell("topic").first()).hasAttribute("href", Pattern.compile(".+"))
  }

  test("CS-26: ArrowUp/k and ArrowDown/j move the selection and wrap at ends") {
    val cs = loadedPaused(3)
    cs.clickFirstMessage()
    assertThat(cs.selectedIndexCell).hasText("1")

    // Real keyboard path: focus the (now focusable) table, then press keys - a keyboard user must be
    // able to reach it. This would have been impossible before the tabIndex fix.
    cs.focusTable()
    cs.pressKeyOnTable("ArrowDown"); assertThat(cs.selectedIndexCell).hasText("2")
    cs.pressKeyOnTable("j");         assertThat(cs.selectedIndexCell).hasText("3")
    cs.pressKeyOnTable("ArrowDown"); assertThat(cs.selectedIndexCell).hasText("1") // wrap
    cs.pressKeyOnTable("ArrowUp");   assertThat(cs.selectedIndexCell).hasText("3") // wrap
    cs.pressKeyOnTable("k");         assertThat(cs.selectedIndexCell).hasText("2")
  }
