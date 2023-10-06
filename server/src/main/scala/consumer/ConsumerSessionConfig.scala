package consumer

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson
import library.UserManagedItemType

enum MessageFilterType:
    case BasicMessageFilter
    case JsMessageFilter
given Decoder[MessageFilterType] = deriveDecoder[MessageFilterType]
given Encoder[MessageFilterType] = deriveEncoder[MessageFilterType]

case class BasicMessageFilter()
given Decoder[BasicMessageFilter] = deriveDecoder[BasicMessageFilter]
given Encoder[BasicMessageFilter] = deriveEncoder[BasicMessageFilter]

case class JsMessageFilter(
    jsCode: String
)
given Decoder[JsMessageFilter] = deriveDecoder[JsMessageFilter]
given Encoder[JsMessageFilter] = deriveEncoder[JsMessageFilter]

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    `type`: MessageFilterType,
    value: BasicMessageFilter | JsMessageFilter
)
given Decoder[MessageFilter] = new Decoder[MessageFilter] {
    final def apply(c: HCursor): Decoder.Result[MessageFilter] =
        for {
            isEnabled <- c.downField("isEnabled").as[Boolean]
            isNegated <- c.downField("isNegated").as[Boolean]
            filterType <- c.downField("type").as[MessageFilterType]
            value <- filterType match {
                case MessageFilterType.JsMessageFilter    => c.downField("value").as[JsMessageFilter]
                case MessageFilterType.BasicMessageFilter => c.downField("value").as[BasicMessageFilter]
            }
        } yield MessageFilter(isEnabled, isNegated, filterType, value)
}
given Encoder[MessageFilter] = new Encoder[MessageFilter] {
    final def apply(a: MessageFilter): Json = Json.obj(
        ("isEnabled", a.isEnabled.asJson),
        ("isNegated", a.isNegated.asJson),
        ("type", a.`type`.asJson),
        (
            "value",
            a.value match {
                case v: JsMessageFilter    => v.asJson
                case v: BasicMessageFilter => v.asJson
            }
        )
    )
}

object MessageFilterChainMode:
    case class All()
    case class Any()

type MessageFilterChainMode = MessageFilterChainMode.All | MessageFilterChainMode.Any

given Encoder[MessageFilterChainMode] = Encoder.instance {
    case _: MessageFilterChainMode.All => "All".asJson
    case _: MessageFilterChainMode.Any => "Any".asJson
}
given Decoder[MessageFilterChainMode] = Decoder.instance { cursor =>
    cursor.as[String].flatMap {
        case "All" => Right(MessageFilterChainMode.All())
        case "Any" => Right(MessageFilterChainMode.Any())

        case other => Left(DecodingFailure(s"Unknown type: $other", cursor.history))
    }
}

case class MessageFilterChain(
    isEnabled: Boolean,
    isNegated: Boolean,
    mode: MessageFilterChainMode,
    filters: List[MessageFilter]
)

given Decoder[MessageFilterChain] = deriveDecoder[MessageFilterChain]
given Encoder[MessageFilterChain] = deriveEncoder[MessageFilterChain]

enum ConsumerSessionConfigStartFromType {
    case EarliestMessage
    case LatestMessage
    case MessageId
    case DateTime
    case RelativeDateTime
}
given Decoder[ConsumerSessionConfigStartFromType] = deriveDecoder[ConsumerSessionConfigStartFromType]
given Encoder[ConsumerSessionConfigStartFromType] = deriveEncoder[ConsumerSessionConfigStartFromType]

case class EarliestMessage()
given Decoder[EarliestMessage] = deriveDecoder[EarliestMessage]
given Encoder[EarliestMessage] = deriveEncoder[EarliestMessage]

case class LatestMessage()
given Decoder[LatestMessage] = deriveDecoder[LatestMessage]
given Encoder[LatestMessage] = deriveEncoder[LatestMessage]

enum DateTimeUnit {
    case Second
    case Minute
    case Hour
    case Day
    case Week
    case Month
    case Year
}
given Decoder[DateTimeUnit] = deriveDecoder[DateTimeUnit]
given Encoder[DateTimeUnit] = deriveEncoder[DateTimeUnit]

case class DateTime(
    dateTime: java.time.Instant
)
given Decoder[DateTime] = deriveDecoder[DateTime]
given Encoder[DateTime] = deriveEncoder[DateTime]

case class RelativeDateTime(
    value: Int,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)
given Decoder[RelativeDateTime] = deriveDecoder[RelativeDateTime]
given Encoder[RelativeDateTime] = deriveEncoder[RelativeDateTime]

case class MessageId(
    messageId: Array[Byte]
)
given Decoder[MessageId] = deriveDecoder[MessageId]
given Encoder[MessageId] = deriveEncoder[MessageId]

case class ConsumerSessionConfigStartFrom(
    `type`: ConsumerSessionConfigStartFromType,
    value: EarliestMessage | LatestMessage | MessageId | DateTime | RelativeDateTime
)
given Decoder[ConsumerSessionConfigStartFrom] = new Decoder[ConsumerSessionConfigStartFrom] {
    final def apply(c: HCursor): Decoder.Result[ConsumerSessionConfigStartFrom] =
        for {
            `type` <- c.downField("type").as[ConsumerSessionConfigStartFromType]
            value <- `type` match {
                case ConsumerSessionConfigStartFromType.EarliestMessage  => c.downField("value").as[EarliestMessage]
                case ConsumerSessionConfigStartFromType.LatestMessage    => c.downField("value").as[LatestMessage]
                case ConsumerSessionConfigStartFromType.MessageId        => c.downField("value").as[MessageId]
                case ConsumerSessionConfigStartFromType.DateTime         => c.downField("value").as[DateTime]
                case ConsumerSessionConfigStartFromType.RelativeDateTime => c.downField("value").as[RelativeDateTime]
            }
        } yield ConsumerSessionConfigStartFrom(`type`, value)
}
given Encoder[ConsumerSessionConfigStartFrom] = new Encoder[ConsumerSessionConfigStartFrom] {
    final def apply(a: ConsumerSessionConfigStartFrom): Json = Json.obj(
        ("type", a.`type`.asJson),
        (
            "value",
            a.value match {
                case v: EarliestMessage  => v.asJson
                case v: LatestMessage    => v.asJson
                case v: MessageId        => v.asJson
                case v: DateTime         => v.asJson
                case v: RelativeDateTime => v.asJson
            }
        )
    )
}

case class ConsumerSessionConfigPauseTrigger()
given Decoder[ConsumerSessionConfigPauseTrigger] = deriveDecoder[ConsumerSessionConfigPauseTrigger]
given Encoder[ConsumerSessionConfigPauseTrigger] = deriveEncoder[ConsumerSessionConfigPauseTrigger]

case class ConsumerSessionConfig(
    startFrom: ConsumerSessionConfigStartFrom,
    messageFilterChain: MessageFilterChain,
    pauseTriggers: List[ConsumerSessionConfigPauseTrigger]
)
given Decoder[ConsumerSessionConfig] = deriveDecoder[ConsumerSessionConfig]
given Encoder[ConsumerSessionConfig] = deriveEncoder[ConsumerSessionConfig]
