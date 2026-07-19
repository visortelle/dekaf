package routes

import harness.DekafSuite
import ui.ConfirmationDialog
import com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat
import com.microsoft.playwright.options.SelectOption
import org.apache.pulsar.client.api.{MessageId, Schema}
import scala.jdk.CollectionConverters.*

/** SUB-3 (expire), SUB-4 (skip), SUB-5 (reset cursor). Every mutation is driven
  * through the Overview action modals and cross-checked via PulsarAdmin. */
class SubscriptionActionSpec extends DekafSuite:

  // --- helpers -------------------------------------------------------------

  /** Produce `n` NON-batched string messages (1 msg == 1 entry => deterministic
    * backlog counts and single-message ids), returning their MessageIds in order. */
  private def produceCapturing(fqn: String, n: Int): Seq[MessageId] =
    val p = client.newProducer(Schema.STRING).topic(fqn).enableBatching(false).create()
    try (1 to n).map(i => p.send(s"msg-$i"))
    finally p.close()

  /** Serialized MessageId as the whitespace-tolerant hex the modal inputs expect
    * (hexStringToByteArray -> MessageId.fromByteArray on the server). */
  private def hexOf(id: MessageId): String =
    id.toByteArray.map(b => f"${b & 0xff}%02x").mkString

  private def backlogOf(fqn: String, sub: String): Long =
    val subs = admin.topics().getStats(fqn).getSubscriptions
    if subs.containsKey(sub) then subs.get(sub).getMsgBacklog else -1L

  /** Poll the admin backlog until `pred` holds (never a fixed sleep). */
  private def awaitBacklog(fqn: String, sub: String, pred: Long => Boolean, timeoutMs: Long = 15000): Long =
    val deadline = System.currentTimeMillis() + timeoutMs
    var b = backlogOf(fqn, sub)
    while !pred(b) && System.currentTimeMillis() < deadline do
      Thread.sleep(200); b = backlogOf(fqn, sub)
    b

  private def overviewUrl(t: String, ns: String, topic: String, sub: String): String =
    s"/tenants/$t/namespaces/$ns/topics/persistent/$topic/subscriptions/$sub/overview"

  // --- SUB-3: expire messages ---------------------------------------------

  test("SUB-3: expire messages by message ID clears the backlog (non-partitioned)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val ids = produceCapturing(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)
    assert(awaitBacklog(fqn, sub, _ == 3L) == 3L)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("expire-subscription-messages-button").click()
    // Default target is expire-by-message-id; expire up to & including the last id.
    page.getByTestId("expire-message-id-input").fill(hexOf(ids.last))
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Messages were successfully expired")).isVisible()
    assert(awaitBacklog(fqn, sub, _ == 0L) == 0L)
  }

  test("SUB-3: expire messages older than a duration runs without error (non-partitioned)") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produceCapturing(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("expire-subscription-messages-button").click()
    page.getByTestId("expire-target-select").selectOption(new SelectOption().setValue("expire-time-in-seconds"))
    page.getByTestId("expire-duration").locator("input").first().fill("5") // any >0 enables Confirm
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    // Oracle for the time-based path: the action runs without error.
    // (Deterministic backlog effect is asserted on the by-ID leg above - see NOTES.)
    assertThat(page.getByText("Messages were successfully expired")).isVisible()
    assert(admin.topics().getSubscriptions(fqn).asScala.contains(sub)) // admin cross-check: sub intact
  }

  test("SUB-3: expire by message ID is disabled for a partitioned topic") {
    val t = fixtures.createTenant()
    val ns = fixtures.createNamespace(t)
    val topic = fixtures.unique("ptopic")
    val fqn = s"persistent://$t/$ns/$topic"
    admin.topics().createPartitionedTopic(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("expire-subscription-messages-button").click()
    // Default target is by-message-id; on a partitioned topic the modal blocks it.
    assertThat(page.getByText("Expire by message ID is not supported for partitioned topics.")).isVisible()
    assertThat(page.getByTestId("confirmation-dialog-confirm-button")).isDisabled()
  }

  // --- SUB-4: skip messages -----------------------------------------------

  test("SUB-4: skip an exact number of messages drops the backlog to zero") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produceCapturing(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)
    assert(awaitBacklog(fqn, sub, _ == 3L) == 3L)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("skip-subscription-messages-button").click()
    page.getByTestId("skip-number-input").fill("3") // default target = skip-exact
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Messages were successfully skipped.")).isVisible()
    assert(awaitBacklog(fqn, sub, _ == 0L) == 0L)
  }

  test("SUB-4: skip all messages clears the backlog") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    produceCapturing(fqn, 5)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.earliest)
    assert(awaitBacklog(fqn, sub, _ == 5L) == 5L)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("skip-subscription-messages-button").click()
    page.getByTestId("skip-target-select").selectOption(new SelectOption().setValue("skip-all-messages"))
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Messages were successfully skipped.")).isVisible()
    assert(awaitBacklog(fqn, sub, _ == 0L) == 0L)
  }

  // --- SUB-5: reset cursor -------------------------------------------------

  test("SUB-5: reset cursor by message ID moves the backlog") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val ids = produceCapturing(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.latest) // cursor at end => backlog 0
    assert(awaitBacklog(fqn, sub, _ == 0L) == 0L)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("reset-subscription-cursor-button").click()
    // Default target = by-message-id; reset back to the first message.
    page.getByTestId("reset-message-id-input").fill(hexOf(ids.head))
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Cursor was successfully reset")).isVisible()
    assert(awaitBacklog(fqn, sub, _ > 0L) > 0L) // cursor moved back => backlog grew
  }

  test("SUB-5: reset cursor to a timestamp moves the backlog") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    val t0 = System.currentTimeMillis() // just before the messages exist
    produceCapturing(fqn, 3)
    val sub = fixtures.unique("sub")
    admin.topics().createSubscription(fqn, sub, MessageId.latest) // backlog 0
    assert(awaitBacklog(fqn, sub, _ == 0L) == 0L)

    page.navigate(overviewUrl(t, ns, topic, sub))
    page.getByTestId("reset-subscription-cursor-button").click()
    page.getByTestId("reset-target-select").selectOption(new SelectOption().setValue("reset-cursor-to-timestamp"))
    page.getByTestId("reset-timestamp-input").fill(t0.toString)
    ConfirmationDialog(page).confirm(guard = Some("CONFIRM"))

    assertThat(page.getByText("Cursor was successfully reset")).isVisible()
    assert(awaitBacklog(fqn, sub, _ > 0L) > 0L)
  }
