package library

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson
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

object UserManagedItemTypeL:
    case class ConsumerSessionConfig()
    case class ConsumerSessionConfigStartFrom()
    case class ConsumerSessionConfigPauseTrigger()
    case class ProducerSessionConfig()
    case class MarkdownDocument()
    case class MessageFilter()
    case class MessageFilterChain()
    case class DataVisualizationWidget()
    case class DataVisualizationDashboard()

type UserManagedItemType =
    UserManagedItemTypeL.ConsumerSessionConfig |
    UserManagedItemTypeL.ConsumerSessionConfigStartFrom |
    UserManagedItemTypeL.ConsumerSessionConfigPauseTrigger |
    UserManagedItemTypeL.ProducerSessionConfig |
    UserManagedItemTypeL.MarkdownDocument |
    UserManagedItemTypeL.MessageFilter |
    UserManagedItemTypeL.MessageFilterChain |
    UserManagedItemTypeL.DataVisualizationWidget |
    UserManagedItemTypeL.DataVisualizationDashboard
given Encoder[UserManagedItemType] = Encoder.instance {
    case _: UserManagedItemTypeL.ConsumerSessionConfig => Json.obj("type" -> "ConsumerSessionConfig".asJson)
    case _: UserManagedItemTypeL.ConsumerSessionConfigStartFrom => Json.obj("type" -> "ConsumerSessionConfigStartFrom".asJson)
    case _: UserManagedItemTypeL.ConsumerSessionConfigPauseTrigger => Json.obj("type" -> "ConsumerSessionConfigPauseTrigger".asJson)
    case _: UserManagedItemTypeL.ProducerSessionConfig => Json.obj("type" -> "ProducerSessionConfig".asJson)
    case _: UserManagedItemTypeL.MarkdownDocument => Json.obj("type" -> "MarkdownDocument".asJson)
    case _: UserManagedItemTypeL.MessageFilter => Json.obj("type" -> "MessageFilter".asJson)
    case _: UserManagedItemTypeL.MessageFilterChain => Json.obj("type" -> "MessageFilterChain".asJson)
    case _: UserManagedItemTypeL.DataVisualizationWidget => Json.obj("type" -> "DataVisualizationWidget".asJson)
    case _: UserManagedItemTypeL.DataVisualizationDashboard => Json.obj("type" -> "DataVisualizationDashboard".asJson)
}

given Decoder[UserManagedItemType] = Decoder.instance { cursor =>
    cursor.downField("type").as[String].flatMap {
        case "ConsumerSessionConfig" => Right(UserManagedItemTypeL.ConsumerSessionConfig())
        case "ConsumerSessionConfigStartFrom" => Right(UserManagedItemTypeL.ConsumerSessionConfigStartFrom())
        case "ConsumerSessionConfigPauseTrigger" => Right(UserManagedItemTypeL.ConsumerSessionConfigPauseTrigger())
        case "ProducerSessionConfig" => Right(UserManagedItemTypeL.ProducerSessionConfig())
        case "MarkdownDocument" => Right(UserManagedItemTypeL.MarkdownDocument())
        case "MessageFilter" => Right(UserManagedItemTypeL.MessageFilter())
        case "MessageFilterChain" => Right(UserManagedItemTypeL.MessageFilterChain())
        case "DataVisualizationWidget" => Right(UserManagedItemTypeL.DataVisualizationWidget())
        case "DataVisualizationDashboard" => Right(UserManagedItemTypeL.DataVisualizationDashboard())
        case other => Left(DecodingFailure(s"Unknown type: $other", cursor.history))
    }
}

type UserManagedItemReference = String

case class UserManagedItemMetadata(
    `type`: UserManagedItemType,
    id: String,
    name: String,
    descriptionMarkdown: String
)
given Decoder[UserManagedItemMetadata] = deriveDecoder[UserManagedItemMetadata]
given Encoder[UserManagedItemMetadata] = deriveEncoder[UserManagedItemMetadata]

case class UserManagedMessageIdSpec(
    messageId: Array[Byte]
)
given Decoder[UserManagedMessageIdSpec] = deriveDecoder[UserManagedMessageIdSpec]
given Encoder[UserManagedMessageIdSpec] = deriveEncoder[UserManagedMessageIdSpec]

case class UserManagedMessageId(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageIdSpec
)
given Decoder[UserManagedMessageId] = deriveDecoder[UserManagedMessageId]
given Encoder[UserManagedMessageId] = deriveEncoder[UserManagedMessageId]

