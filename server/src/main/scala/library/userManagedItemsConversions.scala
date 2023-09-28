package library

import com.google.protobuf.ByteString
import com.tools.teal.pulsar.ui.library.v1.user_managed_items as pb
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.{EarliestMessage, LatestMessage}

import java.time.Instant

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

def userManagedItemMetadataFromPb(v: pb.UserManagedItemMetadata): UserManagedItemMetadata =
    UserManagedItemMetadata(
        `type` = userManagedItemTypeFromPb(v.`type`),
        id = v.id,
        name = v.name,
        descriptionMarkdown = v.descriptionMarkdown
    )
def userManagedItemMetadataToPb(v: UserManagedItemMetadata): pb.UserManagedItemMetadata =
    pb.UserManagedItemMetadata(
        `type` = userManagedItemTypeToPb(v.`type`),
        id = v.id,
        name = v.name,
        descriptionMarkdown = v.descriptionMarkdown
    )

def userManagedMessageIdSpecFromPb(v: pb.UserManagedMessageIdSpec): UserManagedMessageIdSpec =
    UserManagedMessageIdSpec(
        messageId = v.messageId.toByteArray
    )
def userManagedMessageIdSpecToPb(v: UserManagedMessageIdSpec): pb.UserManagedMessageIdSpec =
    pb.UserManagedMessageIdSpec(
        messageId = ByteString.copyFrom(v.messageId)
    )

def userManagedMessageIdFromPb(v: pb.UserManagedMessageId): UserManagedMessageId =
    UserManagedMessageId(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedMessageIdSpecFromPb(v.spec.get)
    )
def userManagedMessageIdToPb(v: UserManagedMessageId): pb.UserManagedMessageId =
    pb.UserManagedMessageId(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedMessageIdSpecToPb(v.spec))
    )

def userManagedMessageIdValueOrReferenceFromPb(v: pb.UserManagedMessageIdValueOrReference): UserManagedMessageIdValueOrReference =
    v.messageId match
        case pb.UserManagedMessageIdValueOrReference.MessageId.MessageIdValue(v) =>
            UserManagedMessageIdValueOrReference(
                value = Some(userManagedMessageIdFromPb(v)),
                reference = None
            )
        case pb.UserManagedMessageIdValueOrReference.MessageId.MessageIdReference(v) =>
            UserManagedMessageIdValueOrReference(
                value = None,
                reference = Some(v)
            )
def userManagedMessageIdValueOrReferenceToPb(v: UserManagedMessageIdValueOrReference): pb.UserManagedMessageIdValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedMessageIdValueOrReference(
                messageId = pb.UserManagedMessageIdValueOrReference.MessageId.MessageIdValue(userManagedMessageIdToPb(v))
            )
        case None =>
            pb.UserManagedMessageIdValueOrReference(
                messageId = pb.UserManagedMessageIdValueOrReference.MessageId.MessageIdReference(v.reference.get)
            )

def userManagedDateTimeSpecFromPb(v: pb.UserManagedDateTimeSpec): UserManagedDateTimeSpec =
    UserManagedDateTimeSpec(
        dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos.toLong)
    )
def userManagedDateTimeSpecToPb(v: UserManagedDateTimeSpec): pb.UserManagedDateTimeSpec =
    pb.UserManagedDateTimeSpec(
        dateTime = Some(
            com.google.protobuf.timestamp.Timestamp(
                seconds = v.dateTime.getEpochSecond,
                nanos = v.dateTime.getNano
            )
        )
    )

def userManagedDateTimeFromPb(v: pb.UserManagedDateTime): UserManagedDateTime =
    UserManagedDateTime(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedDateTimeSpecFromPb(v.spec.get)
    )
def userManagedDateTimeToPb(v: UserManagedDateTime): pb.UserManagedDateTime =
    pb.UserManagedDateTime(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedDateTimeSpecToPb(v.spec))
    )

def userManagedDateTimeValueOrReferenceFromPb(v: pb.UserManagedDateTimeValueOrReference): UserManagedDateTimeValueOrReference =
    v.dateTime match
        case pb.UserManagedDateTimeValueOrReference.DateTime.DateTimeValue(v) =>
            UserManagedDateTimeValueOrReference(
                value = Some(userManagedDateTimeFromPb(v)),
                reference = None
            )
        case pb.UserManagedDateTimeValueOrReference.DateTime.DateTimeReference(v) =>
            UserManagedDateTimeValueOrReference(
                value = None,
                reference = Some(v)
            )
