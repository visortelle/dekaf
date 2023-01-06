package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChain
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilterChainMode.{MESSAGE_FILTER_CHAIN_MODE_ALL, MESSAGE_FILTER_CHAIN_MODE_ANY}
import com.tools.teal.pulsar.ui.api.v1.consumer.MessageFilter as MessageFilterPb
import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import io.circe.syntax.*
import io.circe.generic.auto.*

import _root_.config.readConfigAsync
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

type JsonString = String
type JsonAccumulator = JsonString // Cumulative state to produce user-defined calculations, preserved between messages.
type FilterTestResult = (Either[String, Boolean], JsonAccumulator)

val JsonAccumulatorVarName = "jsonAccumulator"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.library, os.pwd) / "js" / "dist" / "libs.js")

class MessageFilter():
    private val context = Context.newBuilder("js").build

    context.eval("js",s"globalThis.${JsonAccumulatorVarName} = {}") // Create empty fold-like accumulator variable.

    // Load JS libraries.
    context.eval("js", jsLibsBundle)
    // Make JSs libraries available in the global scope.
    context.eval("js", "Object.entries(globalThis.jsLibs).map(([k, v]) => globalThis[k] = v)")

    def test(filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
        testUsingJs(context, filterCode, jsonMessage, jsonValue)

def testUsingJs(context: Context, filterCode: String, jsonMessage: JsonMessage, jsonValue: JsonValue): FilterTestResult =
    val evalCode =
        s"""
          | (() => {
          |    const message = ${jsonMessage.asJson};
          |    message.value = ${jsonValue.getOrElse("undefined")};
          |    message.accum = globalThis.${JsonAccumulatorVarName};
          |
          |    return (${filterCode})(message);
          | })();
          |""".stripMargin

    val testResult = try {
        Right(context.eval("js", evalCode).asBoolean)
    } catch {
        case err => Left(s"Message filter JS error: ${err.getMessage}")
    }

    val cumulativeJsonState = context.eval("js", s"JSON.stringify(globalThis.${JsonAccumulatorVarName})").asString

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
        val (_, jsonAggregate) = filterResults.last
        (filterChainResult, jsonAggregate)
    else
        (filterChainResult, "{}")