case class UserManagedMessageIdValueOrReference(
    value: Option[UserManagedMessageId],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedMessageIdValueOrReference] = deriveDecoder[UserManagedMessageIdValueOrReference]
given Encoder[UserManagedMessageIdValueOrReference] = deriveEncoder[UserManagedMessageIdValueOrReference]

case class UserManagedDateTimeSpec(
    dateTime: java.time.Instant
)
given Decoder[UserManagedDateTimeSpec] = deriveDecoder[UserManagedDateTimeSpec]
given Encoder[UserManagedDateTimeSpec] = deriveEncoder[UserManagedDateTimeSpec]

case class UserManagedDateTime(
    metadata: UserManagedItemMetadata,
    spec: UserManagedDateTimeSpec
)
given Decoder[UserManagedDateTime] = deriveDecoder[UserManagedDateTime]
given Encoder[UserManagedDateTime] = deriveEncoder[UserManagedDateTime]

case class UserManagedDateTimeValueOrReference(
    value: Option[UserManagedDateTime],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedDateTimeValueOrReference] = deriveDecoder[UserManagedDateTimeValueOrReference]
given Encoder[UserManagedDateTimeValueOrReference] = deriveEncoder[UserManagedDateTimeValueOrReference]

case class UserManagedRelativeDateTimeSpec(
    value: Int,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)
given Decoder[UserManagedRelativeDateTimeSpec] = deriveDecoder[UserManagedRelativeDateTimeSpec]
given Encoder[UserManagedRelativeDateTimeSpec] = deriveEncoder[UserManagedRelativeDateTimeSpec]

case class UserManagedRelativeDateTime(
    metadata: UserManagedItemMetadata,
    spec: UserManagedRelativeDateTimeSpec
)
given Decoder[UserManagedRelativeDateTime] = deriveDecoder[UserManagedRelativeDateTime]
given Encoder[UserManagedRelativeDateTime] = deriveEncoder[UserManagedRelativeDateTime]

case class UserManagedRelativeDateTimeValueOrReference(
    value: Option[UserManagedRelativeDateTime],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedRelativeDateTimeValueOrReference] = deriveDecoder[UserManagedRelativeDateTimeValueOrReference]
given Encoder[UserManagedRelativeDateTimeValueOrReference] = deriveEncoder[UserManagedRelativeDateTimeValueOrReference]

case class UserManagedConsumerSessionConfigStartFromSpec(
    earliestMessage: Option[EarliestMessage] = None,
    latestMessage: Option[LatestMessage] = None,
    messageId: Option[UserManagedMessageIdValueOrReference] = None,
    dateTime: Option[UserManagedDateTimeValueOrReference] = None,
    relativeDateTime: Option[UserManagedRelativeDateTimeValueOrReference] = None
)
given Decoder[UserManagedConsumerSessionConfigStartFromSpec] = deriveDecoder[UserManagedConsumerSessionConfigStartFromSpec]
given Encoder[UserManagedConsumerSessionConfigStartFromSpec] = deriveEncoder[UserManagedConsumerSessionConfigStartFromSpec]

case class UserManagedConsumerSessionConfigStartFrom(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigStartFromSpec
)
given Decoder[UserManagedConsumerSessionConfigStartFrom] = deriveDecoder[UserManagedConsumerSessionConfigStartFrom]
given Encoder[UserManagedConsumerSessionConfigStartFrom] = deriveEncoder[UserManagedConsumerSessionConfigStartFrom]

case class UserManagedConsumerSessionConfigStartFromValueOrReference(
    value: Option[UserManagedConsumerSessionConfigStartFrom],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedConsumerSessionConfigStartFromValueOrReference] = deriveDecoder[UserManagedConsumerSessionConfigStartFromValueOrReference]
given Encoder[UserManagedConsumerSessionConfigStartFromValueOrReference] = deriveEncoder[UserManagedConsumerSessionConfigStartFromValueOrReference]

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
given Decoder[UserManagedConsumerSessionConfigPauseTriggerSpec] = deriveDecoder[UserManagedConsumerSessionConfigPauseTriggerSpec]
given Encoder[UserManagedConsumerSessionConfigPauseTriggerSpec] = deriveEncoder[UserManagedConsumerSessionConfigPauseTriggerSpec]

