package library.managed_items

import consumer.message_filter.MessageFilterChainMode

object ManagedMessageFilterChainSpecGen:
    def empty: ManagedMessageFilterChainSpec = ManagedMessageFilterChainSpec(
        isEnabled = true,
        isNegated = false,
        filters = List.empty,
        mode = MessageFilterChainMode.All
    )
