package consumer

import java.time.{Instant, ZonedDateTime}
import org.apache.pulsar.client.api.{Consumer, MessageId}

def handleStartFrom(startFrom: ConsumerSessionConfigStartFrom, consumer: Consumer[Array[Byte]]): Unit =
    startFrom.value match
        case _: EarliestMessage => // Do nothing here. It's handled on the consumer creation.
        case _: LatestMessage   => // Do nothing here. It's handled on the consumer creation.
        case v: MessageId =>
            val messageId = MessageId.fromByteArray(v.messageId)
            consumer.seek(messageId)
        case v: DateTime =>
            val timestamp = v.dateTime.toEpochMilli
            consumer.seek(timestamp)
        case v: RelativeDateTime =>
            val now = ZonedDateTime.now()
            val dateTime = v.unit match
                case DateTimeUnit.Year =>
                    val dt = now.minusYears(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.YEARS) else dt
                case DateTimeUnit.Month =>
                    val dt = now.minusMonths(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MONTHS) else dt
                case DateTimeUnit.Week =>
                    val dt = now.minusWeeks(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.WEEKS) else dt
                case DateTimeUnit.Day =>
                    val dt = now.minusDays(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.DAYS) else dt
                case DateTimeUnit.Hour =>
                    val dt = now.minusHours(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.HOURS) else dt
                case DateTimeUnit.Minute =>
                    val dt = now.minusMinutes(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.MINUTES) else dt
                case DateTimeUnit.Second =>
                    val dt = now.minusSeconds(v.value)
                    if v.isRoundToUnitStart then dt.truncatedTo(java.time.temporal.ChronoUnit.SECONDS) else dt
            consumer.seek(dateTime.toInstant.toEpochMilli)
