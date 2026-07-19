package routes

import harness.DekafSuite
import harness.Eventually.eventually
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.{AriaRole, SelectOption}
import com.microsoft.playwright.Page.GetByRoleOptions
import org.apache.pulsar.client.admin.LongRunningProcessStatus
import scala.jdk.CollectionConverters.*

/** Topic Details breadth beyond TOP-9 (which proves the delayed-delivery save): a second topic
  * policy field, and the Topic Compaction tab's trigger action (unique - a broker-side operation,
  * not a policy write). Both gated on `topicLevelPoliciesEnabled` (dev-stack default = on). */
class TopicPolicyBreadthSpec extends DekafSuite:
  private def vis(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms.toDouble)
  private def saveButton =
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Save").setExact(true))
  private def policiesEnabled: Boolean =
    admin.brokers().getRuntimeConfigurations().asScala.get("topicLevelPoliciesEnabled").contains("true")

  test("TOP-13: Topic Limits tab persists a specified max-consumers") {
    assume(policiesEnabled, "topic-level policies are DISABLED on this broker")
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/details?category=limits")

    val select = page.getByTestId("topic-max-consumers-type-select")
    assertThat(select).isVisible(vis(15000))
    select.selectOption(new SelectOption().setLabel("Specified for this topic"))
    page.getByTestId("topic-max-consumers-value-input").fill("7")
    saveButton.click()

    eventually() {
      val v = admin.topicPolicies(false).getMaxConsumers(fqn)
      assert(v != null && v.intValue == 7, s"topic maxConsumers was: $v")
    }
  }

  test("TOP-14: Topic Compaction tab triggers a broker-side compaction") {
    assume(policiesEnabled, "topic-level policies are DISABLED on this broker")
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 3)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/details?category=topic-compaction")

    val trigger = page.getByTestId("trigger-compaction-button")
    assertThat(trigger).isVisible(vis(15000))
    trigger.click()

    // The UI trigger reaches the broker: compaction leaves NOT_RUN for RUNNING/SUCCESS.
    eventually(30000) {
      val st = admin.topics().compactionStatus(fqn).status
      assert(st == LongRunningProcessStatus.Status.RUNNING || st == LongRunningProcessStatus.Status.SUCCESS,
        s"compaction status was: $st")
    }
  }
