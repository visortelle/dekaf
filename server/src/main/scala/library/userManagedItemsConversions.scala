package library

import com.google.protobuf.ByteString
import com.tools.teal.pulsar.ui.library.v1.user_managed_items as pb
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import consumer.{
    basicMessageFilterFromPb,
    basicMessageFilterToPb,
    dateTimeUnitFromPb,
    dateTimeUnitToPb,
    jsMessageFilterFromPb,
    jsMessageFilterToPb,
    messageFilterChainModeFromPb,
    messageFilterChainModeToPb,
    messageFilterFromPb,
    messageFilterToPb,
    ConsumerSessionEventBytesDelivered,
    ConsumerSessionEventBytesProcessed,
    ConsumerSessionEventMessageDecodeFailed,
    ConsumerSessionEventMessagesDelivered,
    ConsumerSessionEventMessagesProcessed,
    ConsumerSessionEventTimeElapsedMs,
    ConsumerSessionEventTopicEndReached,
    ConsumerSessionEventUnexpectedErrorOccurred,
    ConsumerSessionPauseTriggerChainMode,
    EarliestMessage,
    LatestMessage
}

import java.time.Instant

def userManagedItemTypeFromPb(v: pb.UserManagedItemType): UserManagedItemType =
    v match
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG        => UserManagedItemType.ConsumerSessionConfig()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM    => UserManagedItemType.ConsumerSessionStartFrom()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER => UserManagedItemType.ConsumerSessionPauseTrigger()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG        => UserManagedItemType.ProducerSessionConfig()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT              => UserManagedItemType.MarkdownDocument()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER                 => UserManagedItemType.MessageFilter()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN           => UserManagedItemType.MessageFilterChain()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_WIDGET      => UserManagedItemType.DataVisualizationWidget()
        case pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD   => UserManagedItemType.DataVisualizationDashboard()
        case _ => throw new IllegalArgumentException("Unknown user managed item type")
def userManagedItemTypeToPb(v: UserManagedItemType): pb.UserManagedItemType =
    v match
        case UserManagedItemType.ConsumerSessionConfig()       => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_CONFIG
        case UserManagedItemType.ConsumerSessionStartFrom()    => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_START_FROM
        case UserManagedItemType.ConsumerSessionPauseTrigger() => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_CONSUMER_SESSION_PAUSE_TRIGGER
        case UserManagedItemType.ProducerSessionConfig()       => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_PRODUCER_SESSION_CONFIG
        case UserManagedItemType.MarkdownDocument()            => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MARKDOWN_DOCUMENT
        case UserManagedItemType.MessageFilter()               => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER
        case UserManagedItemType.MessageFilterChain()          => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_MESSAGE_FILTER_CHAIN
        case UserManagedItemType.DataVisualizationWidget()     => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_WIDGET
        case UserManagedItemType.DataVisualizationDashboard()  => pb.UserManagedItemType.USER_MANAGED_ITEM_TYPE_DATA_VISUALIZATION_DASHBOARD

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

def userManagedConsumerSessionStartFromSpecFromPb(v: pb.UserManagedConsumerSessionStartFromSpec): UserManagedConsumerSessionStartFromSpec =
    v.startFrom match
        case sf: pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromEarliestMessage => UserManagedConsumerSessionStartFromSpec(startFrom = EarliestMessage())
        case sf: pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromLatestMessage   => UserManagedConsumerSessionStartFromSpec(startFrom = LatestMessage())
        case sf: pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromMessageId =>
            UserManagedConsumerSessionStartFromSpec(startFrom = userManagedMessageIdValueOrReferenceFromPb(sf.value))
        case sf: pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromDateTime =>
            UserManagedConsumerSessionStartFromSpec(startFrom = userManagedDateTimeValueOrReferenceFromPb(sf.value))
        case sf: pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromRelativeDateTime =>
            UserManagedConsumerSessionStartFromSpec(startFrom = userManagedRelativeDateTimeValueOrReferenceFromPb(sf.value))

