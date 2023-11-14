package consumer.topic.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class NamespacedRegexTopicSelector(namespaceFqn: String, pattern: String)

object NamespacedRegexTopicSelector:
    def fromPb(v: pb.NamespacedRegexTopicSelector): NamespacedRegexTopicSelector =
        NamespacedRegexTopicSelector(namespaceFqn = v.namespaceFqn, pattern = v.pattern)

    def toPb(v: NamespacedRegexTopicSelector): pb.NamespacedRegexTopicSelector =
        pb.NamespacedRegexTopicSelector(namespaceFqn = v.namespaceFqn, pattern = v.pattern)
