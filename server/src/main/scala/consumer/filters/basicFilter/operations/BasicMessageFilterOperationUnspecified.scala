package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationUnspecified(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Unspecified,
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationUnspecified:
    def apply(): BasicMessageFilterOperationUnspecified =
        BasicMessageFilterOperationUnspecified(
            BasicMessageFilterOperationType.Unspecified
        )

    def unapply(op: BasicMessageFilterOperationUnspecified): Boolean = true

    given Decoder[BasicMessageFilterOperationUnspecified] = deriveDecoder[BasicMessageFilterOperationUnspecified]
    given Encoder[BasicMessageFilterOperationUnspecified] = deriveEncoder[BasicMessageFilterOperationUnspecified]