def userManagedDateTimeValueOrReferenceToPb(v: UserManagedDateTimeValueOrReference): pb.UserManagedDateTimeValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedDateTimeValueOrReference(
                dateTime = pb.UserManagedDateTimeValueOrReference.DateTime.DateTimeValue(userManagedDateTimeToPb(v))
            )
        case None =>
            pb.UserManagedDateTimeValueOrReference(
                dateTime = pb.UserManagedDateTimeValueOrReference.DateTime.DateTimeReference(v.reference.get)
            )

def userManagedRelativeDateTimeSpecFromPb(v: pb.UserManagedRelativeDateTimeSpec): UserManagedRelativeDateTimeSpec =
    UserManagedRelativeDateTimeSpec(
        value = v.value,
        unit = dateTimeUnitFromPb(v.unit),
        isRoundedToUnitStart = v.isRoundedToUnitStart
    )
def userManagedRelativeDateTimeSpecToPb(v: UserManagedRelativeDateTimeSpec): pb.UserManagedRelativeDateTimeSpec =
    pb.UserManagedRelativeDateTimeSpec(
        value = v.value,
        unit = dateTimeUnitToPb(v.unit),
        isRoundedToUnitStart = v.isRoundedToUnitStart
    )

def userManagedRelativeDateTimeFromPb(v: pb.UserManagedRelativeDateTime): UserManagedRelativeDateTime =
    UserManagedRelativeDateTime(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedRelativeDateTimeSpecFromPb(v.spec.get)
    )
def userManagedRelativeDateTimeToPb(v: UserManagedRelativeDateTime): pb.UserManagedRelativeDateTime =
    pb.UserManagedRelativeDateTime(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedRelativeDateTimeSpecToPb(v.spec))
    )

def userManagedRelativeDateTimeValueOrReferenceFromPb(v: pb.UserManagedRelativeDateTimeValueOrReference): UserManagedRelativeDateTimeValueOrReference =
    v.relativeDateTime match
        case pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTime.RelativeDateTimeValue(v) =>
            UserManagedRelativeDateTimeValueOrReference(
                value = Some(userManagedRelativeDateTimeFromPb(v)),
                reference = None
            )
        case pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTime.RelativeDateTimeReference(v) =>
            UserManagedRelativeDateTimeValueOrReference(
                value = None,
                reference = Some(v)
            )
def userManagedRelativeDateTimeValueOrReferenceToPb(v: UserManagedRelativeDateTimeValueOrReference): pb.UserManagedRelativeDateTimeValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedRelativeDateTimeValueOrReference(
                relativeDateTime = pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTime.RelativeDateTimeValue(userManagedRelativeDateTimeToPb(v))
            )
        case None =>
            pb.UserManagedRelativeDateTimeValueOrReference(
                relativeDateTime = pb.UserManagedRelativeDateTimeValueOrReference.RelativeDateTime.RelativeDateTimeReference(v.reference.get)
            )

def userManagedConsumerSessionConfigStartFromSpecFromPb(v: pb.UserManagedConsumerSessionConfigStartFromSpec): UserManagedConsumerSessionConfigStartFromSpec =
    UserManagedConsumerSessionConfigStartFromSpec(
        earliestMessage = v.startFrom match
            case pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.EarliestMessage(v) =>
                Some(EarliestMessage())
            case _ => None
        ,
        latestMessage = v.startFrom match
            case pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.LatestMessage(v) =>
                Some(LatestMessage())
            case _ => None
        ,
        messageId = v.startFrom match
            case pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.MessageId(v) =>
                Some(userManagedMessageIdValueOrReferenceFromPb(v))
            case _ => None
        ,
        dateTime = v.startFrom match
            case pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.DateTime(v) =>
                Some(userManagedDateTimeValueOrReferenceFromPb(v))
            case _ => None
        ,
        relativeDateTime = v.startFrom match
            case pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.RelativeDateTime(v) =>
                Some(userManagedRelativeDateTimeValueOrReferenceFromPb(v))
            case _ => None
    )

