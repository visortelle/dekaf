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

enum SubscriptionInitialPosition:
    case Earliest
    case Latest

given Decoder[SubscriptionInitialPosition] = deriveDecoder[SubscriptionInitialPosition]
given Encoder[SubscriptionInitialPosition] = deriveEncoder[SubscriptionInitialPosition]

case class ConsumerSessionConfig(
    subscriptionInitialPosition: SubscriptionInitialPosition,
    messageFilterChain: MessageFilterChain
)

given Decoder[ConsumerSessionConfig] = deriveDecoder[ConsumerSessionConfig]
given Encoder[ConsumerSessionConfig] = deriveEncoder[ConsumerSessionConfig]
