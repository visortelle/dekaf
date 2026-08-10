package features.consumersession

import harness.DekafSuite

import scala.jdk.CollectionConverters.*

/** SUBSCRIPTION ISOLATION: what a consumer session does and does not touch on the broker.
  *
  * The promise the docs make is precise: Dekaf never mutates ANOTHER subscription - it reads
  * through its own exclusive, non-durable one, which disappears with the session (its live
  * cursor can delay retention only while the session exists; that part is documented, not
  * denied). Both halves are pinned against a real broker here, because no unit test can.
  */
class CsRetentionIsolationSpec extends DekafSuite:

  test("CS-ISO-1: an application's durable subscription is untouched, and Dekaf's own cursor disappears on stop") {
    val (t, ns, topic) = fixtures.freshTopicParts()
    val fqn = s"persistent://$t/$ns/$topic"
    fixtures.produceStrings(fqn, 10)

    // The application's own durable subscription, parked at the beginning with a real backlog.
    fixtures.admin.topics().createSubscription(fqn, "app-durable", org.apache.pulsar.client.api.MessageId.earliest)
    def appSub() = fixtures.admin.topics().getStats(fqn).getSubscriptions.get("app-durable")
    val backlogBefore = appSub().getMsgBacklog

    val cs = ConsumerSessionPage(page)
    cs.openForTopic(t, ns, topic)
    cs.setStartFrom("Earliest message")
    cs.play()
    cs.awaitLoaded(10)

    // While Dekaf reads: its own __dekaf_ subscription exists alongside, and the app's cursor
    // has not moved a message.
    val subsWhileRunning = fixtures.admin.topics().getStats(fqn).getSubscriptions.keySet.asScala.toSet
    assert(subsWhileRunning.exists(_.startsWith("__dekaf_")), s"expected a dekaf subscription, got $subsWhileRunning")
    assert(appSub().getMsgBacklog == backlogBefore, s"the app's backlog moved: ${appSub().getMsgBacklog} != $backlogBefore")

    cs.stop()

    // The dekaf subscription (and with it the cursor that could pin retention) is GONE; the
    // app's is exactly where it was. Poll briefly - the unsubscribe is async on the broker.
    val deadline = System.currentTimeMillis() + 15000
    var remaining = Set.empty[String]
    while
      remaining = fixtures.admin.topics().getStats(fqn).getSubscriptions.keySet.asScala.toSet
      remaining.exists(_.startsWith("__dekaf_")) && System.currentTimeMillis() < deadline
    do Thread.sleep(250)

    assert(!remaining.exists(_.startsWith("__dekaf_")), s"dekaf subscription still present after stop: $remaining")
    assert(remaining.contains("app-durable"), s"the app's subscription vanished: $remaining")
    assert(appSub().getMsgBacklog == backlogBefore, s"the app's backlog moved after stop: ${appSub().getMsgBacklog}")
  }
