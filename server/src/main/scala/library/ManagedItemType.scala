package library

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import com.tools.teal.pulsar.ui.library.v1.managed_items.ManagedItemType
enum ManagedItemType:
    case ConsumerSessionConfig,
    ConsumerSessionStartFrom,
    ConsumerSessionPauseTrigger,
    ProducerSessionConfig,
    MarkdownDocument,
    MessageFilter,
    MessageFilterChain,
    MessageId,
    DateTime,
    RelativeDateTime,
    TopicSelector

object ManagedItemType:
    def fromPb(v: pb.ManagedItemType): ManagedItemType =
        v match
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG => ManagedItemType.ConsumerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM => ManagedItemType.ConsumerSessionStartFrom
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER => ManagedItemType.ConsumerSessionPauseTrigger
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG => ManagedItemType.ProducerSessionConfig
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT => ManagedItemType.MarkdownDocument
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER => ManagedItemType.MessageFilter
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN => ManagedItemType.MessageFilterChain
            case pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR => ManagedItemType.TopicSelector
            case _ => throw new IllegalArgumentException("Unknown ManagedItemType")

    def toPb(v: ManagedItemType): pb.ManagedItemType =
        v match
            case ManagedItemType.ConsumerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG
            case ManagedItemType.ConsumerSessionStartFrom => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM
            case ManagedItemType.ConsumerSessionPauseTrigger => pb.ManagedItemType.MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER
            case ManagedItemType.ProducerSessionConfig => pb.ManagedItemType.MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG
            case ManagedItemType.MarkdownDocument => pb.ManagedItemType.MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT
            case ManagedItemType.MessageFilter => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER
            case ManagedItemType.MessageFilterChain => pb.ManagedItemType.MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN
            case ManagedItemType.TopicSelector => pb.ManagedItemType.MANAGED_ITEM_TYPE_TOPIC_SELECTOR
