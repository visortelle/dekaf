package consumer.consumer_session

import consumer.consumer_session.page.ConsumerSessionPageHtml
import consumer.start_from.EarliestMessage
import library.{LibraryItem, LibraryItemGen, ManagedItemGen}
import library.managed_items.{ManagedConsumerSessionConfig, ManagedConsumerSessionConfigSpec, ManagedConsumerSessionConfigSpecGen, ManagedConsumerSessionConfigValOrRef, ManagedConsumerSessionStartFrom, ManagedConsumerSessionStartFromSpecGen}
import zio.*
import zio.test.*
import zio.test.Assertion.*
import testing.{TestDekaf, TestPulsar}
import org.apache.pulsar.client.api.{MessageListener, Schema, SubscriptionInitialPosition}
import monocle.syntax.all.*

import java.util.UUID

object ConsumerSessionTest extends ZIOSpecDefault:
    def spec = suite(this.getClass.getName)(
        test("User accidentally disconnects without gracefully stopping the consumer session") {
            /*
            The consumer session's subscription and it's consumer are still active after
            the user accidentally disconnects.
            There are also error logs about trying to send a message to a closed gRPC stream observer.
            It may happen if the user closes an inactive browser tab with a running consumer session.

            **How to reproduce**

            Run a new consumer session on a topic with an active producer.
            Manually close the running consumer session tab in the Chrome task manager.

            **What to expect**

            There should be no exceptions in Dekaf logs.
            Subscription should be deleted.
             * */

            val startValue = 100L
            val numMessages = 100_000

            // Construct a ConsumerSession that we'll use to reproduce the issue
            var sessionSpec = ManagedConsumerSessionConfigSpecGen.currentTopic
            sessionSpec = sessionSpec
                .focus(_.startFrom.value)
                .replace(Some(
                    ManagedItemGen.fromSpec(ManagedConsumerSessionStartFromSpecGen.fromVariant(
                        EarliestMessage()
                    )).asInstanceOf[ManagedConsumerSessionStartFrom]
                ))

            val sessionLibraryItem = LibraryItemGen.fromManagedItemSpec(sessionSpec)

            for {
                pulsar <- ZIO.service[TestPulsar]
                pulsarClient <- pulsar.createPulsarClient
                topic <- pulsar.createTopic

                // Generate messages
                producer <- ZIO.attempt(pulsarClient.newProducer(Schema.INT64).topic(topic.fqn).create())
                _ <- ZIO.attempt {
                    for (i <- 0 until numMessages)
                        producer.sendAsync(startValue + i)
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

                _ <- ZIO.attempt(consumerSessionPage.startButton.click())
                _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v > (numMessages * 0.15).floor.toLong)
                _ <- ZIO.attempt(consumerSessionPage.pauseButton.click())

                _ <- ZIO.attempt(consumerSessionPage.startButton.click())
                _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v > (numMessages * 0.5).floor.toLong)
                _ <- ZIO.attempt(consumerSessionPage.pauseButton.click())

                _ <- ZIO.attempt(consumerSessionPage.startButton.click())
                _ <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v >= numMessages)
                _ <- ZIO.attempt(page.waitForTimeout(3.seconds.toMillis))

                messagesProcessed <- ZIO.attempt(consumerSessionPage.messagesProcessed).repeatUntil(v => v >= numMessages)
            } yield assertTrue(messagesProcessed == numMessages)
        }
    ).provideSomeShared(
        TestPulsar.live,
        TestDekaf.live
    )
