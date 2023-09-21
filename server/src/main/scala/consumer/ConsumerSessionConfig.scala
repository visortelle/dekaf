package consumer

import io.circe.*
import io.circe.generic.semiauto.*
import io.circe.syntax.*
import io.circe.parser.parse as parseJson
import io.circe.parser.decode as decodeJson
import library.{LibraryItemDescriptor, LibraryItemType}

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
    `type`: MessageFilterType,
    value: BasicMessageFilter | JsMessageFilter
)
given Decoder[MessageFilter] = new Decoder[MessageFilter] {
    final def apply(c: HCursor): Decoder.Result[MessageFilter] =
        for {
            filterType <- c.downField("type").as[MessageFilterType]
            value <- filterType match {
                case MessageFilterType.JsMessageFilter    => c.downField("value").as[JsMessageFilter]
                case MessageFilterType.BasicMessageFilter => c.downField("value").as[BasicMessageFilter]
            }
        } yield MessageFilter(filterType, value)
}
given Encoder[MessageFilter] = new Encoder[MessageFilter] {
    final def apply(a: MessageFilter): Json = Json.obj(
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

enum MessageFilterChainMode:
    case All
    case Any

given Decoder[MessageFilterChainMode] = deriveDecoder[MessageFilterChainMode]
given Encoder[MessageFilterChainMode] = deriveEncoder[MessageFilterChainMode]

case class MessageFilterChain(
    mode: MessageFilterChainMode,
    filters: Map[String, MessageFilter]
)

given Decoder[MessageFilterChain] = deriveDecoder[MessageFilterChain]
given Encoder[MessageFilterChain] = deriveEncoder[MessageFilterChain]

enum StartFromType {
    case EarliestMessage
    case LatestMessage
    case MessageId
    case DateTime
    case RelativeDateTime
}
given Decoder[StartFromType] = deriveDecoder[StartFromType]
given Encoder[StartFromType] = deriveEncoder[StartFromType]

case class StartFromEarliestMessage()
given Decoder[StartFromEarliestMessage] = deriveDecoder[StartFromEarliestMessage]
given Encoder[StartFromEarliestMessage] = deriveEncoder[StartFromEarliestMessage]

case class StartFromLatestMessage()
given Decoder[StartFromLatestMessage] = deriveDecoder[StartFromLatestMessage]
given Encoder[StartFromLatestMessage] = deriveEncoder[StartFromLatestMessage]

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

case class StartFromDateTime(
    dateTime: java.time.Instant
)
given Decoder[StartFromDateTime] = deriveDecoder[StartFromDateTime]
given Encoder[StartFromDateTime] = deriveEncoder[StartFromDateTime]

case class StartFromRelativeDateTime(
    value: Int,
    unit: DateTimeUnit,
    isRoundToUnitStart: Boolean
)
given Decoder[StartFromRelativeDateTime] = deriveDecoder[StartFromRelativeDateTime]
given Encoder[StartFromRelativeDateTime] = deriveEncoder[StartFromRelativeDateTime]

case class StartFromMessageId(
    messageId: Array[Byte]
)
given Decoder[StartFromMessageId] = deriveDecoder[StartFromMessageId]
given Encoder[StartFromMessageId] = deriveEncoder[StartFromMessageId]

case class StartFrom(
    `type`: StartFromType,
    value: StartFromEarliestMessage | StartFromLatestMessage | StartFromMessageId | StartFromDateTime | StartFromRelativeDateTime,
)
given Decoder[StartFrom] = new Decoder[StartFrom] {
    final def apply(c: HCursor): Decoder.Result[StartFrom] =
        for {
            `type` <- c.downField("type").as[StartFromType]
            value <- `type` match {
                case StartFromType.EarliestMessage  => c.downField("value").as[StartFromEarliestMessage]
                case StartFromType.LatestMessage    => c.downField("value").as[StartFromLatestMessage]
                case StartFromType.MessageId        => c.downField("value").as[StartFromMessageId]
                case StartFromType.DateTime         => c.downField("value").as[StartFromDateTime]
                case StartFromType.RelativeDateTime => c.downField("value").as[StartFromRelativeDateTime]
            }
        } yield StartFrom(`type`, value)
}
given Encoder[StartFrom] = new Encoder[StartFrom] {
    final def apply(a: StartFrom): Json = Json.obj(
        ("type", a.`type`.asJson),
        (
            "value",
            a.value match {
                case v: StartFromEarliestMessage => v.asJson
                case v: StartFromLatestMessage   => v.asJson
                case v: StartFromMessageId       => v.asJson
                case v: StartFromDateTime        => v.asJson
                case v: StartFromRelativeDateTime => v.asJson
            }
        )
    )
}

case class ConsumerSessionConfig(
    startFrom: StartFrom,
    messageFilterChain: MessageFilterChain
)
given Decoder[ConsumerSessionConfig] = deriveDecoder[ConsumerSessionConfig]
given Encoder[ConsumerSessionConfig] = deriveEncoder[ConsumerSessionConfig]
