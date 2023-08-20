package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
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

val JsonAccumulatorVarName = "accum"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.libraryPath.get, os.pwd) / "js" / "dist" / "libs.js")

case class MessageFilterConfig(
    stdout: java.io.ByteArrayOutputStream
)

class MessageFilter(config: MessageFilterConfig):
    private val context = Context
        .newBuilder("js")
        .out(config.stdout)
        .err(config.stdout)
        .build

    context.eval("js", s"globalThis.$JsonAccumulatorVarName = {}") // Create empty fold-like accumulator variable.

    // Load JS libraries.
    context.eval("js", jsLibsBundle)
    // Make JS libraries available in the global scope.
    context.eval("js", "Object.entries(globalThis.jsLibs).map(([k, v]) => globalThis[k] = v)")

    // Provide better console output for debugging on client side.
    context.eval(
      "js",
      """
      |globalThis._consoleLog = console.log;
      |globalThis._consoleInfo = console.info;
      |globalThis._consoleWarn = console.warn;
      |globalThis._consoleError = console.error;
      |globalThis._consoleDebug = console.debug;
      |
      |console.log = (...args) => _consoleLog('[LOG]', ...args);
      |globalThis.log = console.log;
      |
      |console.info = (...args) => _consoleInfo('[INFO]', ...args);
      |globalThis.logInfo = console.info;
      |
      |console.warn = (...args) => _consoleWarn('[WARN]', ...args);
      |globalThis.logWarn = console.warn;
      |
      |console.error = (...args) => _consoleError('[ERROR]', ...args);
      |globalThis.logError = console.error;
      |
      |console.debug = (...args) => _consoleLog('[DEBUG]', ...(args.map(arg => stringify(arg, null, 4))));
      |globalThis.logDebug = console.debug;
      """.stripMargin
    )

    def getStdout(): String =
        val logs = config.stdout.toString
        config.stdout.reset()
        logs

    def test(filterCode: String, jsonMessage: JsonMessage, jsonValue: MessageValueToJsonResult): FilterTestResult =
        testUsingJs(context, filterCode, jsonMessage, jsonValue)

    def runCode(code: String): String =
        try
            context.eval("js", s"inspect($code);").asString()
        catch {
            case err: Throwable => s"[ERROR] ${err.getMessage}"
        }

def testUsingJs(context: Context, filterCode: String, jsonMessage: JsonMessage, jsonValue: MessageValueToJsonResult): FilterTestResult =
    val evalCode =
        s"""
          | (() => {
          |    const message = ${jsonMessage.asJson};
          |    message.value = ${jsonValue.getOrElse("undefined")};
          |    message.accum = globalThis.$JsonAccumulatorVarName;
          |
          |    globalThis.lastMessage = message; // For debug on the client side.
          |
          |    return ($filterCode)(message);
          | })();
          |""".stripMargin

    val testResult =
        try
            Right(context.eval("js", evalCode).asBoolean)
        catch {
            case err => Left(s"Message filter JS error: ${err.getMessage}")
        }

    val cumulativeJsonState = context.eval("js", s"stringify(globalThis.$JsonAccumulatorVarName)").asString

    (testResult, cumulativeJsonState)

def getFilterTestResult(filter: pb.MessageFilter, messageFilter: MessageFilter, jsonMessage: JsonMessage, jsonValue: MessageValueToJsonResult): FilterTestResult =
    messageFilter.test(filter.value, jsonMessage, jsonValue)

def getFilterChainTestResult(
    filterChain: Option[pb.MessageFilterChain],
    messageFilter: MessageFilter,
    jsonMessage: JsonMessage,
    jsonValue: MessageValueToJsonResult
): FilterTestResult =
    var chain = filterChain.getOrElse(pb.MessageFilterChain(filters = Map.empty, mode = pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL))

    // Each message filters mutate global state.
    // For example: it stores the last message in the global variable `lastMessage`.
    // To make it work properly, at least one filter should always present.
    if (chain.filters.size == 0)
        chain = chain.withFilters(chain.filters + ("dummy" -> pb.MessageFilter(value = "() => true")))

    val filterResults = chain.filters.map(f => getFilterTestResult(f._2, messageFilter, jsonMessage, jsonValue))

    val maybeErr = filterResults.find(fr => fr._1.isLeft)
    val filterChainResult = maybeErr match
        case Some(Left(err), _) => Left(err)
        case _ =>
            chain.mode match
                case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ALL =>
                    Right(filterResults.forall(fr => fr._1.getOrElse(false)))
                case pb.MessageFilterChainMode.MESSAGE_FILTER_CHAIN_MODE_ANY =>
                    Right(filterResults.exists(fr => fr._1.getOrElse(false)))

    if filterResults.nonEmpty then
        val (_, jsonAggregate) = filterResults.last
        (filterChainResult, jsonAggregate)
    else (filterChainResult, "{}")
