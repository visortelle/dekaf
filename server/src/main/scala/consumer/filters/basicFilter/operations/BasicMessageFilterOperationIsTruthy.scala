package consumer.filters.basicFilter.operations

import consumer.{JsCode, JsonMessage, MessageValueToJsonResult}
import consumer.filters.basicFilter.{BasicMessageFilterOperation, BasicMessageFilterOperationType}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType

case class BasicMessageFilterOperationIsTruthy(
    private val operationType: BasicMessageFilterOperationType = BasicMessageFilterOperationType.IsTruthy,
    targetString: String
) extends BasicMessageFilterOperation(operationType):
    override def getEvalCode(
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): JsCode = ???

object BasicMessageFilterOperationIsTruthy:
    def apply(targetString: String): BasicMessageFilterOperationIsTruthy =
        new BasicMessageFilterOperationIsTruthy(
            BasicMessageFilterOperationType.IsTruthy,
            targetString
        )

    def unapply(op: BasicMessageFilterOperationIsTruthy): Option[String] =
        Some(op.targetString)

    given Decoder[BasicMessageFilterOperationIsTruthy] = deriveDecoder[BasicMessageFilterOperationIsTruthy]
    given Encoder[BasicMessageFilterOperationIsTruthy] = deriveEncoder[BasicMessageFilterOperationIsTruthy]