def userManagedConsumerSessionConfigStartFromSpecToPb(v: UserManagedConsumerSessionConfigStartFromSpec): pb.UserManagedConsumerSessionConfigStartFromSpec =
    pb.UserManagedConsumerSessionConfigStartFromSpec(
        startFrom = v.earliestMessage match
            case Some(_) => pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.EarliestMessage(consumerPb.EarliestMessage())
            case None =>
                v.latestMessage match
                    case Some(_) => pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.LatestMessage(consumerPb.LatestMessage())
                    case None =>
                        v.messageId match
                            case Some(v) => pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.MessageId(userManagedMessageIdValueOrReferenceToPb(v))
                            case None =>
                                v.dateTime match
                                    case Some(v) =>
                                        pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.DateTime(userManagedDateTimeValueOrReferenceToPb(v))
                                    case None =>
                                        v.relativeDateTime match
                                            case Some(v) =>
                                                pb.UserManagedConsumerSessionConfigStartFromSpec.StartFrom.RelativeDateTime(
                                                    userManagedRelativeDateTimeValueOrReferenceToPb(v)
                                                )
                                            case None => throw new Exception("Invalid UserManagedConsumerSessionConfigStartFromSpec")
    )

def userManagedConsumerSessionConfigStartFromFromPb(v: pb.UserManagedConsumerSessionConfigStartFrom): UserManagedConsumerSessionConfigStartFrom =
    UserManagedConsumerSessionConfigStartFrom(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionConfigStartFromSpecFromPb(v.spec.get)
    )
def userManagedConsumerSessionConfigStartFromToPb(v: UserManagedConsumerSessionConfigStartFrom): pb.UserManagedConsumerSessionConfigStartFrom =
    pb.UserManagedConsumerSessionConfigStartFrom(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionConfigStartFromSpecToPb(v.spec))
    )

def userManagedConsumerSessionConfigStartFromValueOrReferenceFromPb(
    v: pb.UserManagedConsumerSessionConfigStartFromValueOrReference
): UserManagedConsumerSessionConfigStartFromValueOrReference =
    v.startFrom match
        case pb.UserManagedConsumerSessionConfigStartFromValueOrReference.StartFrom.StartFromValue(v) =>
            UserManagedConsumerSessionConfigStartFromValueOrReference(
                value = Some(userManagedConsumerSessionConfigStartFromFromPb(v)),
                reference = None
            )
        case pb.UserManagedConsumerSessionConfigStartFromValueOrReference.StartFrom.StartFromReference(v) =>
            UserManagedConsumerSessionConfigStartFromValueOrReference(
                value = None,
                reference = Some(v)
            )

def userManagedConsumerSessionConfigStartFromValueOrReferenceToPb(
    v: UserManagedConsumerSessionConfigStartFromValueOrReference
): pb.UserManagedConsumerSessionConfigStartFromValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedConsumerSessionConfigStartFromValueOrReference(
                startFrom =
                    pb.UserManagedConsumerSessionConfigStartFromValueOrReference.StartFrom.StartFromValue(userManagedConsumerSessionConfigStartFromToPb(v))
            )
        case None =>
            pb.UserManagedConsumerSessionConfigStartFromValueOrReference(
                startFrom = pb.UserManagedConsumerSessionConfigStartFromValueOrReference.StartFrom.StartFromReference(v.reference.get)
            )

