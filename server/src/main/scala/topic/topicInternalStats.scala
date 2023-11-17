package topic

import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import org.apache.pulsar.client.admin.PulsarAdmin
import scala.util.{Success, Failure, Try}

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
    // XXX - Pulsar admin .lookup() is truthy both for partitioned and non-partitioned topics.
    // Therefore, the order of lookups matters here.
    val isPartitioned =
        try {
            pulsarAdmin.lookups().lookupPartitionedTopic(topicFqn)
            true
        } catch {
            case _ => false
        }
    if isPartitioned then return TopicPartitioning.Partitioned

    val isNonPartitioned =
        try {
            pulsarAdmin.lookups().lookupTopic(topicFqn)
            true
        } catch {
            case _ => false
        }
    if isNonPartitioned then return TopicPartitioning.NonPartitioned

    throw new Exception(s"Topic \"${topicFqn}\" not found")

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
