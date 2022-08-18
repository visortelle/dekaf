package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChain
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterLanguage.{MESSAGE_FILTER_LANGUAGE_JS, MESSAGE_FILTER_LANGUAGE_PYTHON}
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilter as MessageFilterPb
import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import io.circe.syntax.*
import io.circe.generic.auto.*

type JsonString = String
type FoldLikeAccum = Either[String, JsonString] // Cumulative state to produce user-defined calculations, preserved between messages.
type FilterTestResult = (Either[String, Boolean], FoldLikeAccum)
type FilterLanguage = "js" | "python"

class MessageFilter():
    val context = Context.newBuilder("js", "python").build

    context.eval("js","globalThis.s = {}") // Create empty "state" variable.

    def test(lang: FilterLanguage, filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
        lang match
            case "js" => testUsingJs(context, filterCode, jsonMessage, jsonValue)
            case "python" => ???

def testUsingJs(context: Context, filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    val evalCode =
        s"""
          | (() => {
          |    const v = ${jsonValue.getOrElse("undefined")};
          |    const msg = ${jsonMessage.asJson};
          |
          |    return (${filterCode})(v, msg);
          | })();
          |""".stripMargin

    val testResult = try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(s"Message filter JS error: ${err.getMessage}")
    }

    val cumulativeJsonState = try {
        Right(context.eval("js", "JSON.stringify(globalThis.s)").asString)
    } catch {
        case err => Left(s"Unable to serialize cumulative JSON state ${err.getMessage}")
    }

    (testResult, cumulativeJsonState)

def getFilterTestResult(filter: MessageFilterPb, messageFilter: MessageFilter, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    val lang: FilterLanguage = filter.language match
        case MESSAGE_FILTER_LANGUAGE_JS     => "js"
        case MESSAGE_FILTER_LANGUAGE_PYTHON => "python"
        case _                              => "js"

    messageFilter.test(lang, filter.value, jsonMessage, jsonValue)

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

    val (_, lastCumulativeJsonState) = filterResults.last
    (filterChainResult, lastCumulativeJsonState)
