package consumer.session_runner

import consumer.session_target.ConsumerSessionTarget
import consumer.session_target.consumption_mode.modes.ReadCompactedConsumptionMode
import org.apache.pulsar.client.api.*

import scala.jdk.CollectionConverters.*

def buildConsumer(
    pulsarClient: PulsarClient,
    consumerName: String,
    topicsToConsume: Vector[String],
    listener: MessageListener[Array[Byte]],
    targetConfig: ConsumerSessionTarget
): Either[String, ConsumerBuilder[Array[Byte]]] =
    val isReadCompacted = targetConfig.consumptionMode.mode match
        case _: ReadCompactedConsumptionMode => true
        case _ => false

    val consumer = pulsarClient.newConsumer
        .consumerName(consumerName)
        .receiverQueueSize(500)
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
        .readCompacted(isReadCompacted)
        .topics(topicsToConsume.asJava)

    Right(consumer)
