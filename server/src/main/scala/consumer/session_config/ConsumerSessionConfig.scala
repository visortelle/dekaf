package consumer.session_config

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.start_from.{ConsumerSessionStartFrom, EarliestMessage}
import _root_.consumer.topic.ConsumerSessionTopic
import _root_.consumer.message_filter.MessageFilterChain
import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChain

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionStartFrom,
    topics: Vector[ConsumerSessionTopic],
    messageFilterChain: MessageFilterChain,
    pauseTriggerChain: ConsumerSessionPauseTriggerChain
)

object ConsumerSessionConfig:
    def fromPb(v: pb.ConsumerSessionConfig): ConsumerSessionConfig =
        ConsumerSessionConfig(
            startFrom = v.startFrom.map(ConsumerSessionStartFrom.fromPb).getOrElse(EarliestMessage()),
            topics = v.topics.map(ConsumerSessionTopic.fromPb).toVector,
            messageFilterChain = v.messageFilterChain
                .map(MessageFilterChain.fromPb)
                .getOrElse(MessageFilterChain.empty),
            pauseTriggerChain = v.pauseTriggerChain
                .map(ConsumerSessionPauseTriggerChain.fromPb)
                .getOrElse(ConsumerSessionPauseTriggerChain.empty)
        )

    def toPb(v: ConsumerSessionConfig): pb.ConsumerSessionConfig =
        pb.ConsumerSessionConfig(
            startFrom = Some(ConsumerSessionStartFrom.toPb(v.startFrom)),
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            pauseTriggerChain = Some(
                pb.ConsumerSessionPauseTriggerChain(
                    events = Vector.empty,
                    mode = pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL
                )
            )
        )
