package consumer

import zio.*
import org.apache.pulsar.client.api.{Consumer as PulsarConsumer, PulsarClient}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import org.apache.pulsar.client.api.{SubscriptionInitialPosition, SubscriptionMode, SubscriptionType}

case class ConsumerSessionConsumer(
    messageFilterContext: MessageFilterContext,
    startFrom: ConsumerSessionStartFrom,
    messageFilterChain: MessageFilterChain,
    pulsarConsumer: PulsarConsumer[Array[Byte]],
    listenerRef: Ref[TopicMessageListener],
    processedMessagesCountRef: Ref[Long]
):
    def pause(): Task[Unit] = ???
    def resume(): Task[Unit] = ???
    def stop(): Task[Unit] = ???
//    def setListener(listener: TopicMessageListener): Task[Unit] = listenerRef.set(listener)

object ConsumerSessionConsumer:
    def createFromPb(
        pulsarClient: PulsarClient,
        pulsarAdmin: PulsarAdmin,
        consumerId: String,
        configPb: pb.ConsumerSessionConsumerConfig,
        messageFilterContext: MessageFilterContext
    ): Task[ConsumerSessionConsumer] = for {
        listenerRef <- Ref.make(TopicMessageListener(StreamDataHandler(onNext = _ => ())))
        listener <- listenerRef.get

        processedMessagesCountRef <- Ref.make(0L)

        pulsarConsumer <- ZIO.attempt {
            pulsarClient.newConsumer
                .consumerName(consumerId)
                .subscriptionName(consumerId)
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
                .subscriptionMode(SubscriptionMode.NonDurable)
                .subscriptionType(SubscriptionType.Exclusive)
                .priorityLevel(1000)
                .subscribe()
        }

        startFrom <- ZIO.attempt(configPb.startFrom.map(consumerSessionStartFromFromPb).getOrElse(EarliestMessage()))
//        _ <- handleStartFrom(pulsarConsumer, startFrom)

        messageFilterChain <- ZIO.attempt(messageFilterChainFromPb(configPb.messageFilterChain.get))
    } yield ConsumerSessionConsumer(
        messageFilterContext = messageFilterContext,
        startFrom = startFrom,
        messageFilterChain = messageFilterChain,
        pulsarConsumer = pulsarConsumer,
        listenerRef = listenerRef,
        processedMessagesCountRef = processedMessagesCountRef
    )

//    private def handleStartFrom(consumer: PulsarConsumer[Array[Byte]], startFrom: ConsumerSessionStartFrom): Task[Unit] = for {
//        _ <- ZIO.attempt {
//            consumer.resume()
//
//            val mainTopic = topicsToConsume.head
//            val subscriptionName = consumer.getSubscription
//
//            startFrom match
//                case _: EarliestMessage =>
//                    consumer.seek(PulsarMessageId.earliest)
//                case _: LatestMessage =>
//                    consumer.seek(PulsarMessageId.latest)
//                case v: NthMessageAfterEarliest =>
//                    val message = adminClient.topics.examineMessage(mainTopic, "earliest", v.n)
//                    consumer.seek(message.getMessageId)
//                case v: NthMessageBeforeLatest =>
//                    topicsToConsume.foreach { topicFqn =>
//                        val message = adminClient.topics.examineMessage(topicFqn, "latest", v.n)
//                        adminClient.topics.resetCursor(topicFqn, subscriptionName, message.getMessageId)
//                    }
//                case v: MessageId =>
//                    val messageId = PulsarMessageId.fromByteArrayWithTopic(v.messageId, mainTopic)
//                    consumer.seek(messageId)
//                case v: DateTime =>
//                    val timestamp = v.dateTime.toEpochMilli
//                    consumer.seek(timestamp)
//                case v: RelativeDateTime =>
//                    val now = ZonedDateTime.now()
//                    val dateTime = v.unit match
//                        case DateTimeUnit.Year =>
//                            val dt = now.minusYears(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.YEARS) else dt
//                        case DateTimeUnit.Month =>
//                            val dt = now.minusMonths(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MONTHS) else dt
//                        case DateTimeUnit.Week =>
//                            val dt = now.minusWeeks(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.WEEKS) else dt
//                        case DateTimeUnit.Day =>
//                            val dt = now.minusDays(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.DAYS) else dt
//                        case DateTimeUnit.Hour =>
//                            val dt = now.minusHours(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.HOURS) else dt
//                        case DateTimeUnit.Minute =>
//                            val dt = now.minusMinutes(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MINUTES) else dt
//                        case DateTimeUnit.Second =>
//                            val dt = now.minusSeconds(v.value)
//                            if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.SECONDS) else dt
//                    consumer.seek(dateTime.toInstant.toEpochMilli)
//
//            consumer.pause()
//        }
//    } yield ()
