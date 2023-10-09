package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationStartsWith(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.StartsWith,
    startsWithSubstring: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationStartsWith:
    def apply(startsWithSubstring: String, isCaseSensitive: Boolean): BasicMessageFilterOperationStartsWith =
        new BasicMessageFilterOperationStartsWith(
            BasicMessageFilterOperationType.StartsWith,
            startsWithSubstring,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationStartsWith): Option[(String, Boolean)] =
        Some((op.startsWithSubstring, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationStartsWith] = deriveDecoder[BasicMessageFilterOperationStartsWith]
    given Encoder[BasicMessageFilterOperationStartsWith] = deriveEncoder[BasicMessageFilterOperationStartsWith]

    def getBasicMessageFilterOperationStartsWithEvalCode(
        operation: BasicMessageFilterOperationStartsWith,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        val resultEvalCode = if operation.isCaseSensitive then
            s"message.value?.startsWith(\"${operation.startsWithSubstring}\")"
        else
            s"message.value?.toLowerCase().startsWith(\"${operation.startsWithSubstring.toLowerCase()}\")"

        s"""
           | () => {
           |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
           |
           |    return ${resultEvalCode} ?? false;
           | }
           |""".stripMargin
