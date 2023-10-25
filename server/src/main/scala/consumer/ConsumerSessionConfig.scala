package consumer

import library.UserManagedItemType

enum MessageFilterType:
    case BasicMessageFilter
    case JsMessageFilter

case class BasicMessageFilter()

case class JsMessageFilter(
    jsCode: String
)

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    `type`: MessageFilterType,
    value: BasicMessageFilter | JsMessageFilter
)

object MessageFilterChainMode:
    case class All()
    case class Any()

type MessageFilterChainMode = MessageFilterChainMode.All | MessageFilterChainMode.Any

case class MessageFilterChain(
    isEnabled: Boolean,
    isNegated: Boolean,
    mode: MessageFilterChainMode,
    filters: List[MessageFilter]
)

enum ConsumerSessionConfigStartFromType {
    case EarliestMessage
    case LatestMessage
    case MessageId
    case DateTime
    case RelativeDateTime
}

case class EarliestMessage()

case class LatestMessage()

enum DateTimeUnit {
    case Second
    case Minute
    case Hour
    case Day
    case Week
    case Month
    case Year
}

case class DateTime(
    dateTime: java.time.Instant
)

case class RelativeDateTime(
    value: Int,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)

case class MessageId(
    messageId: Array[Byte]
)

case class ConsumerSessionConfigStartFrom(
    `type`: ConsumerSessionConfigStartFromType,
    value: EarliestMessage | LatestMessage | MessageId | DateTime | RelativeDateTime
)

case class ConsumerSessionConfigPauseTrigger()

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionConfigStartFrom,
    messageFilterChain: MessageFilterChain,
    pauseTriggers: List[ConsumerSessionConfigPauseTrigger]
)
