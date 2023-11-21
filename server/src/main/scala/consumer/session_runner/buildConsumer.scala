package consumer.session_runner

import org.apache.pulsar.client.api.*
import scala.jdk.CollectionConverters.*

def buildConsumer(
    pulsarClient: PulsarClient,
    consumerName: String,
    topicsToConsume: Vector[String],
    listener: MessageListener[Array[Byte]]
): Either[String, ConsumerBuilder[Array[Byte]]] =
    val consumer = pulsarClient.newConsumer
        .consumerName(consumerName)
        .receiverQueueSize(1000) // Too big queue causes long time messages loading after consumer pause.
        .autoScaledReceiverQueueSizeEnabled(true)
        .autoUpdatePartitions(true)
        .maxPendingChunkedMessage(2)
        .autoAckOldestChunkedMessageOnQueueFull(true)
        .expireTimeOfIncompleteChunkedMessage(1, java.util.concurrent.TimeUnit.MINUTES)
        .negativeAckRedeliveryDelay(0, java.util.concurrent.TimeUnit.SECONDS)
        .messageListener(listener)
        .startMessageIdInclusive()
        .subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
        .startPaused(true)
        .subscriptionName(consumerName)
        .subscriptionMode(SubscriptionMode.NonDurable)
        .subscriptionType(SubscriptionType.Exclusive)
        .priorityLevel(1000)
        .topics(topicsToConsume.asJava)

    Right(consumer)
