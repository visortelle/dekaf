package consumer

import library.UserManagedItemType

case class BasicMessageFilter()


case class JsMessageFilter(
    jsCode: String
)

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    value: BasicMessageFilter | JsMessageFilter
)

enum MessageFilterChainMode:
    case All, Any

case class MessageFilterChain(
    isEnabled: Boolean,
    isNegated: Boolean,
    mode: MessageFilterChainMode,
    filters: List[MessageFilter]
)

case class EarliestMessage()
case class LatestMessage()
case class NMessagesAfterEarliest(n: Long)
case class NMessagesBeforeLatest(n: Long)

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

type ConsumerSessionStartFrom = EarliestMessage | LatestMessage | NMessagesAfterEarliest | NMessagesBeforeLatest | MessageId | DateTime | RelativeDateTime

case class ConsumerSessionEventMessagesProcessed(messageCount: Long)
case class ConsumerSessionEventMessagesDelivered(messageCount: Long)
case class ConsumerSessionEventBytesProcessed(byteCount: Long)
case class ConsumerSessionEventBytesDelivered(byteCount: Long)
case class ConsumerSessionEventMessageDecodeFailed(failCount: Long)
case class ConsumerSessionEventTimeElapsedMs(timeElapsedMs: Long)
case class ConsumerSessionEventTopicEndReached()
case class ConsumerSessionEventUnexpectedErrorOccurred()
case class ConsumerSessionEventMessageFilterChainPassed(messageFilterChain: MessageFilterChain)

type ConsumerSessionEvent = ConsumerSessionEventMessagesProcessed | ConsumerSessionEventMessagesDelivered | ConsumerSessionEventBytesProcessed |
    ConsumerSessionEventBytesDelivered | ConsumerSessionEventMessageDecodeFailed | ConsumerSessionEventTimeElapsedMs | ConsumerSessionEventTopicEndReached |
    ConsumerSessionEventUnexpectedErrorOccurred | ConsumerSessionEventMessageFilterChainPassed

enum ConsumerSessionPauseTriggerChainMode:
    case All, Any

case class ConsumerSessionPauseTriggerChain(
   events: Vector[ConsumerSessionEvent],
   mode: ConsumerSessionPauseTriggerChainMode,
)

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionStartFrom,
    messageFilterChain: MessageFilterChain,
    pauseTriggerChain: ConsumerSessionPauseTriggerChain,
)
