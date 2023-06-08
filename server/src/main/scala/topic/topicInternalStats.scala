package topic

import org.apache.pulsar.common.policies.data.{PartitionedTopicInternalStats, PersistentTopicInternalStats}
import com.tools.teal.pulsar.ui.topic.v1.topic as topicPb
import org.apache.pulsar.client.admin.PulsarAdmin

type TopicInternalStatsPb = topicPb.PersistentTopicInternalStats | topicPb.PartitionedTopicInternalStats
def getTopicInternalStatsPb(pulsarAdmin: PulsarAdmin, topic: String): Either[String, TopicInternalStatsPb] =
    getTopicType(pulsarAdmin, topic) match
        case Right(_: NonPartitionedTopic) =>
            getNonPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(persistentTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Right(_: PartitionedTopic) =>
            getPartitionedTopicInternalStats(pulsarAdmin, topic) match
                case Right(stats) => Right(partitionedTopicInternalStatsToPb(stats))
                case _            => Left(s"Unable to get stats for topic: $topic")
        case Left(error) => Left(error)

case class PartitionedTopic()
case class NonPartitionedTopic()
type TopicType = Either[String, PartitionedTopic | NonPartitionedTopic]
def getTopicType(pulsarAdmin: PulsarAdmin, topic: String): TopicType =
    // XXX - Pulsar admin .lookup() is truthy both for partitioned and non-partitioned topics.
    // Therefore, the of lookups matters here.
    val isPartitioned =
        try {
            pulsarAdmin.lookups().lookupPartitionedTopic(topic)
            true
        } catch {
            case _ => false
        }
    if isPartitioned then return Right(PartitionedTopic())

    val isNonPartitioned =
        try {
            pulsarAdmin.lookups().lookupTopic(topic)
            true
        } catch {
            case _ => false
        }
    if isNonPartitioned then return Right(NonPartitionedTopic())

    Left("Topic not found")

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
