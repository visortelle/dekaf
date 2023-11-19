package consumer.session_target

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.coloring_rules.ColoringRuleChain
import consumer.session_target.topic_selector.TopicSelector

case class ConsumerSessionTarget(
    topicSelector: TopicSelector,
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain
)

object ConsumerSessionTarget:
    def fromPb(v: pb.ConsumerSessionTarget): ConsumerSessionTarget =
        ConsumerSessionTarget(
            topicSelector = TopicSelector.fromPb(v.getTopicSelector),
            messageFilterChain = MessageFilterChain.fromPb(v.getMessageFilterChain),
            coloringRuleChain = ColoringRuleChain.fromPb(v.getColoringRuleChain)
        )

    def toPb(v: ConsumerSessionTarget): pb.ConsumerSessionTarget =
        pb.ConsumerSessionTarget(
            topicSelector = Some(TopicSelector.toPb(v.topicSelector)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ColoringRuleChain.toPb(v.coloringRuleChain))
        )
