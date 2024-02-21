package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

enum MessageFilterChainMode:
    case All, Any

object MessageFilterChainMode:
    def fromPb(mode: pb.MessageFilterChainMode): MessageFilterChainMode =
        mode match
            case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL => MessageFilterChainMode.All
            case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY => MessageFilterChainMode.Any
            case _                                                       => MessageFilterChainMode.All

    def toPb(mode: MessageFilterChainMode): pb.MessageFilterChainMode =
        mode match
            case MessageFilterChainMode.All => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL
            case MessageFilterChainMode.Any => pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY
