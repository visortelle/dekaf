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
    RelativeDateTime
}
import java.time.Instant

object UserManagedItemType:
    case class ConsumerSessionConfig()
    case class ConsumerSessionStartFrom()
    case class ConsumerSessionPauseTrigger()
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
    UserManagedItemType.ConsumerSessionConfig | UserManagedItemType.ConsumerSessionStartFrom | UserManagedItemType.ConsumerSessionPauseTrigger |
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
    value: Long,
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

case class UserManagedConsumerSessionStartFromSpec(
    startFrom: EarliestMessage | LatestMessage | UserManagedMessageIdValueOrReference | UserManagedDateTimeValueOrReference |
        UserManagedRelativeDateTimeValueOrReference
)

case class UserManagedConsumerSessionStartFrom(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionStartFromSpec
) extends UserManagedItemTrait

case class UserManagedConsumerSessionStartFromValueOrReference(
    value: Option[UserManagedConsumerSessionStartFrom],
    reference: Option[UserManagedItemReference]
)

case class ConsumerSessionEventMessagesProcessed(messageCount: Long)
case class ConsumerSessionEventMessagesDelivered(messageCount: Long)
case class ConsumerSessionEventBytesProcessed(byteCount: Long)
case class ConsumerSessionEventBytesDelivered(byteCount: Long)
case class ConsumerSessionEventMessageDecodeFailed(failCount: Long)
case class ConsumerSessionEventElapsedTimeMs(elapsedTimeMs: Long)
case class ConsumerSessionEventTopicEndReached()
case class ConsumerSessionEventUnexpectedError()
case class ConsumerSessionEventMessageId(messageId: UserManagedMessageIdValueOrReference)
case class ConsumerSessionEventMessageFilterChainPass(messageFilterChain: UserManagedMessageFilterChainValueOrReference)

case class UserManagedConsumerSessionEventSpec(
    event: ConsumerSessionEventMessagesProcessed | ConsumerSessionEventMessagesDelivered | ConsumerSessionEventBytesProcessed |
        ConsumerSessionEventBytesDelivered | ConsumerSessionEventMessageDecodeFailed | ConsumerSessionEventElapsedTimeMs |
        ConsumerSessionEventTopicEndReached | ConsumerSessionEventUnexpectedError | ConsumerSessionEventMessageId |
        ConsumerSessionEventMessageFilterChainPass
)

case class UserManagedConsumerSessionEvent(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionEventSpec
) extends UserManagedItemTrait

case class UserManagedConsumerSessionEventValueOrReference(
    value: Option[UserManagedConsumerSessionEvent],
    reference: Option[UserManagedItemReference]
)

enum ConsumerSessionPauseTriggerChainMode:
    case All, Any

case class UserManagedConsumerSessionPauseTriggerChainSpec(
    events: List[UserManagedConsumerSessionEventValueOrReference],
    mode: ConsumerSessionPauseTriggerChainMode
)

case class UserManagedConsumerSessionPauseTriggerChain(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionPauseTriggerChainSpec
) extends UserManagedItemTrait

case class UserManagedConsumerSessionPauseTriggerChainValueOrReference(
    value: Option[UserManagedConsumerSessionPauseTriggerChain],
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
    startFrom: UserManagedConsumerSessionStartFromValueOrReference,
    messageFilterChain: UserManagedMessageFilterChainValueOrReference,
    pauseTriggerChain: UserManagedConsumerSessionPauseTriggerChainValueOrReference
)

case class UserManagedConsumerSessionConfig(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigSpec
) extends UserManagedItemTrait

trait UserManagedItemTrait:
    val metadata: UserManagedItemMetadata

type UserManagedItem = UserManagedConsumerSessionConfig | UserManagedConsumerSessionStartFrom | UserManagedConsumerSessionPauseTriggerChain |
    UserManagedMessageId | UserManagedDateTime | UserManagedRelativeDateTime | UserManagedMessageFilter | UserManagedMessageFilterChain
