package consumer.consumer_session

import zio.*
import zio.test.*
import zio.test.Assertion.*
import testing.{TestDekaf, TestPulsar}
import org.apache.pulsar.client.api.{MessageListener, Schema, SubscriptionInitialPosition}

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

            for {
                pulsar <- ZIO.service[TestPulsar]
                pulsarAdmin <- pulsar.createAdminClient
                pulsarClient <- pulsar.createPulsarClient
                topicFqn <- pulsar.createTopic
                producer <- ZIO.attempt(pulsarClient.newProducer(Schema.INT64).topic(topicFqn).create())
                _ <- ZIO.attempt {
                    for (i <- 0 until numMessages)
                        producer.sendAsync(startValue + i)
                }
                consumer <- ZIO.attempt {
                    pulsarClient.newConsumer(Schema.INT64)
                        .topic(topicFqn)
                        .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
                        .subscriptionName("test")
                        .subscribe()
                }
                _ <- (for {
                    msg <- ZIO.attempt(consumer.receive())
                } yield ()).repeatN(numMessages - 1)

                dekaf <- ZIO.service[TestDekaf]
            } yield assertTrue(2 == 2)
        }
    ).provideSomeShared(
        TestPulsar.live,
        TestDekaf.live
    )
