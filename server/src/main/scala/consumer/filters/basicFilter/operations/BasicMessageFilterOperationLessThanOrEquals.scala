package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationLessThanOrEquals(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.LessThanOrEqual,
    lessThanOrEqualsValue: String,
    isCaseSensitive: Boolean
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationLessThanOrEquals:
    def apply(lessThanOrEqualsValue: String, isCaseSensitive: Boolean): BasicMessageFilterOperationLessThanOrEquals =
        new BasicMessageFilterOperationLessThanOrEquals(
            BasicMessageFilterOperationType.LessThanOrEqual,
            lessThanOrEqualsValue,
            isCaseSensitive
        )

    def unapply(op: BasicMessageFilterOperationLessThanOrEquals): Option[(String, Boolean)] =
        Some((op.lessThanOrEqualsValue, op.isCaseSensitive))

    given Decoder[BasicMessageFilterOperationLessThanOrEquals] = deriveDecoder[BasicMessageFilterOperationLessThanOrEquals]
    given Encoder[BasicMessageFilterOperationLessThanOrEquals] = deriveEncoder[BasicMessageFilterOperationLessThanOrEquals]
