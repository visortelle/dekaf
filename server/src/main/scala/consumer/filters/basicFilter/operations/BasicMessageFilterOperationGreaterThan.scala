package consumer.filters.basicFilter.operations

import consumer.MessageFilterContext
import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationGreaterThan(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.GreaterThan,
    greaterThanValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        val resultEvalCode = if isCaseSensitive then
            s"message.value === \"${greaterThanValue}\""
        else
            s"message.value?.toLowerCase() === \"${greaterThanValue.toLowerCase()}\""

        s"""
           | () => {
           |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
           |
           |    return ${resultEvalCode} ?? false;
           | }
           |""".stripMargin

object BasicMessageFilterOperationGreaterThan:
    def apply(greaterThanValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationGreaterThan =
        new BasicMessageFilterOperationGreaterThan(
            BasicMessageFilterOperationType.GreaterThan,
            greaterThanValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationGreaterThan): Option[(String, Boolean)] =
        Some((op.greaterThanValue, op.isCaseSensitive))
        
    given Decoder[BasicMessageFilterOperationGreaterThan] = deriveDecoder[BasicMessageFilterOperationGreaterThan]
    given Encoder[BasicMessageFilterOperationGreaterThan] = deriveEncoder[BasicMessageFilterOperationGreaterThan]
