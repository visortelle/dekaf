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
val JsLibsVarName = s"globalThis.libs"
val CurrentMessageVarName = s"globalThis.${VarPrefix}currentMessage"
val JsonStateVarName = s"globalThis.${VarPrefix}state"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.dataDir.get, os.pwd) / "js" / "dist" / "libs.js")

case class ConsumerSessionContextConfig(
    stdout: java.io.PrintStream | java.io.ByteArrayOutputStream,
    engine: Engine
)

class ConsumerSessionContext(config: ConsumerSessionContextConfig):
    /** Nobody enters this context without holding this.
      *
      * A GraalVM context may MIGRATE between threads but may NOT be entered by two at once - the
      * loser gets "Multi threaded access requested by thread ... but is not allowed for
      * language(s) js". A consumer session hands this ONE context to every partition of every
      * target, and Pulsar delivers each partition on its own listener thread, so they collide.
      *
      * It guards more than that exception, and the more that it guards is the harder half:
      * `setCurrentMessage` writes the message under test into a GLOBAL JS variable, and the filter
      * chain, the coloring rules and the value projections all read it back out afterwards - each
      * one a SEPARATE entry into the context, with a gap in between. `getStdout` likewise drains
      * and RESETS a buffer shared by all of them. Held for the whole of one message those hand-offs
      * cannot cross; held per JS call they still could, and that outcome throws nothing at all - it
      * just judges one message by another message's contents.
      *
      * Reentrant, so a lease may nest inside a lease without deadlocking.
      */
    private val lock = new java.util.concurrent.locks.ReentrantLock()

    /** Run `use` with this context entered by nobody else. Prefer leasing through
      * `ConsumerSessionContextPool.withNextContext`, which keeps the choice of context and the
      * exclusion over it together. */
    def exclusively[A](use: => A): A =
        lock.lock()
        try use
        finally lock.unlock()

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

    // The expression inspector documents `lastMessage` as the latest message seen by the
    // session. Keep the implementation's private current-message slot as the source of truth for
    // filters and projections, and expose a read-only live view so the two names cannot drift.
    // Before the first message the getter deliberately yields `undefined`.
    context.eval(
        "js",
        s"""
      |Object.defineProperty(globalThis, 'lastMessage', {
      |  configurable: false,
      |  enumerable: true,
      |  get: () => $CurrentMessageVarName
      |});
      """.stripMargin
    )

    /** Release the JS context this session held.
      *
      * `close(true)` rather than `close()`: the plain form REFUSES while any thread is inside the
      * context, and a session is stopped from a gRPC thread while its listener threads may still be
      * mid-message. The cancelling form is the only one that can be relied on to actually free it.
      *
      * Nothing closed this at all, so every consumer session ever created leaked a Graal context
      * (and, through the pool, an engine) for the life of the process.
      */
    def close(): Unit = context.close(true)

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
