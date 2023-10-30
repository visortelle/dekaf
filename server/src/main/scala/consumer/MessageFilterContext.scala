package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.typesafe.scalalogging.Logger
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.proxy.*
import io.circe.syntax.*
import io.circe.generic.auto.*

import consumer.filters.MessageFilter
import consumer.filters.basicFilter.BasicMessageFilter.testBasicFilter
import consumer.filters.basicFilter.{BasicMessageFilter, BasicMessageFilterSelector}
import consumer.filters.jsFilter.JsMessageFilter
import consumer.filters.jsFilter.JsMessageFilter.testJsFilter
import org.apache.pulsar.common.schema.SchemaType

import _root_.config.readConfigAsync
import scala.concurrent.Await
import scala.concurrent.duration.{Duration, SECONDS}

type JsonString = String
type JsonAccumulator = JsonString // Cumulative state to produce user-defined calculations, preserved between messages.
type JsCode = String
type FilterTestErrorMessage = String
type FilterTestResult = (Either[FilterTestErrorMessage, Boolean], JsonAccumulator)

val JsonAccumulatorVarName = "accum"

val config = Await.result(readConfigAsync, Duration(10, SECONDS))
val jsLibsBundle = os.read(os.Path.expandUser(config.dataDir.get, os.pwd) / "js" / "dist" / "libs.js")

case class MessageFilterContextConfig(
    stdout: java.io.ByteArrayOutputStream
)

class MessageFilterContext(config: MessageFilterContextConfig):
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

    def test(
        filter: MessageFilter,
        jsonMessage: JsonMessage,
        jsonValue: MessageValueToJsonResult,
        schemaType: SchemaType
    ): FilterTestResult =
        val result = filter.value match
            case basicFilter: BasicMessageFilter => testBasicFilter(context, basicFilter, jsonMessage, jsonValue, schemaType)
            case jsFilter: JsMessageFilter => testJsFilter(context, jsFilter, jsonMessage, jsonValue)

        (
            result._1.fold(
                err => Left(err),
                bool => Right(if filter.isNegated then !bool else bool)
            ),
            result._2
        )

    def runCode(code: JsCode): String =
        try
            context.eval("js", s"inspect($code);").asString()
        catch {
            case err: Throwable => s"[ERROR] ${err.getMessage}"
        }

object MessageFilterContext:
    def setupFilterContextCode(jsonMessage: JsonMessage, jsonValue: MessageValueToJsonResult): JsCode =
        s"""
           | const message = ${jsonMessage.asJson};
           | message.value = ${jsonValue.getOrElse("undefined")};
           | message.accum = globalThis.$JsonAccumulatorVarName;
           |
           | ${setupAccessObjectFieldFunction}
           | ${setupNumericalStringComparisonFunctions}
           |
           | globalThis.lastMessage = message; // For debug on the client side.
           |""".stripMargin

    def setupFieldValueCode(maybeSelector: Option[BasicMessageFilterSelector]): JsCode =
        maybeSelector match
            case Some(BasicMessageFilterSelector.FieldSelector(fieldSelector)) =>
                s"""const fieldValue = accessObjectField(message.value, "${fieldSelector}");"""
            case _ =>
                s"""const fieldValue = message.value;"""


    private def setupNumericalStringComparisonFunctions: JsCode =
        s"""
           |const numericalStringEquals = (a, b) => {
           |    const numA = parseFloat(a);
           |    const numB = parseFloat(b);
           |
           |    if (isNaN(numA) || isNaN(numB)) {
           |        return undefined;
           |    }
           |
           |    return Math.abs(numA - numB) < 1e-12;
           |};
           |
           |const numericalStringGreaterThan = (a, b) => {
           |    const numA = parseFloat(a);
           |    const numB = parseFloat(b);
           |
           |    if (isNaN(numA) || isNaN(numB)) {
           |        return undefined;
           |    }
           |
           |  return numA > numB;
           |};
           |
           |const numericalStringGreaterThanOrEqual = (a, b) => {
           |    const numA = parseFloat(a);
           |    const numB = parseFloat(b);
           |
           |    if (isNaN(numA) || isNaN(numB)) {
           |        return undefined;
           |    }
           |
           |    return numA > numB || Math.abs(numA - numB) < 1e-12;
           |};
           |
           |const numericalStringLessThan = (a, b) => {
           |    const numA = parseFloat(a);
           |    const numB = parseFloat(b);
           |
           |    if (isNaN(numA) || isNaN(numB)) {
           |        return undefined;
           |    }
           |
           |    return numA < numB;
           |};
           |
           |const numericalStringLessThanOrEqual = (a, b) => {
           |    const numA = parseFloat(a);
           |    const numB = parseFloat(b);
           |
           |    if (isNaN(numA) || isNaN(numB)) {
           |        return undefined;
           |    }
           |
           |    return numA < numB || Math.abs(numA - numB) < 1e-12;
           |};
           |  """.stripMargin

    private def setupAccessObjectFieldFunction: JsCode =
        val arrayElementRegex = "/^(\\d+)\\]$/"

        s"""const accessObjectField = (obj, fieldSelector)  => {
           |    try {
           |      if (!fieldSelector) return undefined;
           |      if (!obj) return undefined;
           |
           |      const keys = fieldSelector.startsWith('.') ? fieldSelector.slice(1).split('.') : fieldSelector.split('.');
           |
           |      let currentObj = obj;
           |      for (let i = 0; i < keys.length; i++) {
           |        const key = keys[i];
           |
           |        if (!currentObj) return undefined;
           |
           |        if (key.includes('[') && key.includes(']')) {
           |          const parts = key.split('[');
           |          if (parts.length !== 2) return undefined;
           |
           |          const arrayKey = parts[0];
           |          const indexMatch = parts[1].match(${arrayElementRegex});
           |          if (!indexMatch) return undefined;
           |
           |          const index = parseInt(indexMatch[1]);
           |
           |          currentObj = currentObj[arrayKey] ? currentObj[arrayKey][index] : undefined;
           |        } else {
           |          currentObj = currentObj[key];
           |        }
           |      }
           |
           |      return currentObj;
           |    } catch (e) {
           |      return undefined;
           |    }
           |  }
           |  """.stripMargin
