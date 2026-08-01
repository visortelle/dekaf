package consumer.session_runner

import consumer.session_target.ConsumerSessionTarget
import consumer.session_target.consumption_mode.modes.ReadCompactedConsumptionMode
import org.apache.pulsar.client.api.*
import org.apache.pulsar.client.impl.MultiplierRedeliveryBackoff

import scala.jdk.CollectionConverters.*

/** The client-side prefetch budget one TARGET may spend across all its topic consumers, in
  * messages. A flat 2000-per-consumer receiver queue scaled the session's prefetch memory with
  * the topic count - a 1000-topic regex selector configured ~2 million prefetched messages
  * (payloads included) before anything was even shown. The budget divides across the target's
  * consumers instead, floored so a huge selector still makes progress and capped at the old
  * per-consumer value so small sessions keep their throughput. */
val receiverQueueBudgetPerTarget: Int = 20_000
val receiverQueueMin: Int = 50
val receiverQueueMax: Int = 2_000

/** The per-consumer receiver queue for a target consuming `topicCount` topics: the budget divided
  * evenly, clamped to [[receiverQueueMin]]..[[receiverQueueMax]]. */
def receiverQueueSizeFor(topicCount: Int): Int =
    val even = receiverQueueBudgetPerTarget / (topicCount max 1)
    even.max(receiverQueueMin).min(receiverQueueMax)

def buildConsumer(
    pulsarClient: PulsarClient,
    consumerName: String,
    topicsToConsume: Vector[String],
    listener: MessageListener[Array[Byte]],
    targetConfig: ConsumerSessionTarget,
    receiverQueueSize: Int = receiverQueueMax
): Either[String, ConsumerBuilder[Array[Byte]]] =
    val isReadCompacted = targetConfig.consumptionMode.mode match
        case _: ReadCompactedConsumptionMode => true
        case _ => false

    val consumer = pulsarClient.newConsumer
        .consumerName(consumerName)
        .receiverQueueSize(receiverQueueSize)
        .autoUpdatePartitions(true)
        .maxPendingChunkedMessage(2)
        .autoAckOldestChunkedMessageOnQueueFull(true)
        .expireTimeOfIncompleteChunkedMessage(1, java.util.concurrent.TimeUnit.MINUTES)
        // DECAYING redelivery, not a flat delay. The old `negativeAckRedeliveryDelay(0, SECONDS)`
        // is floored to 100ms by the client, which turned every sustained nack source into a
        // ten-per-second redelivery hammer with no exit - and nacks are routine here: a paused
        // session nacks everything it receives, and a delivery that throws mid-batch is handed
        // back the same way. The first redelivery still comes at 100ms - pause/resume feels as
        // immediate as before - while a message bounced over and over backs off toward a 10s
        // ceiling, so a sustained source decays instead of hammering. (The start-from merge used
        // to be the loudest source, nacking whatever it declined at its memory cap; it now PAUSES
        // hot consumers instead and declines nothing.)
        .negativeAckRedeliveryBackoff(MultiplierRedeliveryBackoff.builder.minDelayMs(100).maxDelayMs(10_000).build)
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
