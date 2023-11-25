package consumer.message_filter.basic_message_filter.logic

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
                   |
                   |    if (${isNegated.asJson}) {
                   |        return !result;
                   |    }
                   |
                   |    return result;
                   |})
                   |""".stripMargin

            case braces: BasicMessageFilterBraces =>
                val allOpsFns = "[" + braces.ops.map(_.genJsFnCode).mkString(",") + "]"
                s"""(() => {
                   |    let result;
                   |
                   |    const opsCount = ${braces.ops.size.asJson}
                   |
                   |    if (${(braces.mode == BasicMessageFilterBracesMode.All).asJson}) {
                   |        result = ${allOpsFns}.every(fn => fn());
                   |    } else if (${(braces.mode == BasicMessageFilterBracesMode.All).asJson}) {
                   |        result = ${allOpsFns}.some(fn => fn());
                   |    }
                   |
                   |    if (${isNegated.asJson}) {
                   |        return !result;
                   |    }
                   |
                   |    return result;
                   |})
                   |""".stripMargin
