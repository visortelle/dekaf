package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import _root_.topic.{getIsPartitionedTopic, getTopicPartitions, TopicPartitioning}
import scala.util.{Failure, Success, Try}

case class MultiTopicSelector(topicFqns: Vector[String]):
    def getNonPartitionedTopics(adminClient: PulsarAdmin): Vector[String] =
        topicFqns.flatMap { topicFqn =>
            Try(getIsPartitionedTopic(adminClient, topicFqn)) match
                case Success(topicPartitioning) => topicPartitioning match
                        case TopicPartitioning.Partitioned =>
                            val partitions = getTopicPartitions(adminClient, topicFqn)
                            partitions
                        case TopicPartitioning.NonPartitioned => Vector(topicFqn)
                case Failure(_) =>
                    println(s"Failed to get topic partitioning for topic $topicFqn")
                    Vector.empty
        }.distinct

object MultiTopicSelector:
    def fromPb(v: pb.MultiTopicSelector): MultiTopicSelector =
        MultiTopicSelector(topicFqns = v.topicFqns.toVector)

    def toPb(v: MultiTopicSelector): pb.MultiTopicSelector =
        pb.MultiTopicSelector(topicFqns = v.topicFqns)
