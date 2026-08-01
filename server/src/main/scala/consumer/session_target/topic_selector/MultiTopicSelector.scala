package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import _root_.topic.{getTopicPartitioning, getTopicPartitions, TopicPartitioningType}
import scala.util.{Failure, Success, Try}

case class MultiTopicSelector(topicFqns: Vector[String]):
    def getNonPartitionedTopics(adminClient: PulsarAdmin): Vector[String] =
        topicFqns.flatMap { topicFqn =>
            Try({ getTopicPartitioning(adminClient, topicFqn).`type` }) match
                case Success(topicPartitioning) => topicPartitioning match
                        case TopicPartitioningType.Partitioned =>
                            val partitions = getTopicPartitions(adminClient, topicFqn)
                            partitions
                        case TopicPartitioningType.NonPartitioned => Vector(topicFqn)
                case Failure(err) =>
                    // Swallowing this DROPPED the topic from the selection. The user named these
                    // FQNs explicitly, so silently consuming from a subset is wrong - and when
                    // every topic was unresolvable (unreachable broker, topic deleted between the
                    // picker and the session) the selector returned an empty vector, which the
                    // session runner accepted as a consumer-less session reported to the UI as OK.
                    // The sibling NamespacedRegexTopicSelector has always let these propagate.
                    throw new RuntimeException(s"Failed to resolve topic $topicFqn. ${err.getMessage}", err)
        }.distinct

object MultiTopicSelector:
    def fromPb(v: pb.MultiTopicSelector): MultiTopicSelector =
        MultiTopicSelector(topicFqns = v.topicFqns.toVector)

    def toPb(v: MultiTopicSelector): pb.MultiTopicSelector =
        pb.MultiTopicSelector(topicFqns = v.topicFqns)
