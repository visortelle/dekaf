package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationEndsWith(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.EndsWith,
    endsWithSubstring: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        val resultEvalCode = if isCaseSensitive then
            s"message.value?.endsWith(\"${endsWithSubstring}\")"
        else
            s"message.value?.toLowerCase().endsWith(\"${endsWithSubstring.toLowerCase()}\")"

        s"""
           | () => {
           |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
           |
           |    return ${resultEvalCode} ?? false;
           | }
           |""".stripMargin


object BasicMessageFilterOperationEndsWith:
    def apply(endsWithSubstring: String, isCaseSensitive: Boolean): BasicMessageFilterOperationEndsWith =
        new BasicMessageFilterOperationEndsWith(
            BasicMessageFilterOperationType.EndsWith,
            endsWithSubstring,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationEndsWith): Option[(String, Boolean)] =
        Some((op.endsWithSubstring, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationEndsWith] = deriveDecoder[BasicMessageFilterOperationEndsWith]
    given Encoder[BasicMessageFilterOperationEndsWith] = deriveEncoder[BasicMessageFilterOperationEndsWith]

