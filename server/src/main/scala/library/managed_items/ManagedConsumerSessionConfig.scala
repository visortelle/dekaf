package library.managed_items

import library.{ManagedItemMetadata, ManagedItemTrait, ManagedItemReference}

case class ManagedConsumerSessionConfigSpec(
    startFrom: ManagedConsumerSessionStartFromValOrRef,
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    pauseTriggerChain: ManagedConsumerSessionPauseTriggerChainValOrRef
)

case class ManagedConsumerSessionConfig(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionConfigSpec
) extends ManagedItemTrait
