package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationContains(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Contains,
    containsValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        def getDefaultEvalCode: JsCode =
            val resultEvalCode = if isCaseSensitive then
                s"message.value?.includes(\"${containsValue}\")"
            else
                s"message.value?.toLowerCase().includes(\"${containsValue}\")"

            s"""
               | () => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return ${resultEvalCode} ?? false;
               | }
               |""".stripMargin

        currentSchemaType match
            case SchemaType.JSON => ???
            case _ => ???

object BasicMessageFilterOperationContains:
    def apply(containsValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationContains =
        new BasicMessageFilterOperationContains(
            BasicMessageFilterOperationType.Contains,
            containsValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationContains): Option[(String, Boolean)] = 
        Some((op.containsValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationContains] = deriveDecoder[BasicMessageFilterOperationContains]
    given Encoder[BasicMessageFilterOperationContains] = deriveEncoder[BasicMessageFilterOperationContains]
