package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationIsNull(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.IsNull,
    targetString: String
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationIsNull:
    def apply(targetString: String): BasicMessageFilterOperationIsNull =
        new BasicMessageFilterOperationIsNull(
            BasicMessageFilterOperationType.IsNull,
            targetString
        )

    def unapply(op: BasicMessageFilterOperationIsNull): Option[String] =
        Some(op.targetString)

    given Decoder[BasicMessageFilterOperationIsNull] = deriveDecoder[BasicMessageFilterOperationIsNull]
    given Encoder[BasicMessageFilterOperationIsNull] = deriveEncoder[BasicMessageFilterOperationIsNull]
