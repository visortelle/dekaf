package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class MessageFilterChain(
    isEnabled: Boolean,
    isNegated: Boolean,
    mode: MessageFilterChainMode,
    filters: List[MessageFilter]
)

object MessageFilterChain:
    def fromPb(chain: pb.MessageFilterChain): MessageFilterChain =
        MessageFilterChain(
            isEnabled = chain.isEnabled,
            isNegated = chain.isNegated,
            filters = chain.filters.map(MessageFilter.fromPb).toList,
            mode = MessageFilterChainMode.fromPb(chain.mode)
        )

    def toPb(chain: MessageFilterChain): pb.MessageFilterChain =
        pb.MessageFilterChain(
            isEnabled = chain.isEnabled,
            isNegated = chain.isNegated,
            filters = chain.filters.map(MessageFilter.toPb),
            mode = MessageFilterChainMode.toPb(chain.mode)
        )

    def empty: MessageFilterChain = MessageFilterChain(
        isEnabled = true,
        isNegated = false,
        filters = List.empty,
        mode = MessageFilterChainMode.All
    )
