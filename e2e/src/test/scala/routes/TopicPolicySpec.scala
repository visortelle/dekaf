package routes

import harness.DekafSuite
import com.microsoft.playwright.Locator
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

class TopicPolicySpec extends DekafSuite:

  private def visible(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms)

  private def eventually(timeoutMs: Long = 15000, stepMs: Long = 300)(p: => Boolean): Boolean = {
    val deadline = System.currentTimeMillis() + timeoutMs
    var ok = false
    while (!ok && System.currentTimeMillis() < deadline) {
      ok = try p catch { case _: Throwable => false }
      if (!ok) Thread.sleep(stepMs)
    }
    ok
  }

  // Same key the UI reads (BrokersConfig.tsx -> getRuntimeConfigurations).
  private def policiesEnabled: Boolean =
    admin.brokers().getRuntimeConfigurations().asScala.get("topicLevelPoliciesEnabled").contains("true")

  test("TOP-8: Details shows a message when topic-level policies are disabled") {
    assume(!policiesEnabled,
      "topic-level policies are ENABLED on this broker (dev stack default) - TOP-8's disabled state is not reproducible here")
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/details")
    assertThat(page.getByText(Pattern.compile("Topic level policies are not enabled"))).isVisible(visible(15000))
  }

  test("TOP-9: Details is-global toggle + field save when policies enabled") {
    assume(policiesEnabled,
      "topic-level policies are DISABLED on this broker - enable via broker.conf topicLevelPoliciesEnabled=true")
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/details")

    val isGlobal = page.getByTestId("topic-details-is-global")
    assertThat(isGlobal).isVisible(visible(15000))

    // Field save on the default (Delayed Delivery) tab: set "Disabled", then Save.
    page.getByTestId("topic-detail-delayed-delivery-select").selectOption(new SelectOption().setLabel("Disabled"))
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true)).click()

    assert(eventually() {
      Option(admin.topicPolicies(false).getDelayedDeliveryPolicy(fqn, false)).exists(!_.isActive)
    })

    // Exercise the is-global toggle (visually-hidden checkbox -> force).
    val cb = isGlobal.locator("input[type='checkbox']")
    cb.check(new Locator.CheckOptions().setForce(true))
    assertThat(cb).isChecked()
  }
