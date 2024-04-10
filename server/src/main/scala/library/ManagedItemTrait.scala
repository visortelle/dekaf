package library

import library.managed_items.{
    ManagedBasicMessageFilterTargetSpec,
    ManagedColoringRuleChainSpec,
    ManagedColoringRuleSpec,
    ManagedConsumerSessionConfigSpec,
    ManagedConsumerSessionEventSpec,
    ManagedConsumerSessionPauseTriggerChainSpec,
    ManagedConsumerSessionStartFromSpec,
    ManagedConsumerSessionTargetSpec,
    ManagedDateTimeSpec,
    ManagedDeserializerSpec,
    ManagedMarkdownDocumentSpec,
    ManagedMessageFilterChainSpec,
    ManagedMessageFilterSpec,
    ManagedMessageGeneratorSpec,
    ManagedMessageIdSpec,
    ManagedProducerSessionConfigSpec,
    ManagedProducerTaskSpec,
    ManagedRelativeDateTimeSpec,
    ManagedTopicSelectorSpec,
    ManagedValueProjectionListSpec,
    ManagedValueProjectionSpec
}

type ManagedItemSpec =
    ManagedColoringRuleSpec |
    ManagedColoringRuleChainSpec |
    ManagedConsumerSessionConfigSpec |
    ManagedConsumerSessionEventSpec |
    ManagedConsumerSessionPauseTriggerChainSpec |
    ManagedConsumerSessionStartFromSpec |
    ManagedConsumerSessionTargetSpec |
    ManagedDateTimeSpec |
    ManagedMessageFilterSpec |
    ManagedMessageFilterChainSpec |
    ManagedMessageIdSpec |
    ManagedRelativeDateTimeSpec |
    ManagedTopicSelectorSpec |
    ManagedMarkdownDocumentSpec |
    ManagedBasicMessageFilterTargetSpec |
    ManagedValueProjectionSpec |
    ManagedValueProjectionListSpec |
    ManagedDeserializerSpec |
    ManagedMessageGeneratorSpec |
    ManagedProducerTaskSpec |
    ManagedProducerSessionConfigSpec

trait ManagedItemTrait:
    val metadata: ManagedItemMetadata
    val spec: ManagedItemSpec
