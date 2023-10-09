package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationGreaterThanOrEquals(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.GreaterThanOrEqual,
    greaterThanOrEqualsValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationGreaterThanOrEquals:

    def apply(greaterThanOrEqualsValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationGreaterThanOrEquals =
        new BasicMessageFilterOperationGreaterThanOrEquals(
            BasicMessageFilterOperationType.GreaterThanOrEqual,
            greaterThanOrEqualsValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationGreaterThanOrEquals): Option[(String, Boolean)] =
        Some((op.greaterThanOrEqualsValue, op.isCaseSensitive))
        
    given Decoder[BasicMessageFilterOperationGreaterThanOrEquals] = deriveDecoder[BasicMessageFilterOperationGreaterThanOrEquals]
    given Encoder[BasicMessageFilterOperationGreaterThanOrEquals] = deriveEncoder[BasicMessageFilterOperationGreaterThanOrEquals]
