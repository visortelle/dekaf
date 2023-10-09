package consumer.filters

import consumer.filters.MessageFilterType
import consumer.filters.basicFilter.BasicMessageFilter
import consumer.filters.jsFilter.JsMessageFilter
import consumer.{FilterTestResult, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import io.circe.{Decoder, Encoder, HCursor, Json}
import io.circe.syntax.EncoderOps
import org.apache.pulsar.common.schema.SchemaType

case class MessageFilter(
    isEnabled: Boolean,
    isNegated: Boolean,
    `type`: MessageFilterType,
    value: BasicMessageFilter | JsMessageFilter
)

object MessageFilter:
    given Decoder[MessageFilter] = Decoder.instance { (c: HCursor) =>
        for {
            isEnabled <- c.downField("isEnabled").as[Boolean]
            isNegated <- c.downField("isNegated").as[Boolean]
            filterType <- c.downField("type").as[MessageFilterType]
            value <- filterType match {
                case MessageFilterType.JsMessageFilter => c.downField("value").as[JsMessageFilter]
                case MessageFilterType.BasicMessageFilter => c.downField("value").as[BasicMessageFilter]
            }
        } yield MessageFilter(isEnabled, isNegated, filterType, value)
    }

    given Encoder[MessageFilter] = Encoder.instance { (a: MessageFilter) =>
        Json.obj(
            ("isEnabled", a.isEnabled.asJson),
            ("isNegated", a.isNegated.asJson),
            ("type", a.`type`.asJson),
            (
                "value",
                a.value match {
                    case v: JsMessageFilter => v.asJson
                    case v: BasicMessageFilter => v.asJson
                }
            )
        )
    }

    def testMessageFilter(
        filter: MessageFilter,
        messageFilterContext: MessageFilterContext,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): FilterTestResult =
        messageFilterContext.test(filter, jsonMessage, jsonValue, currentSchemaType)