case class UserManagedConsumerSessionConfigPauseTrigger(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigPauseTriggerSpec
)
given Decoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveDecoder[UserManagedConsumerSessionConfigPauseTrigger]
given Encoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveEncoder[UserManagedConsumerSessionConfigPauseTrigger]

case class UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
    value: Option[UserManagedConsumerSessionConfigPauseTrigger],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference] = deriveDecoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference]
given Encoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference] = deriveEncoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference]

case class UserManagedMessageFilterSpec(
    isEnabled: Boolean,
    isNegated: Boolean,
    jsFilter: Option[JsMessageFilter],
    basicFilter: Option[BasicMessageFilter]
)
given Decoder[UserManagedMessageFilterSpec] = deriveDecoder[UserManagedMessageFilterSpec]
given Encoder[UserManagedMessageFilterSpec] = deriveEncoder[UserManagedMessageFilterSpec]

case class UserManagedMessageFilter(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageFilterSpec
)
given Decoder[UserManagedMessageFilter] = deriveDecoder[UserManagedMessageFilter]
given Encoder[UserManagedMessageFilter] = deriveEncoder[UserManagedMessageFilter]

case class UserManagedMessageFilterValueOrReference(
    value: Option[UserManagedMessageFilter],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedMessageFilterValueOrReference] = deriveDecoder[UserManagedMessageFilterValueOrReference]
given Encoder[UserManagedMessageFilterValueOrReference] = deriveEncoder[UserManagedMessageFilterValueOrReference]

case class UserManagedMessageFilterChainSpec(
    isEnabled: Boolean,
    isNegated: Boolean,
    filters: List[UserManagedMessageFilterValueOrReference],
    mode: MessageFilterChainMode
)
given Decoder[UserManagedMessageFilterChainSpec] = deriveDecoder[UserManagedMessageFilterChainSpec]
given Encoder[UserManagedMessageFilterChainSpec] = deriveEncoder[UserManagedMessageFilterChainSpec]

case class UserManagedMessageFilterChain(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageFilterChainSpec
)
given Decoder[UserManagedMessageFilterChain] = deriveDecoder[UserManagedMessageFilterChain]
given Encoder[UserManagedMessageFilterChain] = deriveEncoder[UserManagedMessageFilterChain]

case class UserManagedMessageFilterChainValueOrReference(
    value: Option[UserManagedMessageFilterChain],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedMessageFilterChainValueOrReference] = deriveDecoder[UserManagedMessageFilterChainValueOrReference]
given Encoder[UserManagedMessageFilterChainValueOrReference] = deriveEncoder[UserManagedMessageFilterChainValueOrReference]

case class UserManagedConsumerSessionConfigSpec(
    startFrom: UserManagedConsumerSessionConfigStartFromValueOrReference,
    messageFilterChain: UserManagedMessageFilterChainValueOrReference,
    pauseTrigger: UserManagedConsumerSessionConfigPauseTriggerValueOrReference
)
given Decoder[UserManagedConsumerSessionConfigSpec] = deriveDecoder[UserManagedConsumerSessionConfigSpec]
given Encoder[UserManagedConsumerSessionConfigSpec] = deriveEncoder[UserManagedConsumerSessionConfigSpec]

case class UserManagedConsumerSessionConfig(
    metadata: UserManagedItemMetadata,
    spec: UserManagedConsumerSessionConfigSpec
)
given Decoder[UserManagedConsumerSessionConfig] = deriveDecoder[UserManagedConsumerSessionConfig]
given Encoder[UserManagedConsumerSessionConfig] = deriveEncoder[UserManagedConsumerSessionConfig]

case class UserManagedItem(
    consumerSessionConfig: Option[UserManagedConsumerSessionConfig],
    consumerSessionConfigStartFrom: Option[UserManagedConsumerSessionConfigStartFrom],
    consumerSessionConfigPauseTrigger: Option[UserManagedConsumerSessionConfigPauseTrigger],
    messageId: Option[UserManagedMessageId],
    dateTime: Option[UserManagedDateTime],
    relativeDateTime: Option[UserManagedRelativeDateTime],
    messageFilter: Option[UserManagedMessageFilter],
    messageFilterChain: Option[UserManagedMessageFilterChain]
)
given Decoder[UserManagedItem] = deriveDecoder[UserManagedItem]
given Encoder[UserManagedItem] = deriveEncoder[UserManagedItem]
