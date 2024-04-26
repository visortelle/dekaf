package library.managed_items

import consumer.pause_trigger.ConsumerSessionPauseTriggerChainMode

object ManagedConsumerSessionPauseTriggerChainSpecGen:
    def empty: ManagedConsumerSessionPauseTriggerChainSpec = ManagedConsumerSessionPauseTriggerChainSpec(
        events = Vector.empty,
        mode = ConsumerSessionPauseTriggerChainMode.Any
    )
