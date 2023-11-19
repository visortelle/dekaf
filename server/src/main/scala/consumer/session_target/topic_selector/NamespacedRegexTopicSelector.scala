package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import scala.jdk.CollectionConverters.*
import _root_.topic.{TopicPartitioning, getIsPartitionedTopic, getTopicPartitions}

case class NamespacedRegexTopicSelector(namespaceFqn: String, pattern: String):
    def getNonPartitionedTopics(adminClient: PulsarAdmin): Vector[String] =
        val namespaceTopicFqns = adminClient.topics().getList(namespaceFqn).asScala.toVector
        val matchedTopicFqns = namespaceTopicFqns.filter(topicFqn =>
            val Array(_, restFqn) = topicFqn.split("://")
            val Array(_, _, topic) = restFqn.split("/")
            topic.matches(pattern)
        )

        matchedTopicFqns.flatMap { topicFqn =>
            getIsPartitionedTopic(adminClient, topicFqn) match
                case TopicPartitioning.Partitioned => getTopicPartitions(adminClient, topicFqn)
                case TopicPartitioning.NonPartitioned => Vector(topicFqn)
        }.distinct

object NamespacedRegexTopicSelector:
    def fromPb(v: pb.NamespacedRegexTopicSelector): NamespacedRegexTopicSelector =
        NamespacedRegexTopicSelector(namespaceFqn = v.namespaceFqn, pattern = v.pattern)

    def toPb(v: NamespacedRegexTopicSelector): pb.NamespacedRegexTopicSelector =
        pb.NamespacedRegexTopicSelector(namespaceFqn = v.namespaceFqn, pattern = v.pattern)
