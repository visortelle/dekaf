package consumer.message_filter.basic_message_filter

import org.graalvm.polyglot.Context
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTarget, BasicMessageFilterTargetTrait}
import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.operations.TestOpTrait
import consumer.session_runner.{ConsumerSessionContext, CurrentMessageVarName, JsonValue, MessageValueAsJson, TestResult}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilter(
    target: BasicMessageFilterTarget,
    op: BasicMessageFilterOp
):
    def test(polyglotContext: Context): TestResult =
        val opEvalCode = op.genJsFnCode(target.target) + "()"
        val evalCode =
            s"""
               |(() => {
               |  return ${opEvalCode}
               |})();
               |""".stripMargin

//        Don't remove the following lines until the basic filters feature isn't ready
//        println(s"DEBUG EVAL CODE")
//        println(evalCode)

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
    def fromPb(filter: pb.BasicMessageFilter): BasicMessageFilter =
        BasicMessageFilter(
            target = BasicMessageFilterTarget.fromPb(filter.target.get),
            op = BasicMessageFilterOp.fromPb(filter.op.get)
        )

    def toPb(filter: BasicMessageFilter): pb.BasicMessageFilter =
        pb.BasicMessageFilter(
            target = Some(BasicMessageFilterTarget.toPb(filter.target)),
            op = Some(BasicMessageFilterOp.toPb(filter.op))
        )