def userManagedConsumerSessionStartFromSpecToPb(v: UserManagedConsumerSessionStartFromSpec): pb.UserManagedConsumerSessionStartFromSpec =
    v.startFrom match
        case v: EarliestMessage =>
            pb.UserManagedConsumerSessionStartFromSpec(
                startFrom = pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromEarliestMessage(consumerPb.EarliestMessage())
            )
        case v: LatestMessage =>
            pb.UserManagedConsumerSessionStartFromSpec(
                startFrom = pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromLatestMessage(consumerPb.LatestMessage())
            )
        case v: UserManagedMessageIdValueOrReference =>
            pb.UserManagedConsumerSessionStartFromSpec(
                startFrom = pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromMessageId(userManagedMessageIdValueOrReferenceToPb(v))
            )
        case v: UserManagedDateTimeValueOrReference =>
            pb.UserManagedConsumerSessionStartFromSpec(
                startFrom = pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromDateTime(userManagedDateTimeValueOrReferenceToPb(v))
            )
        case v: UserManagedRelativeDateTimeValueOrReference =>
            pb.UserManagedConsumerSessionStartFromSpec(
                startFrom = pb.UserManagedConsumerSessionStartFromSpec.StartFrom.StartFromRelativeDateTime(userManagedRelativeDateTimeValueOrReferenceToPb(v))
            )

def userManagedConsumerSessionStartFromFromPb(v: pb.UserManagedConsumerSessionStartFrom): UserManagedConsumerSessionStartFrom =
    UserManagedConsumerSessionStartFrom(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionStartFromSpecFromPb(v.spec.get)
    )
def userManagedConsumerSessionStartFromToPb(v: UserManagedConsumerSessionStartFrom): pb.UserManagedConsumerSessionStartFrom =
    pb.UserManagedConsumerSessionStartFrom(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionStartFromSpecToPb(v.spec))
    )

def userManagedConsumerSessionStartFromValueOrReferenceFromPb(
    v: pb.UserManagedConsumerSessionStartFromValueOrReference
): UserManagedConsumerSessionStartFromValueOrReference =
    v.startFrom match
        case pb.UserManagedConsumerSessionStartFromValueOrReference.StartFrom.StartFromValue(v) =>
            UserManagedConsumerSessionStartFromValueOrReference(
                value = Some(userManagedConsumerSessionStartFromFromPb(v)),
                reference = None
            )
        case pb.UserManagedConsumerSessionStartFromValueOrReference.StartFrom.StartFromReference(v) =>
            UserManagedConsumerSessionStartFromValueOrReference(
                value = None,
                reference = Some(v)
            )

def userManagedConsumerSessionStartFromValueOrReferenceToPb(
    v: UserManagedConsumerSessionStartFromValueOrReference
): pb.UserManagedConsumerSessionStartFromValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedConsumerSessionStartFromValueOrReference(
                startFrom = pb.UserManagedConsumerSessionStartFromValueOrReference.StartFrom.StartFromValue(userManagedConsumerSessionStartFromToPb(v))
            )
        case None =>
            pb.UserManagedConsumerSessionStartFromValueOrReference(
                startFrom = pb.UserManagedConsumerSessionStartFromValueOrReference.StartFrom.StartFromReference(v.reference.get)
            )

def consumerSessionEventMessagesProcessedFromPb(v: consumerPb.ConsumerSessionEventMessagesProcessed): ConsumerSessionEventMessagesProcessed =
    ConsumerSessionEventMessagesProcessed(messageCount = v.messageCount)

def consumerSessionEventMessagesProcessedToPb(v: ConsumerSessionEventMessagesProcessed): consumerPb.ConsumerSessionEventMessagesProcessed =
    consumerPb.ConsumerSessionEventMessagesProcessed(messageCount = v.messageCount)

