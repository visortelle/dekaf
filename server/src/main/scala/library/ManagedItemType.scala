package library

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import com.tools.teal.pulsar.ui.library.v1.managed_items.ManagedItemType
enum ManagedItemType:
    case ConsumerSessionConfig,
    ConsumerSessionTarget,
    ConsumerSessionStartFrom,
    ConsumerSessionPauseTriggerChain,
    ProducerSessionConfig,
    MarkdownDocument,
    MessageFilter,
    MessageFilterChain,
    MessageId,
    DateTime,
    RelativeDateTime,
    TopicSelector,
    ColoringRule,
    ColoringRuleChain,
    BasicMessageFilterTarget,
    ValueProjection,
    ValueProjectionList

object ManagedItemType:
    def fromPb(v: pb.ManagedItemType): ManagedItemType =
        v match
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG => ManagedItemType.ConsumerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET => ManagedItemType.ConsumerSessionTarget
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM => ManagedItemType.ConsumerSessionStartFrom
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN => ManagedItemType.ConsumerSessionPauseTriggerChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG => ManagedItemType.ProducerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT => ManagedItemType.MarkdownDocument
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER => ManagedItemType.MessageFilter
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN => ManagedItemType.MessageFilterChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR => ManagedItemType.TopicSelector
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE => ManagedItemType.ColoringRule
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN => ManagedItemType.ColoringRuleChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_BASIC_MESSAGE_FILTER_TARGET => ManagedItemType.BasicMessageFilterTarget
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION => ManagedItemType.ValueProjection
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION_LIST => ManagedItemType.ValueProjectionList
            case _ => throw new IllegalArgumentException("Unknown ManagedItemType")

    def toPb(v: ManagedItemType): pb.ManagedItemType =
        v match
            case ManagedItemType.ConsumerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG
            case ManagedItemType.ConsumerSessionTarget => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET
            case ManagedItemType.ConsumerSessionStartFrom => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM
            case ManagedItemType.ConsumerSessionPauseTriggerChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN
            case ManagedItemType.ProducerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG
            case ManagedItemType.MarkdownDocument => pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT
            case ManagedItemType.MessageFilter => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER
            case ManagedItemType.MessageFilterChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN
            case ManagedItemType.TopicSelector => pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR
            case ManagedItemType.ColoringRule => pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE
            case ManagedItemType.ColoringRuleChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN
            case ManagedItemType.BasicMessageFilterTarget => pb.ManagedItemType.MANAGED_ITEM_TYPE_BASIC_MESSAGE_FILTER_TARGET
            case ManagedItemType.ValueProjection => pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION
            case ManagedItemType.ValueProjectionList => pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION_LIST
