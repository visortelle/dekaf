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
    ValueProjectionList,
    Deserializer,
    MessageGenerator,
    ProducerTask,
    ProducerSessionTask,
    ProducerSession

object ManagedItemType:
    def fromPb(v: pb.ManagedItemType): ManagedItemType =
        v match
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG => ManagedItemType.ConsumerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET => ManagedItemType.ConsumerSessionTarget
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM => ManagedItemType.ConsumerSessionStartFrom
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN => ManagedItemType.ConsumerSessionPauseTriggerChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG => ManagedItemType.ProducerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT => ManagedItemType.MarkdownDocument
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_ID => ManagedItemType.MessageId
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_DATE_TIME => ManagedItemType.DateTime
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_RELATIVE_DATE_TIME => ManagedItemType.RelativeDateTime
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER => ManagedItemType.MessageFilter
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN => ManagedItemType.MessageFilterChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR => ManagedItemType.TopicSelector
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE => ManagedItemType.ColoringRule
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN => ManagedItemType.ColoringRuleChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_BASIC_MESSAGE_FILTER_TARGET => ManagedItemType.BasicMessageFilterTarget
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION => ManagedItemType.ValueProjection
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION_LIST => ManagedItemType.ValueProjectionList
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_DESERIALIZER => ManagedItemType.Deserializer
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_GENERATOR => ManagedItemType.MessageGenerator
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_TASK => ManagedItemType.ProducerTask
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_TASK => ManagedItemType.ProducerSessionTask
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION => ManagedItemType.ProducerSession
            case _ => throw new IllegalArgumentException("Unknown ManagedItemType")

    def toPb(v: ManagedItemType): pb.ManagedItemType =
        v match
            case ManagedItemType.ConsumerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG
            case ManagedItemType.ConsumerSessionTarget => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_TARGET
            case ManagedItemType.ConsumerSessionStartFrom => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM
            case ManagedItemType.ConsumerSessionPauseTriggerChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN
            case ManagedItemType.ProducerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG
            case ManagedItemType.MarkdownDocument => pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT
            case ManagedItemType.MessageId => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_ID
            case ManagedItemType.DateTime => pb.ManagedItemType.MANAGED_ITEM_TYPE_DATE_TIME
            case ManagedItemType.RelativeDateTime => pb.ManagedItemType.MANAGED_ITEM_TYPE_RELATIVE_DATE_TIME
            case ManagedItemType.MessageFilter => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER
            case ManagedItemType.MessageFilterChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN
            case ManagedItemType.TopicSelector => pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR
            case ManagedItemType.ColoringRule => pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE
            case ManagedItemType.ColoringRuleChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_COLORING_RULE_CHAIN
            case ManagedItemType.BasicMessageFilterTarget => pb.ManagedItemType.MANAGED_ITEM_TYPE_BASIC_MESSAGE_FILTER_TARGET
            case ManagedItemType.ValueProjection => pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION
            case ManagedItemType.ValueProjectionList => pb.ManagedItemType.MANAGED_ITEM_TYPE_VALUE_PROJECTION_LIST
            case ManagedItemType.Deserializer => pb.ManagedItemType.MANAGED_ITEM_TYPE_DESERIALIZER
            case ManagedItemType.MessageGenerator => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_GENERATOR
            case ManagedItemType.ProducerTask => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_TASK
            case ManagedItemType.ProducerSessionTask => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_TASK
            case ManagedItemType.ProducerSession => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION
