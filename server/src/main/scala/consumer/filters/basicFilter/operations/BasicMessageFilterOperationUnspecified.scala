package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationUnspecified(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.Unspecified,
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode = 
        BasicMessageFilterOperation.getSucceededEvalCode

object BasicMessageFilterOperationUnspecified:
    def apply(): BasicMessageFilterOperationUnspecified =
        BasicMessageFilterOperationUnspecified(
            BasicMessageFilterOperationType.Unspecified
        )

    def unapply(op: BasicMessageFilterOperationUnspecified): Boolean = true

    given Decoder[BasicMessageFilterOperationUnspecified] = deriveDecoder[BasicMessageFilterOperationUnspecified]
    given Encoder[BasicMessageFilterOperationUnspecified] = deriveEncoder[BasicMessageFilterOperationUnspecified]