def consumerSessionEventMessagesDeliveredFromPb(v: consumerPb.ConsumerSessionEventMessagesDelivered): ConsumerSessionEventMessagesDelivered =
    ConsumerSessionEventMessagesDelivered(messageCount = v.messageCount)

def consumerSessionEventMessagesDeliveredToPb(v: ConsumerSessionEventMessagesDelivered): consumerPb.ConsumerSessionEventMessagesDelivered =
    consumerPb.ConsumerSessionEventMessagesDelivered(messageCount = v.messageCount)

def consumerSessionEventMessageDecodeFailedFromPb(v: consumerPb.ConsumerSessionEventMessageDecodeFailed): ConsumerSessionEventMessageDecodeFailed =
    ConsumerSessionEventMessageDecodeFailed(failCount = v.failCount)

def consumerSessionEventMessageDecodeFailedToPb(v: ConsumerSessionEventMessageDecodeFailed): consumerPb.ConsumerSessionEventMessageDecodeFailed =
    consumerPb.ConsumerSessionEventMessageDecodeFailed(failCount = v.failCount)

def consumerSessionEventTimeElapsedMsFromPb(v: consumerPb.ConsumerSessionEventTimeElapsedMs): ConsumerSessionEventTimeElapsedMs =
    ConsumerSessionEventTimeElapsedMs(timeElapsedMs = v.timeElapsedMs)

def consumerSessionEventTimeElapsedMsToPb(v: ConsumerSessionEventTimeElapsedMs): consumerPb.ConsumerSessionEventTimeElapsedMs =
    consumerPb.ConsumerSessionEventTimeElapsedMs(timeElapsedMs = v.timeElapsedMs)

def consumerSessionEventTopicEndReachedFromPb(v: consumerPb.ConsumerSessionEventTopicEndReached): ConsumerSessionEventTopicEndReached =
    ConsumerSessionEventTopicEndReached()

def consumerSessionEventTopicEndReachedToPb(v: ConsumerSessionEventTopicEndReached): consumerPb.ConsumerSessionEventTopicEndReached =
    consumerPb.ConsumerSessionEventTopicEndReached()

def consumerSessionEventUnexpectedErrorOccurredFromPb(v: consumerPb.ConsumerSessionEventUnexpectedErrorOccurred): ConsumerSessionEventUnexpectedErrorOccurred =
    ConsumerSessionEventUnexpectedErrorOccurred()

def consumerSessionEventUnexpectedErrorOccurredToPb(v: ConsumerSessionEventUnexpectedErrorOccurred): consumerPb.ConsumerSessionEventUnexpectedErrorOccurred =
    consumerPb.ConsumerSessionEventUnexpectedErrorOccurred()

def consumerSessionEventMessageFilterChainPassedFromPb(v: pb.ConsumerSessionEventMessageFilterChainPassed): ConsumerSessionEventMessageFilterChainPassed =
    ConsumerSessionEventMessageFilterChainPassed(messageFilterChain = userManagedMessageFilterChainValueOrReferenceFromPb(v.messageFilterChain.get))

def consumerSessionEventMessageFilterChainPassedToPb(v: ConsumerSessionEventMessageFilterChainPassed): pb.ConsumerSessionEventMessageFilterChainPassed =
    pb.ConsumerSessionEventMessageFilterChainPassed(messageFilterChain = Some(userManagedMessageFilterChainValueOrReferenceToPb(v.messageFilterChain)))

def userManagedConsumerSessionEventSpecFromPb(v: pb.UserManagedConsumerSessionEventSpec): UserManagedConsumerSessionEventSpec =
    v.event match
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventMessagesProcessed =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventMessagesProcessedFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventMessagesDelivered =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventMessagesDeliveredFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventMessageDecodeFailed =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventMessageDecodeFailedFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventTimeElapsedMs =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventTimeElapsedMsFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventTopicEndReached =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventTopicEndReachedFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventUnexpectedErrorOccurred =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventUnexpectedErrorOccurredFromPb(evt.value))
        case evt: pb.UserManagedConsumerSessionEventSpec.Event.EventMessageFilterChainPassed =>
            UserManagedConsumerSessionEventSpec(event = consumerSessionEventMessageFilterChainPassedFromPb(evt.value))

