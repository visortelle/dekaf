package consumer.filters.basicFilter

import consumer.*
import consumer.MessageFilterContext
import consumer.filters.basicFilter.operations.*
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterOperationType}
import consumer.filters.jsFilter.JsMessageFilter
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import io.circe.{Decoder, Encoder, HCursor}
import io.circe.syntax.EncoderOps
import org.apache.pulsar.common.schema.SchemaType

trait BasicMessageFilterOperation(operationType: BasicMessageFilterOperationType):
    def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode

object BasicMessageFilterOperation:
    given Encoder[BasicMessageFilterOperation] =
        Encoder.instance:
            case op: BasicMessageFilterOperationContains => op.asJson
            case op: BasicMessageFilterOperationEndsWith => op.asJson
            case op: BasicMessageFilterOperationEquals => op.asJson
            case op: BasicMessageFilterOperationGreaterThan => op.asJson
            case op: BasicMessageFilterOperationGreaterThanOrEquals => op.asJson
            case op: BasicMessageFilterOperationLessThan => op.asJson
            case op: BasicMessageFilterOperationLessThanOrEquals => op.asJson
            case op: BasicMessageFilterOperationRegex => op.asJson
            case op: BasicMessageFilterOperationStartsWith => op.asJson
            case op: BasicMessageFilterOperationIsNull => op.asJson
            case op: BasicMessageFilterOperationIsTruthy => op.asJson
            case op: BasicMessageFilterOperationUnspecified => op.asJson

    given Decoder[BasicMessageFilterOperation] =
        Decoder.instance:
            cursor =>
                for {
                    operationType <- cursor.downField("operationType").as[BasicMessageFilterOperationType]
                    operation <- operationType match
                        case BasicMessageFilterOperationType.Contains => cursor.as[BasicMessageFilterOperationContains]
                        case BasicMessageFilterOperationType.EndsWith => cursor.as[BasicMessageFilterOperationEndsWith]
                        case BasicMessageFilterOperationType.Equals => cursor.as[BasicMessageFilterOperationEquals]
                        case BasicMessageFilterOperationType.GreaterThan => cursor.as[BasicMessageFilterOperationGreaterThan]
                        case BasicMessageFilterOperationType.GreaterThanOrEqual => cursor.as[BasicMessageFilterOperationGreaterThanOrEquals]
                        case BasicMessageFilterOperationType.LessThan => cursor.as[BasicMessageFilterOperationLessThan]
                        case BasicMessageFilterOperationType.LessThanOrEqual => cursor.as[BasicMessageFilterOperationLessThanOrEquals]
                        case BasicMessageFilterOperationType.Regex => cursor.as[BasicMessageFilterOperationRegex]
                        case BasicMessageFilterOperationType.StartsWith => cursor.as[BasicMessageFilterOperationStartsWith]
                        case BasicMessageFilterOperationType.IsNull => cursor.as[BasicMessageFilterOperationIsNull]
                        case BasicMessageFilterOperationType.IsTruthy => cursor.as[BasicMessageFilterOperationIsTruthy]
                        case BasicMessageFilterOperationType.Unspecified => cursor.as[BasicMessageFilterOperationUnspecified]
                } yield operation

    final def getSucceededEvalCode: JsCode =
        "() => { return true; }"

    def getEvalCode(
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): JsCode =
        filter.operation match
            case op: BasicMessageFilterOperation =>
                op.getEvalCode(filter, jsonMessage, jsonValue, schemaType)
            case _ =>
                getSucceededEvalCode
