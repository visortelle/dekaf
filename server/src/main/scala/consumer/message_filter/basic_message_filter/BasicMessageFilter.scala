package consumer.message_filter.basic_message_filter

import org.graalvm.polyglot.Context
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.message_filter.basic_message_filter.operations.TestOpTrait
import consumer.session_runner.{ConsumerSessionContext, CurrentMessageVarName, JsonValue, MessageValueAsJson, TestResult}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilter(
    target: BasicMessageFilterTargetTrait,
    op: TestOpTrait
):
    def test(polyglotContext: Context): TestResult =
        val opEvalCode = op.genJsCode(target)
        val evalCode =
            s"""
               |(() => {
               |  return ${opEvalCode}
               |})();
               |""".stripMargin

        println(s"EVAL CODE")
        println(evalCode)
        
        val testResult =
            try
                val isOk = polyglotContext.eval("js", evalCode).asBoolean
                TestResult(isOk = isOk, error = None)
            catch {
                case err: Throwable =>
                    TestResult(isOk = false, error = Some(s"BasicMessageFilter error: ${err.getMessage}"))
            }

        testResult

object BasicMessageFilter:
    def fromPb(filter: pb.BasicMessageFilter): BasicMessageFilter = ???

    def toPb(filter: BasicMessageFilter): pb.BasicMessageFilter = ???
