package library

import _root_.consumer.{
    BasicMessageFilter,
    ConsumerSessionConfig,
    ConsumerSessionConfigPauseTrigger,
    ConsumerSessionConfigStartFrom,
    DateTime,
    DateTimeUnit,
    EarliestMessage,
    JsMessageFilter,
    LatestMessage,
    MessageFilter,
    MessageFilterChain,
    MessageFilterChainMode,
    MessageId,
    RelativeDateTime,
}
import java.time.Instant

object UserManagedItemType:
    case class ConsumerSessionConfig()
    case class ConsumerSessionConfigStartFrom()
    case class ConsumerSessionConfigPauseTrigger()
    case class ProducerSessionConfig()
    case class MarkdownDocument()
    case class MessageFilter()
    case class MessageFilterChain()
    case class DataVisualizationWidget()
    case class DataVisualizationDashboard()
    case class MessageId()
    case class DateTime()
    case class RelativeDateTime()

type UserManagedItemType =
    UserManagedItemType.ConsumerSessionConfig | UserManagedItemType.ConsumerSessionConfigStartFrom | UserManagedItemType.ConsumerSessionConfigPauseTrigger |
        UserManagedItemType.ProducerSessionConfig | UserManagedItemType.MarkdownDocument | UserManagedItemType.MessageFilter |
        UserManagedItemType.MessageFilterChain | UserManagedItemType.DataVisualizationWidget | UserManagedItemType.DataVisualizationDashboard |
        UserManagedItemType.MessageId | UserManagedItemType.DateTime | UserManagedItemType.RelativeDateTime

type UserManagedItemReference = String

case class UserManagedItemMetadata(
    `type`: UserManagedItemType,
    id: String,
    name: String,
    descriptionMarkdown: String
)

case class UserManagedMessageIdSpec(
    messageId: Array[Byte]
)

case class UserManagedMessageId(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageIdSpec
) extends UserManagedItemTrait

case class UserManagedMessageIdValueOrReference(
    value: Option[UserManagedMessageId],
    reference: Option[UserManagedItemReference]
)

case class UserManagedDateTimeSpec(
    dateTime: java.time.Instant
)

case class UserManagedDateTime(
    metadata: UserManagedItemMetadata,
    spec: UserManagedDateTimeSpec
) extends UserManagedItemTrait

case class UserManagedDateTimeValueOrReference(
    value: Option[UserManagedDateTime],
    reference: Option[UserManagedItemReference]
)

case class UserManagedRelativeDateTimeSpec(
    value: Int,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)

case class UserManagedRelativeDateTime(
    metadata: UserManagedItemMetadata,
    spec: UserManagedRelativeDateTimeSpec
) extends UserManagedItemTrait

case class UserManagedRelativeDateTimeValueOrReference(
    value: Option[UserManagedRelativeDateTime],
    reference: Option[UserManagedItemReference]
)

case class UserManagedConsumerSessionConfigStartFromSpec(
    earliestMessage: Option[EarliestMessage] = None,
    latestMessage: Option[LatestMessage] = None,
    messageId: Option[UserManagedMessageIdValueOrReference] = None,
    dateTime: Option[UserManagedDateTimeValueOrReference] = None,
    relativeDateTime: Option[UserManagedRelativeDateTimeValueOrReference] = None
)

case class UserManagedConsumerSessionConfigStartFrom(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigStartFromSpec
) extends UserManagedItemTrait

case class UserManagedConsumerSessionConfigStartFromValueOrReference(
    value: Option[UserManagedConsumerSessionConfigStartFrom],
    reference: Option[UserManagedItemReference]
)

case class UserManagedConsumerSessionConfigPauseTriggerSpec(
    onMessagesProcessed: Option[Long] = None,
    onMessagesDelivered: Option[Long] = None,
    onBytesProcessed: Option[Long] = None,
    onBytesDelivered: Option[Long] = None,
    onMessageDecodeFails: Option[Long] = None,
    onElapsedTimeMs: Option[Long] = None,
    onTopicEndReached: Option[Boolean] = None,
    onDateTime: Option[UserManagedDateTimeValueOrReference] = None,
    onRelativeDateTime: Option[UserManagedRelativeDateTimeValueOrReference] = None,
    onMessageId: Option[UserManagedMessageIdValueOrReference] = None,
    onMessageFilterPass: Option[UserManagedMessageFilterChainValueOrReference] = None,
    onMessageFilterChainPass: Option[UserManagedMessageFilterChainValueOrReference] = None
)

case class UserManagedConsumerSessionConfigPauseTrigger(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigPauseTriggerSpec
) extends UserManagedItemTrait

case class UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
    value: Option[UserManagedConsumerSessionConfigPauseTrigger],
    reference: Option[UserManagedItemReference]
)

case class UserManagedMessageFilterSpec(
    messageFilter: MessageFilter
)

case class UserManagedMessageFilter(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageFilterSpec
) extends UserManagedItemTrait

case class UserManagedMessageFilterValueOrReference(
    value: Option[UserManagedMessageFilter],
    reference: Option[UserManagedItemReference]
)

case class UserManagedMessageFilterChainSpec(
    isEnabled: Boolean,
    isNegated: Boolean,
    filters: List[UserManagedMessageFilterValueOrReference],
    mode: MessageFilterChainMode
)

case class UserManagedMessageFilterChain(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageFilterChainSpec
) extends UserManagedItemTrait

case class UserManagedMessageFilterChainValueOrReference(
    value: Option[UserManagedMessageFilterChain],
    reference: Option[UserManagedItemReference]
)

case class UserManagedConsumerSessionConfigSpec(
    startFrom: UserManagedConsumerSessionConfigStartFromValueOrReference,
    messageFilterChain: UserManagedMessageFilterChainValueOrReference,
    pauseTrigger: UserManagedConsumerSessionConfigPauseTriggerValueOrReference
)

case class UserManagedConsumerSessionConfig(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigSpec
) extends UserManagedItemTrait

trait UserManagedItemTrait:
    val metadata: UserManagedItemMetadata

type UserManagedItem = UserManagedConsumerSessionConfig | UserManagedConsumerSessionConfigStartFrom | UserManagedConsumerSessionConfigPauseTrigger |
    UserManagedMessageId | UserManagedDateTime | UserManagedRelativeDateTime | UserManagedMessageFilter | UserManagedMessageFilterChain
