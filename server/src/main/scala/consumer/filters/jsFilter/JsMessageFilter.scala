package consumer.filters.jsFilter

import consumer.MessageFilterContext
import consumer.filters.jsFilter.JsMessageFilter
import consumer.{FilterTestResult, JsonAccumulatorVarName, JsonMessage, MessageFilterContext, MessageValueToJsonResult}
import io.circe.{Decoder, Encoder}
import io.circe.generic.semiauto.{deriveDecoder, deriveEncoder}
import org.apache.pulsar.common.schema.SchemaType
import org.graalvm.polyglot.Context

case class JsMessageFilter(
    jsCode: String
)

object JsMessageFilter:
    given Decoder[JsMessageFilter] = deriveDecoder[JsMessageFilter]
    given Encoder[JsMessageFilter] = deriveEncoder[JsMessageFilter]

    def testJsFilter(
        context: Context,
        filter: JsMessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult
    ): FilterTestResult =
        val evalCode =
            s"""
               | (() => {
               |    ${MessageFilterContext.setupFilterContextCode(jsonMessage, jsonValue)}
               |
               |    return (${filter.jsCode})(message);
               | })();
               |""".stripMargin

        val testResult =
            try
                Right(context.eval("js", evalCode).asBoolean)
            catch {
                case err: Throwable => Left(s"JsMessageFilter error: ${err.getMessage}")
            }

        val cumulativeJsonState = context.eval("js", s"stringify(globalThis.$JsonAccumulatorVarName)").asString
        (testResult, cumulativeJsonState)
