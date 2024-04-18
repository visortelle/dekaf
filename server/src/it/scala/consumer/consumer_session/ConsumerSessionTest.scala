package consumer.consumer_session

import com.microsoft.playwright.Page.CloseOptions
import consumer.consumer_session.page.ConsumerSessionPageHtml
import consumer.start_from.EarliestMessage
import library.{LibraryItem, LibraryItemGen, ManagedItemGen}
import library.managed_items.{
    ManagedConsumerSessionConfig,
    ManagedConsumerSessionConfigSpec,
    ManagedConsumerSessionConfigSpecGen,
    ManagedConsumerSessionConfigValOrRef,
    ManagedConsumerSessionStartFrom,
    ManagedConsumerSessionStartFromSpecGen
}
import zio.*
import zio.test.*
import zio.test.TestAspect.*
import zio.test.Assertion.*
import testing.{TestDekaf, TestPulsar}
import org.apache.pulsar.client.api.{MessageListener, Schema, SubscriptionInitialPosition}
import monocle.syntax.all.*

import scala.jdk.CollectionConverters.*
import java.util.UUID
import java.util.concurrent.TimeUnit

object ConsumerSessionTest extends ZIOSpecDefault:
    def spec = suite(this.getClass.getName)(
        test("The amount of messages delivered to UI shouldn't differ after multiple runs") {
            /*
            **How to reproduce**
            - Create a partitioned topic with 10 partitions.
            - Produce 100k messages.
            - Run consumer session multiple times.

            **What to expect**
            - For each run, all the 100k messages should be visible on the UI.
            - The result should be the same also with pausing/resuming the session multiple times.
             * */

            val startValue = 42L
            val numMessages = 20_000

            // Prepare a ConsumerSession config
            var sessionSpec = ManagedConsumerSessionConfigSpecGen.currentTopic
            sessionSpec = sessionSpec
                .focus(_.startFrom.value)
                .replace(Some(
                    ManagedItemGen.fromSpec(ManagedConsumerSessionStartFromSpecGen.fromVariant(
                        EarliestMessage()
                    )).asInstanceOf[ManagedConsumerSessionStartFrom]
                ))

            val sessionLibraryItem = LibraryItemGen.fromManagedItemSpec(sessionSpec)

            case class TestResult(numMessagesProcessed: Long, numMessages: Long)

            def runTest(withSessionPauses: Boolean) = for {
                pulsar <- ZIO.service[TestPulsar]

                pulsarClient <- pulsar.createPulsarClient
                topic <- pulsar.createTopic

                // Generate messages
                producer <- ZIO.attempt(pulsarClient.newProducer(Schema.INT64).topic(topic.fqn).create())
                _ <- ZIO.attempt {
                    for (i <- 0 until numMessages)
                        // Should be sendAsync. Otherwise the issue is not reproducible for some reason
                        producer.sendAsync(startValue + i)
                }

                // Check the number of messages in the topic.
                // There is not much need doing this as the producer code above is very straightforward,
                // but for this specific test it may make sense.
                _ <- ZIO.attempt {
                    var checkNumMessages: Int = 0
                    val consumer = pulsarClient.newConsumer(Schema.INT64)
                        .topic(topic.fqn)
                        .subscriptionName(UUID.randomUUID().toString)
                        .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
                        .subscribe()

                    for (i <- 0 until numMessages + 42) do
                        val msg = consumer.receive(1, TimeUnit.SECONDS)
                        if msg != null then
                            checkNumMessages += 1
                            consumer.acknowledge(msg.getMessageId)

                    println(s"Ensure that the number of messages in topic is correct. Expected: $numMessages Actual: $checkNumMessages")
                    consumer.close()
                    if numMessages != checkNumMessages
                    then throw new Exception(s"Number of messages in topic is incorrect. Expected: $numMessages Actual: $checkNumMessages")
                }

                dekaf <- ZIO.service[TestDekaf]

                // Upload the ConsumerSession library item
                _ <- dekaf.saveLibraryItem(sessionLibraryItem)

                // Open the preconfigured ConsumerSession
                page <- dekaf.openRootPage
                _ <- ZIO.attempt {
                    page.navigate(
                        s"/tenants/${topic.namespace.tenant.name}/namespaces/${topic.namespace.name}/topics/persistent/${topic.name}/consumer-session?id=${sessionLibraryItem.spec.metadata.id}"
                    )
                }

                consumerSessionPage <- ZIO.attempt(ConsumerSessionPageHtml(page))

                // Start consumer session
                _ <- ZIO.attempt(consumerSessionPage.startButton.click())

                // Pause/unpause
                _ <- (for {
                    _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v > (numMessages * 0.15).floor.toLong)
                    _ <- ZIO.attempt(consumerSessionPage.pauseButton.click())

                    _ <- ZIO.attempt(consumerSessionPage.startButton.click())
                    _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v > (numMessages * 0.5).floor.toLong)
                    _ <- ZIO.attempt(consumerSessionPage.pauseButton.click())

                    _ <- ZIO.attempt(consumerSessionPage.startButton.click())
                    _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v >= numMessages)
                    _ <- ZIO.attempt(page.waitForTimeout(3.seconds.toMillis))
                } yield ()).when(withSessionPauses)

                numMessagesProcessed <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v >= numMessages)
                _ <- ZIO.attempt(page.waitForTimeout(1.second.toMillis))
            } yield TestResult(numMessagesProcessed, numMessages)

            for {
                r1 <- runTest(withSessionPauses = false)
                r2 <- runTest(withSessionPauses = true)
            } yield assertTrue(
                r1.numMessagesProcessed == r1.numMessages,
                r2.numMessagesProcessed == r2.numMessages
            )
        } @@ withLiveClock @@ nonFlaky @@ repeats(1),
        test("User accidentally disconnects without gracefully stopping the consumer session") {
            /*
             **Problem**

             **How to reproduce**
             - Run a new consumer session on a topic with an active producer.
             - Manually close the running consumer session tab in the Chrome task manager.

            **What to expect**
            - There should be no exceptions in Dekaf logs.
            - Subscription should be deleted.
             */

            val numMessages = 10_000

            // Prepare a ConsumerSession config
            var sessionSpec = ManagedConsumerSessionConfigSpecGen.currentTopic
            sessionSpec = sessionSpec
                .focus(_.startFrom.value)
                .replace(Some(
                    ManagedItemGen.fromSpec(ManagedConsumerSessionStartFromSpecGen.fromVariant(
                        EarliestMessage()
                    )).asInstanceOf[ManagedConsumerSessionStartFrom]
                ))

            val sessionLibraryItem = LibraryItemGen.fromManagedItemSpec(sessionSpec)

            def runTest(runBeforeUnload: Boolean, pauseSessionBeforeClosingPage: Boolean) = for {
                pulsar <- ZIO.service[TestPulsar]
                pulsarClient <- pulsar.createPulsarClient
                adminClient <- pulsar.createAdminClient
                topic <- pulsar.createTopic

                // Generate messages
                producer <- ZIO.attempt(pulsarClient.newProducer(Schema.INT64).topic(topic.fqn).create())
                _ <- ZIO.attempt {
                    for (i <- 0 until numMessages)
                        producer.send(i.toLong)
                    producer.flush()
                    producer.close()
                }

                dekaf <- ZIO.service[TestDekaf]
                // Upload the ConsumerSession library item
                _ <- dekaf.saveLibraryItem(sessionLibraryItem)

                // Open the preconfigured ConsumerSession
                page <- dekaf.openRootPage
                _ <- ZIO.attempt {
                    page.navigate(
                        s"/tenants/${topic.namespace.tenant.name}/namespaces/${topic.namespace.name}/topics/persistent/${topic.name}/consumer-session?id=${sessionLibraryItem.spec.metadata.id}"
                    )
                }

                consumerSessionPage <- ZIO.attempt(ConsumerSessionPageHtml(page))

                // Run consumer session
                _ <- ZIO.attempt(consumerSessionPage.startButton.click())

                // Check subscription count
                _ <- ZIO.attempt(adminClient.topics.getSubscriptions(topic.fqn).asScala.size)
                    .debug(s"Subscription count after starting the consumer session")
                    .filterOrFail(_ > 0)(new Exception("Subscription wasn't created"))
                    .retry(Schedule.spaced(250.millis))
                    .timeoutFail(new Exception("Subscription wasn't created in time"))(10.seconds)

                _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v > (numMessages * 0.15).floor.toLong)

                // Conditionally pause the session before closing the page
                _ <- ZIO.attempt {
                    consumerSessionPage.pauseButton.click()
                    page.waitForTimeout(3.seconds.toMillis)
                }
                    .when(pauseSessionBeforeClosingPage)
                    .debug("Pause the session before closing the page")

                // Close the browser page
                _ <- ZIO.attempt {
                    if runBeforeUnload
                        // XXX - executing page.close with `runBeforeUnload` doesn't actually run `onbeforeunload` event
                        // by some reason. Using the `page.reload()` method as a workaround.
                    then page.reload()
                    else page.close()
                }

                // Check subscription count
                _ <- ZIO.attempt(adminClient.topics.getSubscriptions(topic.fqn).asScala.size)
                    .debug(s"Subscription count after ${if runBeforeUnload then "gracefully" else "non-gracefully"} stopping the consumer session")
                    .filterOrFail(_ == 0)(new Exception("Subscription wasn't deleted"))
                    .retry(Schedule.spaced(250.millis))
                    .timeoutFail(new Exception("Subscription wasn't deleted in time"))(10.seconds)
            } yield ()

            for {
                _ <- runTest(runBeforeUnload = true, pauseSessionBeforeClosingPage = false)
                _ <- runTest(runBeforeUnload = true, pauseSessionBeforeClosingPage = true)

                _ <- runTest(runBeforeUnload = false, pauseSessionBeforeClosingPage = false)
                _ <- runTest(runBeforeUnload = false, pauseSessionBeforeClosingPage = true)
            } yield assertCompletes
        } @@ withLiveClock
    ).provideSomeShared(
        TestPulsar.live,
        TestDekaf.live
    )