def userManagedConsumerSessionEventSpecToPb(v: UserManagedConsumerSessionEventSpec): pb.UserManagedConsumerSessionEventSpec =
    v.event match
        case evt: ConsumerSessionEventMessagesProcessed =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventMessagesProcessed(consumerSessionEventMessagesProcessedToPb(evt))
            )
        case evt: ConsumerSessionEventMessagesDelivered =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventMessagesDelivered(consumerSessionEventMessagesDeliveredToPb(evt))
            )
        case evt: ConsumerSessionEventMessageDecodeFailed =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventMessageDecodeFailed(consumerSessionEventMessageDecodeFailedToPb(evt))
            )
        case evt: ConsumerSessionEventTimeElapsedMs =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventTimeElapsedMs(consumerSessionEventTimeElapsedMsToPb(evt))
            )
        case evt: ConsumerSessionEventTopicEndReached =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventTopicEndReached(consumerSessionEventTopicEndReachedToPb(evt))
            )
        case evt: ConsumerSessionEventUnexpectedErrorOccurred =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventUnexpectedErrorOccurred(consumerSessionEventUnexpectedErrorOccurredToPb(evt))
            )
        case evt: ConsumerSessionEventMessageFilterChainPassed =>
            pb.UserManagedConsumerSessionEventSpec(event =
                pb.UserManagedConsumerSessionEventSpec.Event.EventMessageFilterChainPassed(consumerSessionEventMessageFilterChainPassedToPb(evt))
            )

def userManagedConsumerSessionEventFromPb(v: pb.UserManagedConsumerSessionEvent): UserManagedConsumerSessionEvent =
    UserManagedConsumerSessionEvent(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionEventSpecFromPb(v.spec.get)
    )

def userManagedConsumerSessionEventToPb(v: UserManagedConsumerSessionEvent): pb.UserManagedConsumerSessionEvent =
    pb.UserManagedConsumerSessionEvent(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionEventSpecToPb(v.spec))
    )

def userManagedConsumerSessionEventValueOrReferenceFromPb(
    v: pb.UserManagedConsumerSessionEventValueOrReference
): UserManagedConsumerSessionEventValueOrReference =
    v.event match
        case pb.UserManagedConsumerSessionEventValueOrReference.Event.EventValue(v) =>
            UserManagedConsumerSessionEventValueOrReference(
                value = Some(userManagedConsumerSessionEventFromPb(v)),
                reference = None
            )
        case pb.UserManagedConsumerSessionEventValueOrReference.Event.EventReference(v) =>
            UserManagedConsumerSessionEventValueOrReference(
                value = None,
                reference = Some(v)
            )

def userManagedConsumerSessionEventValueOrReferenceToPb(
    v: UserManagedConsumerSessionEventValueOrReference
): pb.UserManagedConsumerSessionEventValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedConsumerSessionEventValueOrReference(
                event = pb.UserManagedConsumerSessionEventValueOrReference.Event.EventValue(userManagedConsumerSessionEventToPb(v))
            )
        case None =>
            pb.UserManagedConsumerSessionEventValueOrReference(
                event = pb.UserManagedConsumerSessionEventValueOrReference.Event.EventReference(v.reference.get)
            )

def consumerSessionPauseTriggerChainModeFromPb(v: consumerPb.ConsumerSessionPauseTriggerChainMode): ConsumerSessionPauseTriggerChainMode =
    v match
        case consumerPb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL => ConsumerSessionPauseTriggerChainMode.All
        case consumerPb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY => ConsumerSessionPauseTriggerChainMode.Any
        case _ => throw new IllegalArgumentException("Unknown consumer session pause trigger chain mode")

