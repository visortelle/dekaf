package consumer.topic.topic_selector

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TopicSelector(topicSelector: SingleTopicSelector | NamespacedRegexTopicSelector)

object TopicSelector:
    def fromPb(v: pb.TopicSelector): TopicSelector =
        v.topicSelector match
            case pb.TopicSelector.TopicSelector.SingleTopicSelector(v)          => TopicSelector(topicSelector = SingleTopicSelector.fromPb(v))
            case pb.TopicSelector.TopicSelector.NamespacedRegexTopicSelector(v) => TopicSelector(topicSelector = NamespacedRegexTopicSelector.fromPb(v))

    def toPb(v: TopicSelector): pb.TopicSelector =
        pb.TopicSelector(
            topicSelector = v.topicSelector match
                case v: SingleTopicSelector          => pb.TopicSelector.TopicSelector.SingleTopicSelector(SingleTopicSelector.toPb(v))
                case v: NamespacedRegexTopicSelector => pb.TopicSelector.TopicSelector.NamespacedRegexTopicSelector(NamespacedRegexTopicSelector.toPb(v))
        )
