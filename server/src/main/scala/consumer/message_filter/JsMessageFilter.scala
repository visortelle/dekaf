package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import consumer.session_runner.{ConsumerSessionContext, TestResult}
import org.graalvm.polyglot.Context

case class JsMessageFilter(jsCode: String):
    def test(context: ConsumerSessionContext, targetField: BasicMessageFilterTarget): TestResult =
        val evalCode =
            s"""
               |(() => {
               |  const targetField = ${targetField.resolveVarName()}
               |  return (${jsCode})(targetField);
               |})();
               |""".stripMargin

        // Don't remove the following debug lines
//        println(s"DEBUG EVAL CODE")
//        println(evalCode)

        val testResult =
            try
                val isOk = context.eval(evalCode).asBoolean
                TestResult(isOk = isOk, error = None)
            catch {
                case err: Throwable =>
                    TestResult(isOk = false, error = Some(s"JsMessageFilter error: ${err.getMessage}"))
            }

        testResult


object JsMessageFilter:
    def fromPb(v: pb.JsMessageFilter): JsMessageFilter =
        JsMessageFilter(jsCode = v.jsCode)

    def toPb(v: JsMessageFilter): pb.JsMessageFilter =
        pb.JsMessageFilter(jsCode = v.jsCode)
