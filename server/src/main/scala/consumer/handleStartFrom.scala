package consumer

import org.apache.pulsar.client.admin.PulsarAdmin

import java.time.ZonedDateTime
import org.apache.pulsar.client.api.Consumer
import org.apache.pulsar.client.api.MessageId as PulsarMessageId

def handleStartFrom(startFrom: ConsumerSessionStartFrom, consumer: Consumer[Array[Byte]], adminClient: PulsarAdmin, topicFqn: String): Unit =
    consumer.resume()

    startFrom match
        case _: EarliestMessage => // Do nothing here. It's handled on the consumer creation.
        case _: LatestMessage   => // Do nothing here. It's handled on the consumer creation.
        case v: NMessagesAfterEarliest =>
            val message = adminClient.topics.examineMessage(topicFqn, "earliest", v.n)
            consumer.seek(message.getMessageId)
        case v: NMessagesBeforeLatest =>
            val message = adminClient.topics.examineMessage(topicFqn, "latest", v.n + 1)
            consumer.seek(message.getMessageId)
        case v: MessageId =>
            val messageId = PulsarMessageId.fromByteArray(v.messageId)
            consumer.seek(messageId)
        case v: DateTime =>
            val timestamp = v.dateTime.toEpochMilli
            consumer.seek(timestamp)
        case v: RelativeDateTime =>
            val now = ZonedDateTime.now()
            val dateTime = v.unit match
                case DateTimeUnit.Year =>
                    val dt = now.minusYears(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.YEARS) else dt
                case DateTimeUnit.Month =>
                    val dt = now.minusMonths(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MONTHS) else dt
                case DateTimeUnit.Week =>
                    val dt = now.minusWeeks(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.WEEKS) else dt
                case DateTimeUnit.Day =>
                    val dt = now.minusDays(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.DAYS) else dt
                case DateTimeUnit.Hour =>
                    val dt = now.minusHours(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.HOURS) else dt
                case DateTimeUnit.Minute =>
                    val dt = now.minusMinutes(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MINUTES) else dt
                case DateTimeUnit.Second =>
                    val dt = now.minusSeconds(v.value)
                    if v.isRoundedToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.SECONDS) else dt
            consumer.seek(dateTime.toInstant.toEpochMilli)

    consumer.pause()
