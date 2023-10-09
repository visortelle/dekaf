package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationLessThan(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.LessThan,
    lessThanValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationLessThan:
    def apply(lessThanValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationLessThan =
        BasicMessageFilterOperationLessThan(
            BasicMessageFilterOperationType.LessThan,
            lessThanValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationLessThan): Option[(String, Boolean)] =
        Some((op.lessThanValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationLessThan] = deriveDecoder[BasicMessageFilterOperationLessThan]
    given Encoder[BasicMessageFilterOperationLessThan] = deriveEncoder[BasicMessageFilterOperationLessThan]
