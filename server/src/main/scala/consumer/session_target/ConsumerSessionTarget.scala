package consumer.session_target

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.coloring_rules.ColoringRuleChain
import _root_.consumer.session_target.topic_selector.TopicSelector
import _root_.consumer.value_projections.ValueProjectionList
import _root_.consumer.session_target.consumption_mode.ConsumerSessionTargetConsumptionMode
import _root_.consumer.deserializer.Deserializer

case class ConsumerSessionTarget(
    isEnabled: Boolean,
    consumptionMode: ConsumerSessionTargetConsumptionMode,
    messageValueDeserializer: Deserializer,
    topicSelector: TopicSelector,
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain,
    valueProjectionList: ValueProjectionList
)

object ConsumerSessionTarget:
    /** Each field under its own name, so the caller's `targets[n]` prefix composes into a full path
      * - see [[_root_.consumer.atProtoField]]. */
    def fromPb(v: pb.ConsumerSessionTarget): ConsumerSessionTarget =
        ConsumerSessionTarget(
            isEnabled = v.isEnabled,
            consumptionMode = _root_.consumer.atProtoField("consumption_mode")(ConsumerSessionTargetConsumptionMode.fromPb(v.getConsumptionMode)),
            messageValueDeserializer =
                _root_.consumer.atProtoField("message_value_deserializer")(Deserializer.fromPb(v.getMessageValueDeserializer)),
            topicSelector = _root_.consumer.atProtoField("topic_selector")(TopicSelector.fromPb(v.getTopicSelector)),
            messageFilterChain = _root_.consumer.atProtoField("message_filter_chain")(MessageFilterChain.fromPb(v.getMessageFilterChain)),
            coloringRuleChain = _root_.consumer.atProtoField("coloring_rule_chain")(ColoringRuleChain.fromPb(v.getColoringRuleChain)),
            valueProjectionList = _root_.consumer.atProtoField("value_projection_list")(ValueProjectionList.fromPb(v.getValueProjectionList))
        )

    def toPb(v: ConsumerSessionTarget): pb.ConsumerSessionTarget =
        pb.ConsumerSessionTarget(
            isEnabled = v.isEnabled,
            consumptionMode = Some(ConsumerSessionTargetConsumptionMode.toPb(v.consumptionMode)),
            messageValueDeserializer = Some(Deserializer.toPb(v.messageValueDeserializer)),
            topicSelector = Some(TopicSelector.toPb(v.topicSelector)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ColoringRuleChain.toPb(v.coloringRuleChain)),
            valueProjectionList = Some(ValueProjectionList.toPb(v.valueProjectionList))
        )
