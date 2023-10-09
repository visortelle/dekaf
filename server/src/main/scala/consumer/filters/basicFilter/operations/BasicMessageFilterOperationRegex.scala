package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.MessageFilterContext
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationRegex(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Regex,
    regexPattern: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationRegex:
    def apply(regexPattern: String, isCaseSensitive: Boolean): BasicMessageFilterOperationRegex =
        new BasicMessageFilterOperationRegex(
            BasicMessageFilterOperationType.Regex,
            regexPattern,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationRegex): Option[(String, Boolean)] =
        Some((op.regexPattern, op.isCaseSensitive))
        
    given Decoder[BasicMessageFilterOperationRegex] = deriveDecoder[BasicMessageFilterOperationRegex]
    given Encoder[BasicMessageFilterOperationRegex] = deriveEncoder[BasicMessageFilterOperationRegex]

    def getBasicMessageFilterOperationRegexEvalCode(
        operation: BasicMessageFilterOperationRegex,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode =
        val regexValue = if operation.isCaseSensitive then
            s"/${operation.regexPattern}/g"
        else
            s"/${operation.regexPattern}/gi"

        s"""
           | () => {
           |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
           |
           |    const regex = ${regexValue}
           |    const matchResult = message.value?.match(regex)
           |    return matchResult !== undefined ? (
           |       matchResult !== null
           |    ) : (
           |       false
           |    )
           | }
           |""".stripMargin
