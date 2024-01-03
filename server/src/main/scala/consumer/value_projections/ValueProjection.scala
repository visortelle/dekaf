package consumer.value_projections

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget
import org.graalvm.polyglot.Context

case class ValueProjection(
    isEnabled: Boolean,
    targetField: BasicMessageFilterTarget,
    shortName: String,
    width: Option[Int]
):
    def project(polyglotContext: Context): ValueProjectionResult =
        val evalCode =
            s"""
               |(() => {
               |  const targetField = ${targetField.resolveVarName()};
               |
               |  if (targetField === undefined) {
               |    throw new Error('');
               |  }
               |
               |  return JSON.stringify(targetField);
               |})();
               |""".stripMargin

        // Don't remove the following debug lines
//        println(s"DEBUG EVAL CODE")
//        println(evalCode)

        val result =
            try
                val displayValue = polyglotContext.eval("js", evalCode).asString()
                ValueProjectionResult(displayValue = Some(displayValue))
            catch {
                case _: Throwable =>
                    ValueProjectionResult(displayValue = None)
            }

        result

object ValueProjection:
    def fromPb(v: pb.ValueProjection): ValueProjection =
        ValueProjection(
            isEnabled = v.isEnabled,
            targetField = BasicMessageFilterTarget.fromPb(v.targetField.get),
            shortName = v.shortName,
            width = v.width
        )

    def toPb(v: ValueProjection): pb.ValueProjection =
        pb.ValueProjection(
            isEnabled = v.isEnabled,
            targetField = Some(BasicMessageFilterTarget.toPb(v.targetField)),
            shortName = v.shortName,
            width = v.width
        )
