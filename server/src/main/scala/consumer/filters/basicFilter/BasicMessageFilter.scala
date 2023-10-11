package consumer.filters.basicFilter

import consumer.{FilterTestResult, JsCode, JsonAccumulatorVarName, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import BasicMessageFilterOperation.*
import consumer.filters.basicFilter.operations.{BasicMessageFilterOperationContains, BasicMessageFilterOperationEndsWith, BasicMessageFilterOperationEquals, BasicMessageFilterOperationGreaterThan, BasicMessageFilterOperationGreaterThanOrEquals, BasicMessageFilterOperationIsNull, BasicMessageFilterOperationIsTruthy, BasicMessageFilterOperationLessThan, BasicMessageFilterOperationLessThanOrEquals, BasicMessageFilterOperationRegex, BasicMessageFilterOperationStartsWith, BasicMessageFilterOperationUnspecified}
import io.circe.{Decoder, Encoder, HCursor, Json}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import consumer.filters.jsFilter.JsMessageFilter
import org.apache.pulsar.common.schema.SchemaType
import io.circe.syntax.EncoderOps
import org.graalvm.polyglot.Context

case class BasicMessageFilter(
    operation: BasicMessageFilterOperation,
    target: BasicMessageFilterTarget,
    selector: Option[BasicMessageFilterSelector]
)

object BasicMessageFilter:
    given Decoder[BasicMessageFilter] = deriveDecoder[BasicMessageFilter]
    given Encoder[BasicMessageFilter] = deriveEncoder[BasicMessageFilter]

    def testBasicFilter(
        context: Context,
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType,
    ): FilterTestResult =

        val basicMessageFilterEvalCode = getEvalCode(
            filter = filter,
            jsonMessage = jsonMessage,
            jsonValue = jsonValue,
            schemaType = schemaType
        )

        val testResult = filter.operation match
            case _: BasicMessageFilterOperationUnspecified =>
                Left(s"BasicMessageFilter error: BasicMessageFilter operation unspecified.")
            case _ =>
                try
                    Right(context.eval("js", basicMessageFilterEvalCode).asBoolean)
                catch
                    case err: Throwable => Left(s"BasicMessageFilter error: ${err.getMessage}")

        val cumulativeJsonState = context.eval("js", s"stringify(globalThis.$JsonAccumulatorVarName)").asString
        (testResult, cumulativeJsonState)
