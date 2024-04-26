package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import _root_.topic.{getTopicPartitioning, getTopicPartitions, TopicPartitioningType}
import scala.util.{Failure, Success, Try}

case class MultiTopicSelector(topicFqns: Vector[String]):
    def getTopics: Vector[String] = topicFqns.distinct

    def getNonPartitionedTopics(adminClient: PulsarAdmin): Vector[String] =
        topicFqns.flatMap { topicFqn =>
            Try({ getTopicPartitioning(adminClient, topicFqn).`type` }) match
                case Success(topicPartitioning) => topicPartitioning match
                        case TopicPartitioningType.Partitioned =>
                            /* XXX - Create missed partitions before returning the partitions list.
                            * In case we start consume partitioned topic without active partitions,
                            * and producer some messages to it, we'll don't see any messages.
                             */
                            Try(adminClient.topics().createMissedPartitions(topicFqn))

                            val partitions = getTopicPartitions(adminClient, topicFqn)
                            partitions
                        case TopicPartitioningType.NonPartitioned => Vector(topicFqn)
                case Failure(_) =>
                    println(s"Failed to get topic partitioning for topic $topicFqn")
                    Vector.empty
        }.distinct

object MultiTopicSelector:
    def fromPb(v: pb.MultiTopicSelector): MultiTopicSelector =
        MultiTopicSelector(topicFqns = v.topicFqns.toVector)

    def toPb(v: MultiTopicSelector): pb.MultiTopicSelector =
        pb.MultiTopicSelector(topicFqns = v.topicFqns)
