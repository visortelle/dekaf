package routes

import harness.DekafSuite
import harness.Eventually
import ui.ConfirmationDialog
import com.microsoft.playwright.Page.GetByRoleOptions
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.assertions.LocatorAssertions
import com.microsoft.playwright.options.AriaRole
import org.apache.pulsar.client.api.{MessageId, Schema}
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

  /** Produce `n` NON-batched messages (1 message == 1 entry => deterministic backlog/entry counts). */
  private def produce(fqn: String, n: Int): Unit = {
    val p = client.newProducer(Schema.STRING).topic(fqn).enableBatching(false).create()
    try (1 to n).foreach(i => p.send(s"msg-$i"))
    finally p.close()
  }

  private def backlogOf(fqn: String, sub: String): Long = {
    val subs = admin.topics().getStats(fqn).getSubscriptions
    if subs.containsKey(sub) then subs.get(sub).getMsgBacklog else -1L
  }

  /** Expiry compares each message's publish time against `now - expireTimeInSeconds`, so
    * "the messages are older than the threshold" is a real precondition of the expire assertion.
    * Poll for it (page load usually covers it already) instead of sleeping blind. */
  private def awaitOlderThan(producedAt: Long, ageMs: Long): Unit =
    Eventually.eventually(timeoutMs = 10000, intervalMs = 200) {
      assert(System.currentTimeMillis() - producedAt > ageMs)
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

  test("TOP-3: expire messages on all subscriptions clears every subscription's backlog") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    // Arrange a REAL backlog on two subscriptions - "all subscriptions" is only proven by more
    // than one - then act through the UI and poll the admin oracle for the state change.
    val subA = fixtures.unique("suba")
    val subB = fixtures.unique("subb")
    admin.topics().createSubscription(fqn, subA, MessageId.earliest)
    admin.topics().createSubscription(fqn, subB, MessageId.earliest)
    produce(fqn, 3)
    val producedAt = System.currentTimeMillis()
    Eventually.eventually() {
      assert(backlogOf(fqn, subA) == 3L)
      assert(backlogOf(fqn, subB) == 3L)
    }

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    page.getByTestId("expire-topic-messages-button").click()

    // Confirm stays disabled until duration > 0 (ExpireAllSubscriptions.tsx:93). DurationInput's
    // default unit is seconds, so "1" == expireTimeInSeconds 1.
    page.getByRole(AriaRole.SPINBUTTON).fill("1")
    awaitOlderThan(producedAt, 2000)
    // No force checkbox on this dialog - force must stay false.
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Messages were successfully expired")).isVisible(visible(15000))
    // The oracle - a toast only proves a request was fired; this proves the backlog actually drained.
    Eventually.eventually() {
      assert(backlogOf(fqn, subA) == 0L)
      assert(backlogOf(fqn, subB) == 0L)
    }
  }

  test("TOP-4: unload a topic reloads its managed ledger (data preserved)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"

    // Arrange state that only survives ONE load: entriesAddedCounter lives on the ManagedLedger
    // INSTANCE, so it counts this load's 3 writes and restarts at 0 once the topic is closed and
    // re-opened (the next admin read re-loads it). Re-opening also appends a fresh ledger.
    produce(fqn, 3)
    Eventually.eventually() { assert(admin.topics().getInternalStats(fqn).entriesAddedCounter == 3L) }
    val ledgersBefore = admin.topics().getInternalStats(fqn).ledgers.size()

    page.navigate(s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/overview")

    page.getByTestId("topic-page-unload-button").click()
    ConfirmationDialog(page).confirm(guard = Some(fqn)) // guard = topic FQN, no force

    assertThat(page.getByText(Pattern.compile("has been successfully unloaded"))).isVisible(visible(15000))
    // The oracle: the managed ledger really was closed and re-opened.
    Eventually.eventually() {
      val stats = admin.topics().getInternalStats(fqn)
      assert(stats.entriesAddedCounter == 0L)      // per-load counter restarted
      assert(stats.ledgers.size() > ledgersBefore) // re-open created a new ledger
    }
    // Unload, not delete: the topic and its 3 entries survive.
    assert(admin.topics().getInternalStats(fqn).numberOfEntries == 3L)
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