def userManagedConsumerSessionConfigPauseTriggerSpecFromPb(
    v: pb.UserManagedConsumerSessionConfigPauseTriggerSpec
): UserManagedConsumerSessionConfigPauseTriggerSpec =
    v.trigger match
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessagesProcessed(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onMessagesProcessed = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessagesDelivered(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onMessagesDelivered = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnBytesProcessed(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onBytesProcessed = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnBytesDelivered(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onBytesDelivered = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessageDecodeFails(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onMessageDecodeFails = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnElapsedTimeMs(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onElapsedTimeMs = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnTopicEndReached(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onTopicEndReached = Some(v)
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnDateTime(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onDateTime = Some(userManagedDateTimeValueOrReferenceFromPb(v))
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnRelativeDateTime(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onRelativeDateTime = Some(userManagedRelativeDateTimeValueOrReferenceFromPb(v))
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessageId(v) =>
            UserManagedConsumerSessionConfigPauseTriggerSpec(
                onMessageId = Some(userManagedMessageIdValueOrReferenceFromPb(v))
            )
//        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessageFilterPass(v) =>
//            UserManagedConsumerSessionConfigPauseTriggerSpec(
//                onMessageFilterPass = Some(userManagedMessageFilterChainValueOrReferenceFromPb(v)),
//            )
//        case pb.UserManagedConsumerSessionConfigPauseTriggerSpec.Trigger.OnMessageFilterChainPass(v) =>
//            UserManagedConsumerSessionConfigPauseTriggerSpec(
//                onMessageFilterChainPass = Some(userManagedMessageFilterChainValueOrReferenceFromPb(v)),
//            )
//
def userManagedConsumerSessionConfigPauseTriggerSpecToPb(spec: UserManagedConsumerSessionConfigPauseTriggerSpec) = ???

def userManagedConsumerSessionConfigPauseTriggerFromPb(v: pb.UserManagedConsumerSessionConfigPauseTrigger): UserManagedConsumerSessionConfigPauseTrigger =
    UserManagedConsumerSessionConfigPauseTrigger(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionConfigPauseTriggerSpecFromPb(v.spec.get)
    )
def userManagedConsumerSessionConfigPauseTriggerToPb(v: UserManagedConsumerSessionConfigPauseTrigger): pb.UserManagedConsumerSessionConfigPauseTrigger =
    pb.UserManagedConsumerSessionConfigPauseTrigger(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionConfigPauseTriggerSpecToPb(v.spec))
    )

def userManagedConsumerSessionConfigPauseTriggerValueOrReferenceFromPb(
    v: pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference
): UserManagedConsumerSessionConfigPauseTriggerValueOrReference =
    v.pauseTrigger match
        case pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference.PauseTrigger.PauseTriggerValue(v) =>
            UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
                value = Some(userManagedConsumerSessionConfigPauseTriggerFromPb(v)),
                reference = None
            )
        case pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference.PauseTrigger.PauseTriggerReference(v) =>
            UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
                value = None,
                reference = Some(v)
            )

def userManagedConsumerSessionConfigPauseTriggerValueOrReferenceToPb(
    v: UserManagedConsumerSessionConfigPauseTriggerValueOrReference
): pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
                pauseTrigger = pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference.PauseTrigger.PauseTriggerValue(
                    userManagedConsumerSessionConfigPauseTriggerToPb(v)
                )
            )
        case None =>
            pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
                pauseTrigger = pb.UserManagedConsumerSessionConfigPauseTriggerValueOrReference.PauseTrigger.PauseTriggerReference(v.reference.get)
            )

def userManagedMessageFilterSpecFromPb(v: pb.UserManagedMessageFilterSpec): UserManagedMessageFilterSpec =
    UserManagedMessageFilterSpec(
        isEnabled = v.isEnabled,
        isNegated = v.isNegated,
        jsFilter = v.value match
            case pb.UserManagedMessageFilterSpec.Value.JsFilter(v) =>
                Some(jsMessageFilterFromPb(v))
            case _ => None
        ,
        basicFilter = v.value match
            case pb.UserManagedMessageFilterSpec.Value.BasicFilter(v) =>
                Some(basicMessageFilterFromPb(v))
            case _ => None
    )
def userManagedMessageFilterSpecToPb(v: UserManagedMessageFilterSpec): pb.UserManagedMessageFilterSpec =
    pb.UserManagedMessageFilterSpec(
        isEnabled = v.isEnabled,
        isNegated = v.isNegated,
        value = v.jsFilter match
            case Some(v) => pb.UserManagedMessageFilterSpec.Value.JsFilter(jsMessageFilterToPb(v))
            case None =>
                v.basicFilter match
                    case Some(v) => pb.UserManagedMessageFilterSpec.Value.BasicFilter(basicMessageFilterToPb(v))
                    case None    => throw new Exception("Invalid UserManagedMessageFilterSpec")
    )

def userManagedMessageFilterFromPb(v: pb.UserManagedMessageFilter): UserManagedMessageFilter =
    UserManagedMessageFilter(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedMessageFilterSpecFromPb(v.spec.get)
    )
def userManagedMessageFilterToPb(v: UserManagedMessageFilter): pb.UserManagedMessageFilter =
    pb.UserManagedMessageFilter(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedMessageFilterSpecToPb(v.spec))
    )

def userManagedMessageFilterValueOrReferenceFromPb(v: pb.UserManagedMessageFilterValueOrReference): UserManagedMessageFilterValueOrReference =
    v.messageFilter match
        case pb.UserManagedMessageFilterValueOrReference.MessageFilter.MessageFilterValue(v) =>
            UserManagedMessageFilterValueOrReference(
                value = Some(userManagedMessageFilterFromPb(v)),
                reference = None
            )
        case pb.UserManagedMessageFilterValueOrReference.MessageFilter.MessageFilterReference(v) =>
            UserManagedMessageFilterValueOrReference(
                value = None,
                reference = Some(v)
            )
def userManagedMessageFilterValueOrReferenceToPb(v: UserManagedMessageFilterValueOrReference): pb.UserManagedMessageFilterValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedMessageFilterValueOrReference(
                messageFilter = pb.UserManagedMessageFilterValueOrReference.MessageFilter.MessageFilterValue(userManagedMessageFilterToPb(v))
            )
        case None =>
            pb.UserManagedMessageFilterValueOrReference(
                messageFilter = pb.UserManagedMessageFilterValueOrReference.MessageFilter.MessageFilterReference(v.reference.get)
            )

def userManagedMessageFilterChainSpecFromPb(v: pb.UserManagedMessageFilterChainSpec): UserManagedMessageFilterChainSpec =
    UserManagedMessageFilterChainSpec(
        isEnabled = v.isEnabled,
        isNegated = v.isNegated,
        filters = v.filters.map(userManagedMessageFilterValueOrReferenceFromPb).toList,
        mode = messageFilterChainModeFromPb(v.mode)
    )
def userManagedMessageFilterChainSpecToPb(v: UserManagedMessageFilterChainSpec): pb.UserManagedMessageFilterChainSpec =
    pb.UserManagedMessageFilterChainSpec(
        isEnabled = v.isEnabled,
        isNegated = v.isNegated,
        filters = v.filters.map(userManagedMessageFilterValueOrReferenceToPb),
        mode = messageFilterChainModeToPb(v.mode)
    )

def userManagedMessageFilterChainFromPb(v: pb.UserManagedMessageFilterChain): UserManagedMessageFilterChain =
    UserManagedMessageFilterChain(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedMessageFilterChainSpecFromPb(v.spec.get)
    )
def userManagedMessageFilterChainToPb(v: UserManagedMessageFilterChain): pb.UserManagedMessageFilterChain =
    pb.UserManagedMessageFilterChain(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedMessageFilterChainSpecToPb(v.spec))
    )

def userManagedMessageFilterChainValueOrReferenceFromPb(v: pb.UserManagedMessageFilterChainValueOrReference): UserManagedMessageFilterChainValueOrReference =
    v.messageFilterChain match
        case pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChain.MessageFilterChainValue(v) =>
            UserManagedMessageFilterChainValueOrReference(
                value = Some(userManagedMessageFilterChainFromPb(v)),
                reference = None
            )
        case pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChain.MessageFilterChainReference(v) =>
            UserManagedMessageFilterChainValueOrReference(
                value = None,
                reference = Some(v)
            )
def userManagedMessageFilterChainValueOrReferenceToPb(v: UserManagedMessageFilterChainValueOrReference): pb.UserManagedMessageFilterChainValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedMessageFilterChainValueOrReference(
                messageFilterChain = pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChain.MessageFilterChainValue(
                    userManagedMessageFilterChainToPb(v)
                )
            )
        case None =>
            pb.UserManagedMessageFilterChainValueOrReference(
                messageFilterChain = pb.UserManagedMessageFilterChainValueOrReference.MessageFilterChain.MessageFilterChainReference(v.reference.get)
            )

def userManagedConsumerSessionConfigSpecFromPb(v: pb.UserManagedConsumerSessionConfigSpec): UserManagedConsumerSessionConfigSpec =
    UserManagedConsumerSessionConfigSpec(
        startFrom = userManagedConsumerSessionConfigStartFromValueOrReferenceFromPb(v.startFrom.get),
        messageFilterChain = userManagedMessageFilterChainValueOrReferenceFromPb(v.messageFilterChain.get),
        pauseTrigger = userManagedConsumerSessionConfigPauseTriggerValueOrReferenceFromPb(v.pauseTrigger.get)
    )
def userManagedConsumerSessionConfigSpecToPb(v: UserManagedConsumerSessionConfigSpec): pb.UserManagedConsumerSessionConfigSpec =
    pb.UserManagedConsumerSessionConfigSpec(
        startFrom = Some(userManagedConsumerSessionConfigStartFromValueOrReferenceToPb(v.startFrom)),
        messageFilterChain = Some(userManagedMessageFilterChainValueOrReferenceToPb(v.messageFilterChain)),
        pauseTrigger = Some(userManagedConsumerSessionConfigPauseTriggerValueOrReferenceToPb(v.pauseTrigger))
    )

def userManagedConsumerSessionConfigFromPb(v: pb.UserManagedConsumerSessionConfig): UserManagedConsumerSessionConfig =
    UserManagedConsumerSessionConfig(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionConfigSpecFromPb(v.spec.get)
    )
def userManagedConsumerSessionConfigToPb(v: UserManagedConsumerSessionConfig): pb.UserManagedConsumerSessionConfig =
    pb.UserManagedConsumerSessionConfig(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionConfigSpecToPb(v.spec))
    )

def userManagedItemFromPb(v: pb.UserManagedItem): UserManagedItem =
    UserManagedItem(
        consumerSessionConfig = v.item match
            case pb.UserManagedItem.Item.ConsumerSessionConfig(v) =>
                Some(userManagedConsumerSessionConfigFromPb(v))
            case _ => None
        ,
        consumerSessionConfigStartFrom = v.item match
            case pb.UserManagedItem.Item.ConsumerSessionConfigStartFrom(v) =>
                Some(userManagedConsumerSessionConfigStartFromFromPb(v))
            case _ => None
        ,
        consumerSessionConfigPauseTrigger = v.item match
            case pb.UserManagedItem.Item.ConsumerSessionConfigPauseTrigger(v) =>
                Some(userManagedConsumerSessionConfigPauseTriggerFromPb(v))
            case _ => None
        ,
        messageId = v.item match
            case pb.UserManagedItem.Item.MessageId(v) =>
                Some(userManagedMessageIdFromPb(v))
            case _ => None
        ,
        dateTime = v.item match
            case pb.UserManagedItem.Item.DateTime(v) =>
                Some(userManagedDateTimeFromPb(v))
            case _ => None
        ,
        relativeDateTime = v.item match
            case pb.UserManagedItem.Item.RelativeDateTime(v) =>
                Some(userManagedRelativeDateTimeFromPb(v))
            case _ => None
        ,
        messageFilter = v.item match
            case pb.UserManagedItem.Item.MessageFilter(v) =>
                Some(userManagedMessageFilterFromPb(v))
            case _ => None
        ,
        messageFilterChain = v.item match
            case pb.UserManagedItem.Item.MessageFilterChain(v) =>
                Some(userManagedMessageFilterChainFromPb(v))
            case _ => None
    )

def userManagedItemToPb(v: UserManagedItem): pb.UserManagedItem =
    pb.UserManagedItem(
        item = v.consumerSessionConfig match
            case Some(v) =>
                pb.UserManagedItem.Item.ConsumerSessionConfig(userManagedConsumerSessionConfigToPb(v))
            case None =>
                v.consumerSessionConfigStartFrom match
                    case Some(v) =>
                        pb.UserManagedItem.Item.ConsumerSessionConfigStartFrom(userManagedConsumerSessionConfigStartFromToPb(v))
                    case None =>
                        v.consumerSessionConfigPauseTrigger match
                            case Some(v) =>
                                pb.UserManagedItem.Item.ConsumerSessionConfigPauseTrigger(
                                    userManagedConsumerSessionConfigPauseTriggerToPb(v)
                                )
                            case None =>
                                v.messageId match
                                    case Some(v) =>
                                        pb.UserManagedItem.Item.MessageId(userManagedMessageIdToPb(v))
                                    case None =>
                                        v.dateTime match
                                            case Some(v) =>
                                                pb.UserManagedItem.Item.DateTime(userManagedDateTimeToPb(v))
                                            case None =>
                                                v.relativeDateTime match
                                                    case Some(v) =>
                                                        pb.UserManagedItem.Item.RelativeDateTime(
                                                            userManagedRelativeDateTimeToPb(v)
                                                        )
                                                    case None =>
                                                        v.messageFilter match
                                                            case Some(v) =>
                                                                pb.UserManagedItem.Item.MessageFilter(
                                                                    userManagedMessageFilterToPb(v)
                                                                )
                                                            case None =>
                                                                v.messageFilterChain match
                                                                    case Some(v) =>
                                                                        pb.UserManagedItem.Item.MessageFilterChain(
                                                                            userManagedMessageFilterChainToPb(v)
                                                                        )
                                                                    case None => throw new Exception("Invalid UserManagedItem")
    )
