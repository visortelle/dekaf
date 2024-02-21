package consumer.message_filter.basic_message_filter.logic

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

enum BasicMessageFilterBracesMode:
    case All, Any

object BasicMessageFilterBracesMode:
    def fromPb(v: pb.BasicMessageFilterBracesMode): BasicMessageFilterBracesMode =
        v match
            case pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ALL =>
                BasicMessageFilterBracesMode.All
            case pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ANY =>
                BasicMessageFilterBracesMode.Any
            case _ =>
                BasicMessageFilterBracesMode.All

    def toPb(v: BasicMessageFilterBracesMode): pb.BasicMessageFilterBracesMode =
        v match
            case BasicMessageFilterBracesMode.All =>
                pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ALL
            case BasicMessageFilterBracesMode.Any =>
                pb.BasicMessageFilterBracesMode.BASIC_MESSAGE_FILTER_BRACES_MODE_ANY
