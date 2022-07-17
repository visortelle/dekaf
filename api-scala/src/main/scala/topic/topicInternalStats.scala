package topic

import _root_.client.{adminClient, client}
import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.api.v1.topic as topicPb

type TopicInternalStatsPb = topicPb.PersistentTopicInternalStats | topicPb.PartitionedTopicInternalStats
def getTopicInternalStatsPb(topic: String): Either[String, TopicInternalStatsPb] =
    getTopicType(topic) match
        case Right(_: NonPartitionedTopic) =>
            getNonPartitionedTopicInternalStats(topic) match
                case Right(stats) => Right(persistentTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Right(_: PartitionedTopic) =>
            getPartitionedTopicInternalStats(topic) match
                case Right(stats) => Right(partitionedTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Left(error) => Left(error)

case class PartitionedTopic()
case class NonPartitionedTopic()
type TopicType = Either[String, PartitionedTopic | NonPartitionedTopic]
def getTopicType(topic: String): TopicType =
    // XXX - Pulsar admin .lookup() is truthy both for partitioned and non-partitioned topics.
    // Therefore, the of lookups matters here.

    val isPartitioned =
        try {
            adminClient.lookups().lookupPartitionedTopic(topic)
            true
        } catch {
            case _ => false
        }
    if isPartitioned then return Right(PartitionedTopic())

    val isNonPartitioned =
        try {
            val b = adminClient.lookups().lookupTopic(topic)
            true
        } catch {
            case _ => false
        }
    if isNonPartitioned then return Right(NonPartitionedTopic())

    Left("Topic not found")

def getNonPartitionedTopicInternalStats(topic: String): Either[String, PersistentTopicInternalStats] =
    try {
        val stats = adminClient.topics.getInternalStats(topic)
        Right(stats)
    } catch {
        case err => Left(err.getMessage)
    }

def getPartitionedTopicInternalStats(topic: String): Either[String, PartitionedTopicInternalStats] =
    try {
        val stats = adminClient.topics.getPartitionedInternalStats(topic)
        Right(stats)
    } catch {
        case err => Left(err.getMessage)
    }
