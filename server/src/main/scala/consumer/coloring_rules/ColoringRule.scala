package consumer.coloring_rules

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.message_filter.MessageFilterChain

case class ColoringRule(
    messageFilterChain: MessageFilterChain,
    foregroundColor: String,
    backgroundColor: String
)

object ColoringRule:
    def fromPb(v: pb.ColoringRule): ColoringRule =
        ColoringRule(
            messageFilterChain = v.messageFilterChain
                .map(MessageFilterChain.fromPb)
                .getOrElse(MessageFilterChain.empty),
            foregroundColor = v.foregroundColor,
            backgroundColor = v.backgroundColor
        )
    def toPb(v: ColoringRule): pb.ColoringRule =
        pb.ColoringRule(
            messageFilterChain = Some(MessageFilterChain.toPb(v.messageFilterChain)),
            foregroundColor = v.foregroundColor,
            backgroundColor = v.backgroundColor
        )
