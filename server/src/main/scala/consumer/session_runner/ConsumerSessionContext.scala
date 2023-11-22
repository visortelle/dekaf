package consumer.session_runner

import _root_.config.readConfigAsync
import _root_.consumer.message_filter.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.typesafe.scalalogging.Logger
import io.circe.generic.auto.*
import io.circe.syntax.*
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import scala.util.{Try, Success, Failure}

import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

type JsonString = String

type JsonStateValue = JsonString // Cumulative state to produce user-defined calculations, preserved between messages.
val JsonStateVarName = "state"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.dataDir.get, os.pwd) / "js" / "dist" / "libs.js")

case class ConsumerSessionContextConfig(
    stdout: java.io.ByteArrayOutputStream
)

class ConsumerSessionContext(config: ConsumerSessionContextConfig):
    private val context = Context
        .newBuilder("js")
        .out(config.stdout)
        .err(config.stdout)
        .build

    context.eval("js", s"globalThis.$JsonStateVarName = {}") // Create empty fold-like accumulator variable.

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

    def testMessageFilter(filter: MessageFilter, jsonMessage: MessageJson, jsonValue: MessageValueToJsonResult): TestResult =
        val result = filter.value match
            case f: BasicMessageFilter => testBasicMessageFilter(f, jsonMessage, jsonValue)
            case f: JsMessageFilter    => testJsMessageFilter(f, jsonMessage, jsonValue)


        if filter.isNegated then result.isOk = !result.isOk
        result

    def runCode(code: String): String =
        try
            context.eval("js", s"inspect($code);").asString()
        catch {
            case err: Throwable => s"[ERROR] ${err.getMessage}"
        }

    def testBasicMessageFilter(filter: BasicMessageFilter, jsonMessage: MessageJson, jsonValue: MessageValueToJsonResult): TestResult = ???

    def testJsMessageFilter(filter: JsMessageFilter, jsonMessage: MessageJson, jsonValue: MessageValueToJsonResult): TestResult =
        val evalCode =
            s"""
              | (() => {
              |    const message = ${jsonMessage.asJson};
              |    message.value = ${jsonValue.getOrElse("undefined")};
              |    message.accum = globalThis.$JsonStateVarName;
              |
              |    globalThis.lastMessage = message; // For debug on the client side.
              |
              |    return (${filter.jsCode})(message);
              | })();
              |""".stripMargin

        val testResult =
            try
                val isOk = context.eval("js", evalCode).asBoolean
                TestResult(isOk = isOk, error = None)
            catch {
                case err => TestResult(isOk = false, error = Some(s"JsMessageFilter error: ${err.getMessage}"))
            }

        testResult

    def getState(): Either[String, JsonStateValue] =
        Try(context.eval("js", s"stringify(globalThis.$JsonStateVarName)").asString) match
            case Failure(err) => Left(err.getMessage)
            case Success(v) => Right(v)

    def testMessageFilterChain(
        filterChain: MessageFilterChain,
        jsonMessage: MessageJson,
        jsonValue: MessageValueToJsonResult
    ): ChainTestResult =
        var chain = filterChain

        // Each message filters mutate global state.
        // For example: it stores the last message in the global variable `lastMessage`.
        // To make it work properly, at least one filter should always present.
        if (chain.filters.isEmpty || !chain.isEnabled)
            chain = MessageFilterChain(
                isEnabled = true,
                isNegated = false,
                mode = MessageFilterChainMode.All,
                filters = Vector(
                    MessageFilter(
                        isEnabled = true,
                        isNegated = false,
                        value = JsMessageFilter(jsCode = "() => true")
                    )
                )
            )

        val filterResults = chain.filters
            .filter(_.isEnabled)
            .map(f => testMessageFilter(f, jsonMessage, jsonValue))

        var isOk = chain.mode match {
            case MessageFilterChainMode.All => filterResults.forall(fr => fr.isOk)
            case MessageFilterChainMode.Any => filterResults.exists(fr => fr.isOk)
        }
        if chain.isNegated then isOk = !isOk

        ChainTestResult(isOk = isOk, results = filterResults)
