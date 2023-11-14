package consumer.topic

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.topic.topic_selector.TopicSelector
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.coloring_rules.ColoringRuleChain

case class ConsumerSessionTopic(
    topicSelector: TopicSelector,
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain
)

object ConsumerSessionTopic:
    def fromPb(v: pb.ConsumerSessionTopic): ConsumerSessionTopic =
        ConsumerSessionTopic(
            topicSelector = TopicSelector.fromPb(v.getTopicSelector),
            messageFilterChain = MessageFilterChain.fromPb(v.getMessageFilterChain),
            coloringRuleChain = ColoringRuleChain.fromPb(v.getColoringRuleChain)
        )

    def toPb(v: ConsumerSessionTopic): pb.ConsumerSessionTopic =
        pb.ConsumerSessionTopic(
            topicSelector = Some(TopicSelector.toPb(v.topicSelector)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ColoringRuleChain.toPb(v.coloringRuleChain))
        )
