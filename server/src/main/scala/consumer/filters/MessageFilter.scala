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
    value: BasicMessageFilter | JsMessageFilter
)

object MessageFilter:
    def testMessageFilter(
        filter: MessageFilter,
        messageFilterContext: MessageFilterContext,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): FilterTestResult =
        messageFilterContext.test(filter, jsonMessage, jsonValue, schemaType)
