package consumer.message_filter.basic_message_filter.logic

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterBracesMode.All
import consumer.message_filter.basic_message_filter.operations.AnyTestOp
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*

case class BasicMessageFilterOp(
    isEnabled: Boolean = true,
    isNegated: Boolean = false,
    op: AnyTestOp | BasicMessageFilterBraces
):
    def genJsFnCode(target: BasicMessageFilterTargetTrait): String =
        op match
            case anyTestOp: AnyTestOp =>
                s"""(() => {
                   |    const result = ${anyTestOp.op.genJsCode(target)}
                   |    return ${if isNegated then "!result" else "result"};
                   |})""".stripMargin

            case braces: BasicMessageFilterBraces =>
                val allOpsFns = "[" + braces.ops.map(_.genJsFnCode(target)).mkString(",") + "]"
                val assignResult = braces.mode match
                    case BasicMessageFilterBracesMode.All => s"const result = ${allOpsFns}.every(fn => fn());"
                    case BasicMessageFilterBracesMode.Any => s"const result = ${allOpsFns}.some(fn => fn());"

                s"""(() => {
                   |    ${assignResult}
                   |    return ${if isNegated then "!result" else "result"};
                   |})""".stripMargin