def consumerSessionPauseTriggerChainModeToPb(v: ConsumerSessionPauseTriggerChainMode): consumerPb.ConsumerSessionPauseTriggerChainMode =
    v match
        case ConsumerSessionPauseTriggerChainMode.All => consumerPb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL
        case ConsumerSessionPauseTriggerChainMode.Any => consumerPb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY

def userManagedConsumerSessionPauseTriggerChainSpecFromPb(
    v: pb.UserManagedConsumerSessionPauseTriggerChainSpec
): UserManagedConsumerSessionPauseTriggerChainSpec =
    UserManagedConsumerSessionPauseTriggerChainSpec(
        events = v.events.map(userManagedConsumerSessionEventValueOrReferenceFromPb).toVector,
        mode = consumerSessionPauseTriggerChainModeFromPb(v.mode)
    )

def userManagedConsumerSessionPauseTriggerChainSpecToPb(
    v: UserManagedConsumerSessionPauseTriggerChainSpec
): pb.UserManagedConsumerSessionPauseTriggerChainSpec =
    pb.UserManagedConsumerSessionPauseTriggerChainSpec(
        events = v.events.map(userManagedConsumerSessionEventValueOrReferenceToPb),
        mode = consumerSessionPauseTriggerChainModeToPb(v.mode)
    )

def userManagedConsumerSessionPauseTriggerChainFromPb(v: pb.UserManagedConsumerSessionPauseTriggerChain): UserManagedConsumerSessionPauseTriggerChain =
    UserManagedConsumerSessionPauseTriggerChain(
        metadata = userManagedItemMetadataFromPb(v.metadata.get),
        spec = userManagedConsumerSessionPauseTriggerChainSpecFromPb(v.spec.get)
    )

def userManagedConsumerSessionPauseTriggerChainToPb(v: UserManagedConsumerSessionPauseTriggerChain): pb.UserManagedConsumerSessionPauseTriggerChain =
    pb.UserManagedConsumerSessionPauseTriggerChain(
        metadata = Some(userManagedItemMetadataToPb(v.metadata)),
        spec = Some(userManagedConsumerSessionPauseTriggerChainSpecToPb(v.spec))
    )

def userManagedConsumerSessionPauseTriggerChainValueOrReferenceFromPb(
    v: pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference
): UserManagedConsumerSessionPauseTriggerChainValueOrReference =
    v.pauseTriggerChain match
        case pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference.PauseTriggerChain.PauseTriggerChainValue(v) =>
            UserManagedConsumerSessionPauseTriggerChainValueOrReference(
                value = Some(userManagedConsumerSessionPauseTriggerChainFromPb(v)),
                reference = None
            )
        case pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference.PauseTriggerChain.PauseTriggerChainReference(v) =>
            UserManagedConsumerSessionPauseTriggerChainValueOrReference(
                value = None,
                reference = Some(v)
            )

def userManagedConsumerSessionPauseTriggerChainValueOrReferenceToPb(
    v: UserManagedConsumerSessionPauseTriggerChainValueOrReference
): pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference =
    v.value match
        case Some(v) =>
            pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference(
                pauseTriggerChain = pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference.PauseTriggerChain.PauseTriggerChainValue(
                    userManagedConsumerSessionPauseTriggerChainToPb(v)
                )
            )
        case None =>
            pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference(
                pauseTriggerChain = pb.UserManagedConsumerSessionPauseTriggerChainValueOrReference.PauseTriggerChain.PauseTriggerChainReference(v.reference.get)
            )

def userManagedMessageFilterSpecFromPb(v: pb.UserManagedMessageFilterSpec): UserManagedMessageFilterSpec =
    UserManagedMessageFilterSpec(
        messageFilter = messageFilterFromPb(v.messageFilter.get)
    )
