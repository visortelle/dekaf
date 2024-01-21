package topic

import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import org.apache.pulsar.client.admin.{Mode, PulsarAdmin}

import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

type TopicInternalStatsPb = topicPb.PersistentTopicInternalStats | topicPb.PartitionedTopicInternalStats

def getTopicInternalStatsPb(pulsarAdmin: PulsarAdmin, topic: String): Either[String, TopicInternalStatsPb] =
    Try({ getTopicPartitioning(pulsarAdmin, topic).`type` }) match
        case Success(TopicPartitioningType.NonPartitioned) =>
            getNonPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(persistentTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Success(TopicPartitioningType.Partitioned) =>
            getPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(partitionedTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Failure(err) => Left(err.getMessage)

enum TopicPartitioningType:
    case Partitioned, NonPartitioned
case class TopicPartitioning(
    `type`: TopicPartitioningType,
    partitionsCount: Option[Int],
    activePartitionsCount: Option[Int]
)

def getTopicPartitioning(pulsarAdmin: PulsarAdmin, topicFqn: String): TopicPartitioning =
    var partitionsCount: Option[Int] = None
    var activePartitionsCount: Option[Int] = None

    val isPartitioned =
        try
            val topicMetadata = pulsarAdmin.topics().getPartitionedTopicMetadata(topicFqn)
            partitionsCount = Some(topicMetadata.partitions)
            val isPartitioned = topicMetadata.partitions > 0

            if isPartitioned then
                val getTopicsOptions = org.apache.pulsar.client.admin.ListNamespaceTopicsOptions
                    .builder
                    .includeSystemTopic(true)
                    .mode(Mode.ALL)
                    .build()

                val topicFqnChunks = topicFqn.split("/")
                val persistency = topicFqnChunks(0).dropRight(1)
                val namespace = topicFqnChunks(2) + "/" + topicFqnChunks(3)
                val topic = topicFqnChunks(4)

                val namespaceTopics = pulsarAdmin.namespaces.getTopics(namespace, getTopicsOptions).asScala.toVector

                val partitionRegexPattern = "^" + persistency + "://.*/" + topic + "-partition-\\d+$"
                val activePartitions = namespaceTopics.filter(_.matches(partitionRegexPattern))
                activePartitionsCount = Some(activePartitions.size)

            isPartitioned
        catch {
            case _: Throwable => false
        }

    if isPartitioned then
        return TopicPartitioning(
            `type` = TopicPartitioningType.Partitioned,
            partitionsCount = partitionsCount,
            activePartitionsCount = activePartitionsCount
        )

    val isNonPartitioned =
        try
            pulsarAdmin.topics().getStats(topicFqn)
            true
        catch {
            case _: Throwable => false
        }
    if isNonPartitioned then return TopicPartitioning(
        `type` = TopicPartitioningType.NonPartitioned,
        partitionsCount = None,
        activePartitionsCount = activePartitionsCount

    )
    throw new Exception(s"Topic \"$topicFqn\" not found")

def getTopicPartitions(pulsarAdmin: PulsarAdmin, topicFqn: String): Vector[String] =
    val Array(topicPersistency, restFqn) = topicFqn.split("://")
    val Array(tenant, namespace, topic) = restFqn.split("/")
    val namespaceFqn = s"$tenant/$namespace"
    val nonPartitionedTopics = pulsarAdmin.topics.getList(namespaceFqn).asScala.toVector
    val partitionRegex = s"^$topicPersistency:\\/\\/$tenant/$namespace/$topic-partition-[0-9]+$$".r
    nonPartitionedTopics.filter(t => partitionRegex.matches(t))

def getNonPartitionedTopicInternalStats(pulsarAdmin: PulsarAdmin, topic: String): Either[String, PersistentTopicInternalStats] =
    try {
        val stats = pulsarAdmin.topics.getInternalStats(topic)
        Right(stats)
    } catch {
        case err => Left(err.getMessage)
    }

def getPartitionedTopicInternalStats(pulsarAdmin: PulsarAdmin, topic: String): Either[String, PartitionedTopicInternalStats] =
    try {
        val stats = pulsarAdmin.topics.getPartitionedInternalStats(topic)
        Right(stats)
    } catch {
        case err => Left(err.getMessage)
    }
