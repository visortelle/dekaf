package consumer.filters.basicFilter

import consumer.MessageFilterContext
import BasicMessageFilterOperation.*
import consumer.filters.basicFilter.operations.{BasicMessageFilterOperationContains, BasicMessageFilterOperationEndsWith, BasicMessageFilterOperationEquals, BasicMessageFilterOperationGreaterThan, BasicMessageFilterOperationGreaterThanOrEquals, BasicMessageFilterOperationIsNull, BasicMessageFilterOperationIsTruthy, BasicMessageFilterOperationLessThan, BasicMessageFilterOperationLessThanOrEquals, BasicMessageFilterOperationRegex, BasicMessageFilterOperationStartsWith, BasicMessageFilterOperationUnspecified}
import io.circe.{Decoder, Encoder, HCursor, Json}
import consumer.filters.jsFilter.JsMessageFilter
import consumer.{FilterTestResult, JsonAccumulatorVarName, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import org.apache.pulsar.common.schema.SchemaType
import io.circe.syntax.EncoderOps
import org.graalvm.polyglot.Context

type BasicMessageFilterFieldSelector = String
case class BasicMessageFilter(
    operation: BasicMessageFilterOperation,
    target: BasicMessageFilterTarget,
    fieldSelector: BasicMessageFilterFieldSelector
)

object BasicMessageFilter:
    given Decoder[BasicMessageFilter] = Decoder.instance { (c: HCursor) =>
        for {
            operation <- c.downField("operation").as[BasicMessageFilterOperation]
            target <- c.downField("target").as[BasicMessageFilterTarget]
            fieldSelector <- c.downField("fieldSelector").as[BasicMessageFilterFieldSelector]
        } yield BasicMessageFilter(
            operation = operation,
            target = target,
            fieldSelector = fieldSelector
        )
    }

    given Encoder[BasicMessageFilter] = Encoder.instance { (a: BasicMessageFilter) =>
        Json.obj(
            ("operation", a.operation.asJson),
            ("target", a.target.asJson),
            ("fieldSelector", a.fieldSelector.asJson)
        )
    }

    def testBasicFilter(
        context: Context,
        filter: BasicMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        currentSchemaType: SchemaType
    ): FilterTestResult =

        val basicMessageFilterEvalCode = BasicMessageFilterOperation.getEvalCode(
            operation = filter.operation,
            jsonMessage = jsonMessage,
            jsonValue = jsonValue,
            currentSchemaType = currentSchemaType
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