def userManagedMessageFilterSpecToPb(v: UserManagedMessageFilterSpec): pb.UserManagedMessageFilterSpec =
    pb.UserManagedMessageFilterSpec(
        messageFilter = Some(messageFilterToPb(v.messageFilter))
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
        case _ => throw new IllegalArgumentException("Unknown message filter value or reference")

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
        startFrom = userManagedConsumerSessionStartFromValueOrReferenceFromPb(v.startFrom.get),
        messageFilterChain = userManagedMessageFilterChainValueOrReferenceFromPb(v.messageFilterChain.get),
        pauseTriggerChain = userManagedConsumerSessionPauseTriggerChainValueOrReferenceFromPb(v.pauseTriggerChain.get)
    )
def userManagedConsumerSessionConfigSpecToPb(v: UserManagedConsumerSessionConfigSpec): pb.UserManagedConsumerSessionConfigSpec =
    pb.UserManagedConsumerSessionConfigSpec(
        startFrom = Some(userManagedConsumerSessionStartFromValueOrReferenceToPb(v.startFrom)),
        messageFilterChain = Some(userManagedMessageFilterChainValueOrReferenceToPb(v.messageFilterChain)),
        pauseTriggerChain = Some(userManagedConsumerSessionPauseTriggerChainValueOrReferenceToPb(v.pauseTriggerChain))
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
    v.item match
        case it: pb.UserManagedItem.Item.ConsumerSessionConfig            => userManagedConsumerSessionConfigFromPb(it.value)
        case it: pb.UserManagedItem.Item.ConsumerSessionStartFrom         => userManagedConsumerSessionStartFromFromPb(it.value)
        case it: pb.UserManagedItem.Item.ConsumerSessionPauseTriggerChain => userManagedConsumerSessionPauseTriggerChainFromPb(it.value)
        case it: pb.UserManagedItem.Item.MessageId                        => userManagedMessageIdFromPb(it.value)
        case it: pb.UserManagedItem.Item.DateTime                         => userManagedDateTimeFromPb(it.value)
        case it: pb.UserManagedItem.Item.RelativeDateTime                 => userManagedRelativeDateTimeFromPb(it.value)
        case it: pb.UserManagedItem.Item.MessageFilter                    => userManagedMessageFilterFromPb(it.value)
        case it: pb.UserManagedItem.Item.MessageFilterChain               => userManagedMessageFilterChainFromPb(it.value)
        case _                                                            => throw new IllegalArgumentException("Unknown user managed item type")

def userManagedItemToPb(v: UserManagedItem): pb.UserManagedItem =
    v match
        case it: UserManagedConsumerSessionConfig =>
            val itPb = userManagedConsumerSessionConfigToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.ConsumerSessionConfig(itPb))
        case it: UserManagedConsumerSessionStartFrom =>
            val itPb = userManagedConsumerSessionStartFromToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.ConsumerSessionStartFrom(itPb))
        case it: UserManagedConsumerSessionPauseTriggerChain =>
            val itPb = userManagedConsumerSessionPauseTriggerChainToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.ConsumerSessionPauseTriggerChain(itPb))
        case it: UserManagedMessageId =>
            val itPb = userManagedMessageIdToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.MessageId(itPb))
        case it: UserManagedDateTime =>
            val itPb = userManagedDateTimeToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.DateTime(itPb))
        case it: UserManagedRelativeDateTime =>
            val itPb = userManagedRelativeDateTimeToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.RelativeDateTime(itPb))
        case it: UserManagedMessageFilter =>
            val itPb = userManagedMessageFilterToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.MessageFilter(itPb))
        case it: UserManagedMessageFilterChain =>
            val itPb = userManagedMessageFilterChainToPb(it)
            pb.UserManagedItem(item = pb.UserManagedItem.Item.MessageFilterChain(itPb))
