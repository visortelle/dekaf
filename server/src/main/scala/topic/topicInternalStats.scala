package topic

import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import org.apache.pulsar.client.admin.PulsarAdmin
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

type TopicInternalStatsPb = topicPb.PersistentTopicInternalStats | topicPb.PartitionedTopicInternalStats
def getTopicInternalStatsPb(pulsarAdmin: PulsarAdmin, topic: String): Either[String, TopicInternalStatsPb] =
    Try(getIsPartitionedTopic(pulsarAdmin, topic)) match
        case Success(TopicPartitioning.NonPartitioned) =>
            getNonPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(persistentTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Success(TopicPartitioning.Partitioned) =>
            getPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(partitionedTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Failure(err) => Left(err.getMessage)

enum TopicPartitioning:
    case Partitioned, NonPartitioned

def getIsPartitionedTopic(pulsarAdmin: PulsarAdmin, topicFqn: String): TopicPartitioning =
    val isPartitioned =
        try {
            pulsarAdmin.topics().getPartitionedTopicMetadata(topicFqn).partitions > 0
        } catch {
            case _: Throwable => false
        }
    if isPartitioned then return TopicPartitioning.Partitioned

    val isNonPartitioned =
        try
            pulsarAdmin.topics().getStats(topicFqn)
            true
        catch {
            case _: Throwable => false
        }
    if isNonPartitioned then return TopicPartitioning.NonPartitioned
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
