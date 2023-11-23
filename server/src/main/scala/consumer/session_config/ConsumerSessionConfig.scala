package consumer.session_config

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.start_from.{ConsumerSessionStartFrom, EarliestMessage}
import _root_.consumer.session_target.ConsumerSessionTarget
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain
import _root_.consumer.coloring_rules.ColoringRuleChain

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionStartFrom,
    targets: Vector[ConsumerSessionTarget],
    messageFilterChain: MessageFilterChain,
    coloringRuleChain: ColoringRuleChain,
    pauseTriggerChain: ConsumerSessionPauseTriggerChain
)

object ConsumerSessionConfig:
    def fromPb(v: pb.ConsumerSessionConfig): ConsumerSessionConfig =
        ConsumerSessionConfig(
            startFrom = v.startFrom.map(ConsumerSessionStartFrom.fromPb).getOrElse(EarliestMessage()),
            targets = v.targets.map(ConsumerSessionTarget.fromPb).toVector,
            messageFilterChain = v.messageFilterChain
                .map(MessageFilterChain.fromPb)
                .getOrElse(MessageFilterChain.empty),
            coloringRuleChain = v.coloringRuleChain
                .map(ColoringRuleChain.fromPb)
                .getOrElse(ColoringRuleChain.empty),
            pauseTriggerChain = v.pauseTriggerChain
                .map(ConsumerSessionPauseTriggerChain.fromPb)
                .getOrElse(ConsumerSessionPauseTriggerChain.empty)
        )

    def toPb(v: ConsumerSessionConfig): pb.ConsumerSessionConfig =
        pb.ConsumerSessionConfig(
            startFrom = Some(ConsumerSessionStartFrom.toPb(v.startFrom)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ColoringRuleChain.toPb(v.coloringRuleChain)),
            pauseTriggerChain = Some(
                pb.ConsumerSessionPauseTriggerChain(
                    events = Vector.empty,
                    mode = pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL
                )
            )
        )
