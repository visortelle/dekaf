package consumer

import org.apache.pulsar.client.admin.PulsarAdmin

import java.time.ZonedDateTime
import org.apache.pulsar.client.api.Consumer
import org.apache.pulsar.client.api.MessageId as PulsarMessageId
import org.apache.pulsar.client.api.Message as PulsarMessage
import _root_.topic.{getIsPartitionedTopic, TopicPartitioning}
import scala.util.{Failure, Success, Try}
import scala.jdk.CollectionConverters.*

def getPartitions(adminClient: PulsarAdmin, topicFqn: String): Vector[String] =
    val tenant = topicFqn.split('/')(2)
    val namespace = topicFqn.split('/')(3)
    val namespaceFqn = s"$tenant/$namespace"
    val partitions = adminClient.topics
        .getList(namespaceFqn)
        .asScala
        .filter(partitionFqn => partitionFqn.matches(s"$topicFqn-partition-\\d+"))
        .toVector
    partitions

def examineNonPartitionedTopicMessage(adminClient: PulsarAdmin, topicFqn: String, initialPosition: String, n: Long): Option[PulsarMessage[Array[Byte]]] =
    Try(adminClient.topics.examineMessage(topicFqn, initialPosition, n)).toOption

def examinePartitionedTopicMessage(adminClient: PulsarAdmin, topicFqn: String, initialPosition: String, n: Long): Option[PulsarMessage[Array[Byte]]] =
    val partitions = getPartitions(adminClient, topicFqn)
    partitions.flatMap(partitionFqn => examineNonPartitionedTopicMessage(adminClient, partitionFqn, initialPosition, n)) match
        case Vector() => None
        case candidates =>
            initialPosition match
                case "earliest" => Some(candidates.minBy(msg => msg.getPublishTime))
                case "latest"   => Some(candidates.maxBy(msg => msg.getPublishTime))

def findNthMessage(adminClient: PulsarAdmin, topicFqn: String, initialPosition: String, n: Long): Option[PulsarMessage[Array[Byte]]] =
    getIsPartitionedTopic(adminClient, topicFqn) match
        case TopicPartitioning.Partitioned =>
            examinePartitionedTopicMessage(adminClient, topicFqn, initialPosition, n)
        case TopicPartitioning.NonPartitioned =>
            examineNonPartitionedTopicMessage(adminClient, topicFqn, initialPosition, n)

def findNthMessageMultiTopic(adminClient: PulsarAdmin, topics: Vector[String], initialPosition: String, n: Long): Option[PulsarMessage[Array[Byte]]] =
    topics.flatMap(topicFqn => findNthMessage(adminClient, topicFqn, initialPosition, n)) match
        case Vector() => None
        case messages =>
            initialPosition match
                case "earliest" => Some(messages.minBy(msg => msg.getPublishTime))
                case "latest"   => Some(messages.maxBy(msg => msg.getPublishTime))

def getIsSinglePartitionedTopic(adminClient: PulsarAdmin, topics: Vector[String]): Boolean =
    topics.size == 1 && getIsPartitionedTopic(adminClient, topics.head) == TopicPartitioning.Partitioned

def handleStartFrom(startFrom: ConsumerSessionStartFrom, consumer: Consumer[Array[Byte]], adminClient: PulsarAdmin, topicsToConsume: Vector[String]): Unit =
    consumer.resume()

    startFrom match
        case _: EarliestMessage =>
            consumer.seek(PulsarMessageId.earliest)
        case _: LatestMessage =>
            consumer.seek(PulsarMessageId.latest)
        case v: NthMessageAfterEarliest =>
            val n = v.n + 1
            if getIsSinglePartitionedTopic(adminClient, topicsToConsume) then
                findNthMessage(adminClient, topicsToConsume.head, "earliest", n) match
                    case Some(message) => consumer.seek(message.getMessageId)
                    case None          => consumer.seek(PulsarMessageId.latest)
            else
                findNthMessageMultiTopic(adminClient, topicsToConsume, "earliest", n) match
                    case Some(message) => consumer.seek(message.getPublishTime)
                    case None          => consumer.seek(PulsarMessageId.latest)

        case v: NthMessageBeforeLatest =>
            val n = v.n
            if getIsSinglePartitionedTopic(adminClient, topicsToConsume) then
                findNthMessage(adminClient, topicsToConsume.head, "latest", n) match
                    case Some(message) => consumer.seek(message.getMessageId)
                    case None => consumer.seek(PulsarMessageId.earliest)
            else
                findNthMessageMultiTopic(adminClient, topicsToConsume, "latest", n) match
                    case Some(message) => consumer.seek(message.getPublishTime)
                    case None => consumer.seek(PulsarMessageId.earliest)

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
