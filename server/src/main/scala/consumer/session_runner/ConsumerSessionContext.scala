package consumer.session_runner

import _root_.config.readConfigAsync
import _root_.consumer.message_filter.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.BasicMessageFilter
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import io.circe.generic.auto.*
import org.graalvm.polyglot.{Context, Engine, Value}

import scala.util.{Failure, Success, Try}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

type JsonStateValue = JsonValue // Cumulative state to produce user-defined calculations, preserved between messages.
val VarPrefix = "__dekaf_"
val JsonStateVarName = s"globalThis.${VarPrefix}state"
val JsLibsVarName = s"globalThis.libs"
val CurrentMessageVarName = s"globalThis.${VarPrefix}currentMessage"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.dataDir.get, os.pwd) / "js" / "dist" / "libs.js")

case class ConsumerSessionContextConfig(
    stdout: java.io.PrintStream | java.io.ByteArrayOutputStream,
    engine: Engine
)

class ConsumerSessionContext(config: ConsumerSessionContextConfig):
    val context: Context = Context
        .newBuilder("js")
        .engine(config.engine)
        .out(config.stdout)
        .err(config.stdout)
        .build

    context.eval("js", s"$JsonStateVarName = {}") // Create empty fold-like accumulator variable.

    // Load JS libraries.
    context.eval("js", jsLibsBundle)
    // Make JS libraries available in the global scope.
    context.eval("js", s"Object.entries(${JsLibsVarName}).map(([k, v]) => globalThis[k] = v)")

    // Provide better console output for debugging on client side.
    context.eval(
        "js",
        s"""
      |globalThis.${VarPrefix}consoleLog = console.log;
      |globalThis.${VarPrefix}consoleInfo = console.info;
      |globalThis.${VarPrefix}consoleWarn = console.warn;
      |globalThis.${VarPrefix}consoleError = console.error;
      |globalThis.${VarPrefix}consoleDebug = console.debug;
      |
      |console.log = (...args) => ${VarPrefix}consoleLog('[LOG]', ...args);
      |console.info = (...args) => ${VarPrefix}consoleInfo('[INFO]', ...args);
      |console.warn = (...args) => ${VarPrefix}consoleWarn('[WARN]', ...args);
      |console.error = (...args) => ${VarPrefix}consoleError('[ERROR]', ...args);
      |console.debug = (...args) => ${VarPrefix}consoleLog('[DEBUG]', ...(args.map(arg => stringify(arg, null, 4))));
      """.stripMargin
    )

    def getStdout: String =
        val logs = config.stdout.toString
        config.stdout match
            case v: java.io.ByteArrayOutputStream => v.reset()
            case v: java.io.OutputStream => v.flush() // For debug in test only
        logs

    private val setCurrentMessageJsFnCode =
        s"""
           |((messageAsJsonOmittingValue, messageValueAsJson) => {
           |  const message = JSON.parse(messageAsJsonOmittingValue);
           |  message.value = JSON.parse(messageValueAsJson);
           |  message.state = $JsonStateVarName;
           |  $CurrentMessageVarName = message;
           |})
           |""".stripMargin
    private val setCurrentMessageJsFn: Value = context.eval("js", setCurrentMessageJsFnCode)

    def setCurrentMessage(messageAsJsonOmittingValue: MessageAsJsonOmittingValue, messageValueAsJson: MessageValueAsJson) =
        setCurrentMessageJsFn.executeVoid(messageAsJsonOmittingValue, messageValueAsJson.getOrElse("undefined"))

    def testMessageFilter(filter: MessageFilter): TestResult =
        val result = filter.test(context)

        if filter.isNegated then result.isOk = !result.isOk
        result

    def runCode(code: String): String =
        try
            context.eval("js", s"inspect($code);").asString()
        catch {
            case err: Throwable => s"[ERROR] ${err.getMessage}"
        }

    def getState: JsonStateValue =
        Try(context.eval("js", s"stringify($JsonStateVarName)").asString) match
            case Failure(_) => "{}"
            case Success(v) => v

    def testMessageFilterChain(filterChain: MessageFilterChain): ChainTestResult =
        if !filterChain.isEnabled then
            return ChainTestResult(isOk = true, results = Vector.empty)

        val filterResults = filterChain.filters
            .filter(_.isEnabled)
            .map(testMessageFilter)

        var isOk = filterChain.mode match {
            case MessageFilterChainMode.All => filterResults.forall(fr => fr.isOk)
            case MessageFilterChainMode.Any => filterResults.exists(fr => fr.isOk)
        }
        if filterChain.isNegated then isOk = !isOk

        ChainTestResult(isOk = isOk, results = filterResults)
