package consumer.value_projections

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import org.graalvm.polyglot.Context

case class ValueProjection(
    targetField: BasicMessageFilterTarget,
    shortName: String,
    width: Option[Int]
):
    def project(polyglotContext: Context): ValueProjectionResult =
        val evalCode =
            s"""
               |(() => {
               |  return JSON.stringify(${targetField.resolveVarName()})
               |})();
               |""".stripMargin

        // Don't remove the following debug lines
        //        println(s"DEBUG EVAL CODE")
        //        println(evalCode)

        val testResult =
            try
                val displayValue = polyglotContext.eval("js", evalCode).asString()
                ValueProjectionResult(displayValue = Some(displayValue))
            catch {
                case _: Throwable =>
                    ValueProjectionResult(displayValue = None)
            }

        testResult

object ValueProjection:
    def fromPb(v: pb.ValueProjection): ValueProjection =
        ValueProjection(
            targetField = BasicMessageFilterTarget.fromPb(v.targetField.get),
            shortName = v.shortName,
            width = v.width
        )

    def toPb(v: ValueProjection): pb.ValueProjection =
        pb.ValueProjection(
            targetField = Some(BasicMessageFilterTarget.toPb(v.targetField)),
            shortName = v.shortName,
            width = v.width
        )
