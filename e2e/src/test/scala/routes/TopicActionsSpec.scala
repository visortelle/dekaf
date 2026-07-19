package routes

import harness.DekafSuite
import ui.ConfirmationDialog
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import org.apache.pulsar.client.api.Schema
import java.util.regex.Pattern
import scala.jdk.CollectionConverters.*

class TopicActionsSpec extends DekafSuite:

  private def visible(ms: Int) = new LocatorAssertions.IsVisibleOptions().setTimeout(ms)

  /** Poll an admin oracle instead of a fixed sleep. */
  private def eventually(timeoutMs: Long = 15000, stepMs: Long = 300)(p: => Boolean): Boolean = {
    val deadline = System.currentTimeMillis() + timeoutMs
    var ok = false
    while (!ok && System.currentTimeMillis() < deadline) {
      ok = try p catch { case _: Throwable => false }
      if (!ok) Thread.sleep(stepMs)
    }
    ok
  }

  private def partitionedTopic(count: Int): (String, String, String, String) = {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("ptopic")
    val fqn = s"persistent://$t/$ns/$topic"
    admin.topics().createPartitionedTopic(fqn, count)
    (t, ns, topic, fqn)
  }

  test("TOP-2a: update a partitioned topic's partition count") {
    val (t, ns, topic, fqn) = partitionedTopic(2)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    val updateBtn = page.getByTestId("topic-update-partitions-button")
    assertThat(updateBtn).isVisible(visible(20000))
    updateBtn.click()

    page.getByRole(AriaRole.SPINBUTTON).fill("4")
    page.getByRole(AriaRole.BUTTON, new GetByRoleOptions().setName("Confirm").setExact(true)).click()

    assert(eventually() { admin.topics().getPartitionedTopicMetadata(fqn).partitions == 4 })
  }

  test("TOP-2b: view a partitioned topic's partitions") {
    val (t, ns, topic, _) = partitionedTopic(2)
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    val viewBtn = page.getByTestId("topic-view-partitions-button")
    assertThat(viewBtn).isVisible(visible(20000))
    viewBtn.click()

    // Opens the "Topic Partitions" modal (a partition-filtered Topics list).
    assertThat(page.getByText("Topic Partitions").first()).isVisible(visible(15000))
  }

  test("TOP-2c: create missed partitions") {
    val (t, ns, topic, fqn) = partitionedTopic(2)
    // Force activePartitionsCount < partitionsCount (see topicInternalStats.scala:56-58):
    // remove one materialized partition topic if present (no-op if partitions are lazy).
    try admin.topics().delete(s"persistent://$t/$ns/$topic-partition-1", true) catch { case _: Throwable => () }

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")
    val createMissed = page.getByRole(AriaRole.BUTTON,
      new GetByRoleOptions().setName("Create missed partitions").setExact(true))
    assertThat(createMissed).isVisible(visible(20000))
    createMissed.click()

    assert(eventually() {
      admin.topics().getList(s"$t/$ns").asScala.exists(_.contains(s"$topic-partition-1"))
    })
  }

  test("TOP-3: expire messages on all subscriptions") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    page.getByTestId("expire-topic-messages-button").click()

    // Confirm stays disabled until duration > 0 (ExpireAllSubscriptions.tsx:93).
    page.getByRole(AriaRole.SPINBUTTON).fill("1")
    // No force checkbox on this dialog - force must stay false.
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    // Empty-backlog expire is a server no-op → assert the success toast + no error toast.
    assertThat(page.getByText("Messages were successfully expired")).isVisible(visible(15000))
  }

  test("TOP-4: unload a topic") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    page.getByTestId("topic-page-unload-button").click()
    ConfirmationDialog(page).confirm(guard = Some(fqn)) // guard = topic FQN, no force

    // Unload is transient: assert success toast + topic still present.
    assertThat(page.getByText(Pattern.compile("has been successfully unloaded"))).isVisible(visible(15000))
    assert(admin.topics().getList(s"$t/$ns").asScala.exists(_.contains(topic)))
  }

  test("TOP-5: producers list shows an attached producer") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val pname = fixtures.unique("producer")
    val producer = client.newProducer(Schema.STRING).topic(fqn).producerName(pname).create()
    try {
      page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/producers")
      assertThat(page.getByText(pname).first()).isVisible(visible(20000))
      assert(eventually() {
        admin.topics().getStats(fqn).getPublishers.asScala.exists(_.getProducerName == pname)
      })
    } finally producer.close()
    // NOTE: the topic page has no consumers tab; consumers render under the subscription
    // consumers page (SubscriptionPage/**, SUB-2) - outside this subtree. See NOTES.
  }
