package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChain
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilter as MessageFilterPb
import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import io.circe.syntax.*
import io.circe.generic.auto.*

type JsonString = String
type FoldLikeAccum = Either[String, JsonString] // Cumulative state to produce user-defined calculations, preserved between messages.
type FilterTestResult = (Either[String, Boolean], FoldLikeAccum)

val FoldLikeAccumVarNameJs = "acc"

class MessageFilter():
    val context = Context.newBuilder("js").build

    context.eval("js",s"globalThis.${FoldLikeAccumVarNameJs} = {}") // Create empty fold-like accumulator variable.

    def test(filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
        testUsingJs(context, filterCode, jsonMessage, jsonValue)

def testUsingJs(context: Context, filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    val evalCode =
        s"""
          | (() => {
          |    const val = ${jsonValue.getOrElse("undefined")};
          |    const msg = ${jsonMessage.asJson};
          |
          |    return (${filterCode})(val, msg, globalThis.${FoldLikeAccumVarNameJs});
          | })();
          |""".stripMargin

    val testResult = try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(s"Message filter JS error: ${err.getMessage}")
    }

    val cumulativeJsonState = try {
        Right(context.eval("js", s"JSON.stringify(globalThis.${FoldLikeAccumVarNameJs})").asString)
    } catch {
        case err => Left(s"Unable to serialize cumulative JSON state ${err.getMessage}")
    }

    (testResult, cumulativeJsonState)

def getFilterTestResult(filter: MessageFilterPb, messageFilter: MessageFilter, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    messageFilter.test(filter.value, jsonMessage, jsonValue)

def getFilterChainTestResult(filterChain: Option[MessageFilterChain], messageFilter: MessageFilter, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    val chain = filterChain.getOrElse(MessageFilterChain(filters = Map.empty, mode = MESSAGE_FILTER_CHAIN_MODE_ALL))

    val filterResults = chain.filters.map(f => getFilterTestResult(f._2, messageFilter, jsonMessage, jsonValue))

    val maybeErr = filterResults.find(fr => fr._1.isLeft)
    val filterChainResult = maybeErr match
        case Some(Left(err), _) => Left(err)
        case _ =>
            chain.mode match
                case MESSAGE_FILTER_CHAIN_MODE_ALL => Right(filterResults.forall(fr => fr._1.getOrElse(false)))
                case MESSAGE_FILTER_CHAIN_MODE_ANY => Right(filterResults.exists(fr => fr._1.getOrElse(false)))

    if filterResults.nonEmpty then
        val (_, foldLikeAccum) = filterResults.last
        (filterChainResult, foldLikeAccum)
    else
        (filterChainResult, Right("{}"))
