package library

import com.tools.teal.pulsar.ui.library.v1.user_managed_items as pb

def userManagedItemTypeFromPb(v: pb.UserManagedItemType): UserManagedItemType =
    v match
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG               => UserManagedItemType.ConsumerSessionConfig
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_START_FROM    => UserManagedItemType.ConsumerSessionConfigStartFrom
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_PAUSE_TRIGGER => UserManagedItemType.ConsumerSessionConfigPauseTrigger
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG               => UserManagedItemType.ProducerSessionConfig
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT                     => UserManagedItemType.MarkdownDocument
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER                        => UserManagedItemType.MessageFilter
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN                  => UserManagedItemType.MessageFilterChain
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_WIDGET             => UserManagedItemType.DataVisualizationWidget
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD          => UserManagedItemType.DataVisualizationDashboard
        case _ => throw new IllegalArgumentException("Unknown user managed item type")

def userManagedItemTypeToPb(v: UserManagedItemType): pb.UserManagedItemType =
    v match
        case UserManagedItemType.ConsumerSessionConfig             => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG
        case UserManagedItemType.ConsumerSessionConfigStartFrom    => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_START_FROM
        case UserManagedItemType.ConsumerSessionConfigPauseTrigger => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG_PAUSE_TRIGGER
        case UserManagedItemType.ProducerSessionConfig             => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG
        case UserManagedItemType.MarkdownDocument                  => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT
        case UserManagedItemType.MessageFilter                     => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER
        case UserManagedItemType.MessageFilterChain                => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN
        case UserManagedItemType.DataVisualizationWidget           => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_WIDGET
        case UserManagedItemType.DataVisualizationDashboard        => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD
