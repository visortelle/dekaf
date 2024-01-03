package consumer.session_runner

import _root_.config.readConfigAsync
import _root_.consumer.message_filter.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.BasicMessageFilter
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import io.circe.generic.auto.*
import org.graalvm.polyglot.Context
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Callable
import org.graalvm.polyglot.Value

import scala.util.{Failure, Success, Try}
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

type JsonStateValue = JsonValue // Cumulative state to produce user-defined calculations, preserved between messages.
val VarPrefix = "__dekaf_"
val JsonStateVarName = s"globalThis.${VarPrefix}state"
val JsLibsVarName = s"globalThis.${VarPrefix}libs"
val CurrentMessageVarName = s"globalThis.${VarPrefix}currentMessage"
val CodeCacheVarName = s"globalThis.${VarPrefix}codeCache"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.dataDir.get, os.pwd) / "js" / "dist" / "libs.js")

case class ConsumerSessionContextConfig(
    stdout: java.io.PrintStream | java.io.ByteArrayOutputStream
)

class ConsumerSessionContext(config: ConsumerSessionContextConfig):
    val context: Context = Context
        .newBuilder("js")
        .out(config.stdout)
        .err(config.stdout)
        .build

//    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
//    executor.submit(new Callable[Unit] {
//        override def call(): Unit = {
//            context.enter()
//        }
//    }).get()

    eval(s"$CodeCacheVarName = {}")
    eval(s"$JsonStateVarName = {}") // Create empty fold-like accumulator variable.

    // Load JS libraries.
    eval(jsLibsBundle)
    // Make JS libraries available in the global scope.
    eval(s"Object.entries(${JsLibsVarName}).map(([k, v]) => globalThis[k] = v)")

    // Provide better console output for debugging on client side.
    eval(s"""
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

//    def eval(code: String): Value = {
//        executor.submit(new Callable[Value] {
//            override def call(): Value = {
//                context.eval("js", code)
//            }
//        }).get()
//    }

    def eval(code: String): Value =
        println(code)
        context.eval("js", code)

    def getStdout: String =
        val logs = config.stdout.toString
        config.stdout match
            case v: java.io.ByteArrayOutputStream => v.reset()
            case v: java.io.OutputStream => v.flush() // For debug in test only
        logs

    def setCurrentMessage(messageAsJsonOmittingValue: MessageAsJsonOmittingValue, messageValueAsJson: MessageValueAsJson) =
        val jsCode =
            s"""
               |(() => {
               |  const message = $messageAsJsonOmittingValue;
               |  message.value = ${messageValueAsJson.getOrElse("undefined")};
               |  message.state = $JsonStateVarName;
               |  $CurrentMessageVarName = message;
               |})()
               |""".stripMargin
        eval(jsCode);

    def testMessageFilter(filter: MessageFilter): TestResult =
        val result = filter.test(this)

        if filter.isNegated then result.isOk = !result.isOk
        result

    def runCode(code: String): String =
        try
            eval(s"inspect($code);").asString()
        catch {
            case err: Throwable => s"[ERROR] ${err.getMessage}"
        }

    def getState: JsonStateValue =
        Try(eval(s"stringify($JsonStateVarName)").asString) match
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
