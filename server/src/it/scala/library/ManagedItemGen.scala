package library

import library.managed_items.{
    ManagedBasicMessageFilterTarget,
    ManagedBasicMessageFilterTargetSpec,
    ManagedColoringRule,
    ManagedColoringRuleChain,
    ManagedColoringRuleChainSpec,
    ManagedColoringRuleSpec,
    ManagedConsumerSessionConfig,
    ManagedConsumerSessionConfigSpec,
    ManagedConsumerSessionPauseTriggerChain,
    ManagedConsumerSessionPauseTriggerChainSpec,
    ManagedConsumerSessionStartFrom,
    ManagedConsumerSessionStartFromSpec,
    ManagedConsumerSessionTarget,
    ManagedConsumerSessionTargetSpec,
    ManagedDateTime,
    ManagedDateTimeSpec,
    ManagedDeserializer,
    ManagedDeserializerSpec,
    ManagedMarkdownDocument,
    ManagedMarkdownDocumentSpec,
    ManagedMessageFilter,
    ManagedMessageFilterChain,
    ManagedMessageFilterChainSpec,
    ManagedMessageFilterSpec,
    ManagedMessageGenerator,
    ManagedMessageGeneratorSpec,
    ManagedMessageId,
    ManagedMessageIdSpec,
    ManagedProducerSessionConfig,
    ManagedProducerSessionConfigSpec,
    ManagedProducerTask,
    ManagedProducerTaskSpec,
    ManagedRelativeDateTime,
    ManagedRelativeDateTimeSpec,
    ManagedTopicSelector,
    ManagedTopicSelectorSpec,
    ManagedValueProjection,
    ManagedValueProjectionList,
    ManagedValueProjectionListSpec,
    ManagedValueProjectionSpec
}

object ManagedItemGen:
    def fromSpec(spec: ManagedItemSpec): ManagedItemTrait =
        spec match
            case v: ManagedColoringRuleSpec =>
                ManagedColoringRule(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ColoringRule),
                    spec = v
                )
            case v: ManagedColoringRuleChainSpec =>
                ManagedColoringRuleChain(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ColoringRuleChain),
                    spec = v
                )
            case v: ManagedConsumerSessionConfigSpec =>
                ManagedConsumerSessionConfig(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ConsumerSessionConfig),
                    spec = v
                )
            case v: ManagedConsumerSessionPauseTriggerChainSpec =>
                ManagedConsumerSessionPauseTriggerChain(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ConsumerSessionPauseTriggerChain),
                    spec = v
                )
            case v: ManagedConsumerSessionStartFromSpec =>
                ManagedConsumerSessionStartFrom(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ConsumerSessionStartFrom),
                    spec = v
                )
            case v: ManagedConsumerSessionTargetSpec =>
                ManagedConsumerSessionTarget(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ConsumerSessionTarget),
                    spec = v
                )
            case v: ManagedDateTimeSpec =>
                ManagedDateTime(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.DateTime),
                    spec = v
                )
            case v: ManagedMessageFilterSpec =>
                ManagedMessageFilter(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.MessageFilter),
                    spec = v
                )
            case v: ManagedMessageFilterChainSpec =>
                ManagedMessageFilterChain(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.MessageFilterChain),
                    spec = v
                )
            case v: ManagedMessageIdSpec =>
                ManagedMessageId(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.MessageId),
                    spec = v
                )
            case v: ManagedRelativeDateTimeSpec =>
                ManagedRelativeDateTime(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.RelativeDateTime),
                    spec = v
                )
            case v: ManagedTopicSelectorSpec =>
                ManagedTopicSelector(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.TopicSelector),
                    spec = v
                )
            case v: ManagedMarkdownDocumentSpec =>
                ManagedMarkdownDocument(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.MarkdownDocument),
                    spec = v
                )
            case v: ManagedBasicMessageFilterTargetSpec =>
                ManagedBasicMessageFilterTarget(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.BasicMessageFilterTarget),
                    spec = v
                )
            case v: ManagedValueProjectionSpec =>
                ManagedValueProjection(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ValueProjection),
                    spec = v
                )
            case v: ManagedValueProjectionListSpec =>
                ManagedValueProjectionList(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ValueProjectionList),
                    spec = v
                )
            case v: ManagedDeserializerSpec =>
                ManagedDeserializer(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.Deserializer),
                    spec = v
                )
            case v: ManagedMessageGeneratorSpec =>
                ManagedMessageGenerator(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.MessageGenerator),
                    spec = v
                )
            case v: ManagedProducerTaskSpec =>
                ManagedProducerTask(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ProducerTask),
                    spec = v
                )
            case v: ManagedProducerSessionConfigSpec =>
                ManagedProducerSessionConfig(
                    metadata = ManagedItemMetadataGen.empty(ManagedItemType.ProducerSessionConfig),
                    spec = v
                )
            case _ => throw new IllegalArgumentException(s"Unsupported spec type: $spec")
