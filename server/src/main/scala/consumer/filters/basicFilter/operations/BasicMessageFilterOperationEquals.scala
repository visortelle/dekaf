package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationEquals(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Equals,
    equalToValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        val resultEvalCode = if isCaseSensitive then
            s"message.value === \"${equalToValue}\""
        else
            s"message.value?.toLowerCase() === \"${equalToValue.toLowerCase()}\""

        s"""
           | () => {
           |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
           |
           |    return ${resultEvalCode} ?? false;
           | }
           |""".stripMargin

object BasicMessageFilterOperationEquals:
    def apply(equalToValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationEquals =
        new BasicMessageFilterOperationEquals(
            BasicMessageFilterOperationType.Equals,
            equalToValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationEquals): Option[(String, Boolean)] =
        Some((op.equalToValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationEquals] = deriveDecoder[BasicMessageFilterOperationEquals]
    given Encoder[BasicMessageFilterOperationEquals] = deriveEncoder[BasicMessageFilterOperationEquals]
