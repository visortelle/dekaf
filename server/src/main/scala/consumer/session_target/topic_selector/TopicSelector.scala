package consumer.session_target.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TopicSelector(topicSelector: MultiTopicSelector | NamespacedRegexTopicSelector)

object TopicSelector:
    def fromPb(v: pb.TopicSelector): TopicSelector =
        v.topicSelector match
            case pb.TopicSelector.TopicSelector.MultiTopicSelector(v)           => TopicSelector(topicSelector = MultiTopicSelector.fromPb(v))
            case pb.TopicSelector.TopicSelector.NamespacedRegexTopicSelector(v) => TopicSelector(topicSelector = NamespacedRegexTopicSelector.fromPb(v))

    def toPb(v: TopicSelector): pb.TopicSelector =
        pb.TopicSelector(
            topicSelector = v.topicSelector match
                case v: MultiTopicSelector           => pb.TopicSelector.TopicSelector.MultiTopicSelector(MultiTopicSelector.toPb(v))
                case v: NamespacedRegexTopicSelector => pb.TopicSelector.TopicSelector.NamespacedRegexTopicSelector(NamespacedRegexTopicSelector.toPb(v))
        )
