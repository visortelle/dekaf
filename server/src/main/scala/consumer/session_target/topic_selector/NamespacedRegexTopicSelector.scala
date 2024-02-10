package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.admin.PulsarAdmin
import scala.jdk.CollectionConverters.*
import _root_.topic.{getTopicPartitioning, getTopicPartitions, TopicPartitioningType}
import org.apache.pulsar.common.naming.TopicDomain

case class NamespacedRegexTopicSelector(namespaceFqn: String, pattern: String, regexSubscriptionMode: RegexSubscriptionMode):
    def getNonPartitionedTopics(adminClient: PulsarAdmin): Vector[String] =
        val namespaceTopicFqns = regexSubscriptionMode match
            case RegexSubscriptionMode.PersistentOnly =>
                adminClient.topics().getList(namespaceFqn, TopicDomain.persistent).asScala.toVector
            case RegexSubscriptionMode.NonPersistentOnly =>
                adminClient.topics().getList(namespaceFqn, TopicDomain.non_persistent).asScala.toVector
            case RegexSubscriptionMode.All =>
                val persistentTopicFqns = adminClient.topics().getList(namespaceFqn, TopicDomain.persistent).asScala.toVector
                val nonPersistentTopicFqns = adminClient.topics().getList(namespaceFqn, TopicDomain.non_persistent).asScala.toVector
                persistentTopicFqns ++ nonPersistentTopicFqns

        val matchedTopicFqns = namespaceTopicFqns.filter(topicFqn =>
            val Array(_, restFqn) = topicFqn.split("://")
            val Array(_, _, topic) = restFqn.split("/")
            topic.matches(pattern)
        )

        matchedTopicFqns.flatMap { topicFqn =>
            getTopicPartitioning(adminClient, topicFqn).`type` match
                case TopicPartitioningType.Partitioned    => getTopicPartitions(adminClient, topicFqn)
                case TopicPartitioningType.NonPartitioned => Vector(topicFqn)
        }.distinct

object NamespacedRegexTopicSelector:
    def fromPb(v: pb.NamespacedRegexTopicSelector): NamespacedRegexTopicSelector =
        NamespacedRegexTopicSelector(
            namespaceFqn = v.namespaceFqn,
            pattern = v.pattern,
            regexSubscriptionMode = RegexSubscriptionMode.fromPb(v.regexSubscriptionMode)
        )

    def toPb(v: NamespacedRegexTopicSelector): pb.NamespacedRegexTopicSelector =
        pb.NamespacedRegexTopicSelector(
            namespaceFqn = v.namespaceFqn,
            pattern = v.pattern,
            regexSubscriptionMode = RegexSubscriptionMode.toPb(v.regexSubscriptionMode)
        )
