package knownbugs

import harness.DekafSuite
import harness.Eventually.eventually
import features.consumersession.ConsumerSessionPage
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import scala.jdk.CollectionConverters.*

/** Regression tests for formerly-known bugs (all fixed 2026-07-19 - see e2e/README.md §6). They keep
  * their BUG-N ids for traceability and now run in the ordinary green lane. */
class KnownBugSpec extends DekafSuite:

  test("BUG-6: Start-From option reads 'Skip first n messages'") {
    // FIXED: StartFromInput.tsx - label typo "fist" corrected.
    val (t, ns, topic) = fixtures.freshTopicParts()
    ConsumerSessionPage(page).openForTopic(t, ns, topic)
    val select = page.getByTestId("cs-start-from")
    assertThat(select).isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15000))
    // The options render asynchronously after the select mounts - poll instead of a one-shot read.
    eventually() {
      val options = select.locator("option").allTextContents().asScala.toList
      assert(options.contains("Skip first n messages"), s"start-from options were: $options")
    }
  }

  test("BUG-4: play/pause tooltip reflects state (running ⇒ 'Pause')") {
    // FIXED: ConsumerSession Toolbar.tsx - the title was `state ? "Start or Resume" : "Pause"`,
    // always truthy; now Pause/Resume/Start by actual state.
    val (t, ns, topic) = fixtures.freshTopicParts()
    fixtures.produceStrings(s"persistent://$t/$ns/$topic", 3)
    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    assertThat(cs.messages).hasCount(3, new LocatorAssertions.HasCountOptions().setTimeout(20000))
    val tooltip = cs.playButton.getAttribute("data-tooltip-html")
    assert(tooltip == "Pause", s"while running the tooltip was: '$tooltip'")
  }

  test("BUG-3: Create Subscription blocks Create for an empty 'Message with specific ID'") {
    // FIXED: CreateSubscription.tsx - isFormValid compared the id VALUE against the literal
    // "messageId" (never gating); now an invalid/empty id disables Create.
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/create-subscription")
    page.getByTestId("create-subscription-name").fill(fixtures.unique("sub"))
    page.getByTestId("create-subscription-cursor").selectOption(new SelectOption().setLabel("Message with specific ID"))
    val createButton = page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Create").setExact(true))
    assertThat(createButton).isDisabled(new LocatorAssertions.IsDisabledOptions().setTimeout(3000))
  }
