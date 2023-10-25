package library

import consumer.{DateTimeUnit, EarliestMessage, LatestMessage}
import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson
import _root_.consumer.{
    ConsumerSessionConfig,
    ConsumerSessionConfigPauseTrigger,
    ConsumerSessionConfigStartFrom,
    DateTime,
    DateTimeUnit,
    EarliestMessage,
    LatestMessage,
    MessageId,
    RelativeDateTime
}
import consumer.filters.{
    MessageFilter,
    MessageFilterChain,
    MessageFilterChainMode,
}
import consumer.filters.jsFilter.JsMessageFilter
import consumer.filters.basicFilter.BasicMessageFilter
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
given Encoder[UserManagedItemType] = Encoder.instance {
    case _: UserManagedItemType.ConsumerSessionConfig             => "ConsumerSessionConfig".asJson
    case _: UserManagedItemType.ConsumerSessionConfigStartFrom    => "ConsumerSessionConfigStartFrom".asJson
    case _: UserManagedItemType.ConsumerSessionConfigPauseTrigger => "ConsumerSessionConfigPauseTrigger".asJson
    case _: UserManagedItemType.ProducerSessionConfig             => "ProducerSessionConfig".asJson
    case _: UserManagedItemType.MarkdownDocument                  => "MarkdownDocument".asJson
    case _: UserManagedItemType.MessageFilter                     => "MessageFilter".asJson
    case _: UserManagedItemType.MessageFilterChain                => "MessageFilterChain".asJson
    case _: UserManagedItemType.DataVisualizationWidget           => "DataVisualizationWidget".asJson
    case _: UserManagedItemType.DataVisualizationDashboard        => "DataVisualizationDashboard".asJson
    case _: UserManagedItemType.MessageId                         => "MessageId".asJson
    case _: UserManagedItemType.DateTime                          => "DateTime".asJson
    case _: UserManagedItemType.RelativeDateTime                  => "RelativeDateTime".asJson
}
given Decoder[UserManagedItemType] = Decoder.instance { cursor =>
    cursor.as[String].flatMap {
        case "ConsumerSessionConfig"             => Right(UserManagedItemType.ConsumerSessionConfig())
        case "ConsumerSessionConfigStartFrom"    => Right(UserManagedItemType.ConsumerSessionConfigStartFrom())
        case "ConsumerSessionConfigPauseTrigger" => Right(UserManagedItemType.ConsumerSessionConfigPauseTrigger())
        case "ProducerSessionConfig"             => Right(UserManagedItemType.ProducerSessionConfig())
        case "MarkdownDocument"                  => Right(UserManagedItemType.MarkdownDocument())
        case "MessageFilter"                     => Right(UserManagedItemType.MessageFilter())
        case "MessageFilterChain"                => Right(UserManagedItemType.MessageFilterChain())
        case "DataVisualizationWidget"           => Right(UserManagedItemType.DataVisualizationWidget())
        case "DataVisualizationDashboard"        => Right(UserManagedItemType.DataVisualizationDashboard())
        case "MessageId"                         => Right(UserManagedItemType.MessageId())
        case "DateTime"                          => Right(UserManagedItemType.DateTime())
        case "RelativeDateTime"                  => Right(UserManagedItemType.RelativeDateTime())

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
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
given Decoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveDecoder[UserManagedConsumerSessionConfigPauseTrigger]
given Encoder[UserManagedConsumerSessionConfigPauseTrigger] = deriveEncoder[UserManagedConsumerSessionConfigPauseTrigger]

case class UserManagedConsumerSessionConfigPauseTriggerValueOrReference(
    value: Option[UserManagedConsumerSessionConfigPauseTrigger],
    reference: Option[UserManagedItemReference]
)
given Decoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference] = deriveDecoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference]
given Encoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference] = deriveEncoder[UserManagedConsumerSessionConfigPauseTriggerValueOrReference]

case class UserManagedMessageFilterSpec(
    messageFilter: MessageFilter
)
given Encoder[UserManagedMessageFilterSpec] = deriveEncoder[UserManagedMessageFilterSpec]
given Decoder[UserManagedMessageFilterSpec] = deriveDecoder[UserManagedMessageFilterSpec]

case class UserManagedMessageFilter(
    metadata: UserManagedItemMetadata,
    spec: UserManagedMessageFilterSpec
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
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
) extends UserManagedItemTrait
given Decoder[UserManagedConsumerSessionConfig] = deriveDecoder[UserManagedConsumerSessionConfig]
given Encoder[UserManagedConsumerSessionConfig] = deriveEncoder[UserManagedConsumerSessionConfig]

trait UserManagedItemTrait:
    val metadata: UserManagedItemMetadata

type UserManagedItem = UserManagedConsumerSessionConfig | UserManagedConsumerSessionConfigStartFrom | UserManagedConsumerSessionConfigPauseTrigger |
    UserManagedMessageId | UserManagedDateTime | UserManagedRelativeDateTime | UserManagedMessageFilter | UserManagedMessageFilterChain
given Encoder[UserManagedItem] = Encoder.instance {
    case v: UserManagedConsumerSessionConfig             => v.asJson
    case v: UserManagedConsumerSessionConfigStartFrom    => v.asJson
    case v: UserManagedConsumerSessionConfigPauseTrigger => v.asJson
    case v: UserManagedMessageFilter                     => v.asJson
    case v: UserManagedMessageFilterChain                => v.asJson
    case v: UserManagedMessageId                         => v.asJson
    case v: UserManagedDateTime                          => v.asJson
    case v: UserManagedRelativeDateTime                  => v.asJson
}
given Decoder[UserManagedItem] = Decoder.instance { cursor =>
    cursor.downField("metadata").downField("type").as[String].flatMap {
        case "ConsumerSessionConfig"             => cursor.as[UserManagedConsumerSessionConfig].map(_.asInstanceOf[UserManagedItem])
        case "ConsumerSessionConfigStartFrom"    => cursor.as[UserManagedConsumerSessionConfigStartFrom].map(_.asInstanceOf[UserManagedItem])
        case "ConsumerSessionConfigPauseTrigger" => cursor.as[UserManagedConsumerSessionConfigPauseTrigger].map(_.asInstanceOf[UserManagedItem])
        case "MessageFilter"                     => cursor.as[UserManagedMessageFilter].map(_.asInstanceOf[UserManagedItem])
        case "MessageFilterChain"                => cursor.as[UserManagedMessageFilterChain].map(_.asInstanceOf[UserManagedItem])
        case "MessageId"                         => cursor.as[UserManagedMessageId].map(_.asInstanceOf[UserManagedItem])
        case "DateTime"                          => cursor.as[UserManagedDateTime].map(_.asInstanceOf[UserManagedItem])
        case "RelativeDateTime"                  => cursor.as[UserManagedRelativeDateTime].map(_.asInstanceOf[UserManagedItem])

        case other => Left(DecodingFailure(s"Unknown type: $other", cursor.history))
    }
}
