package consumer.message_filter.basic_message_filter.logic

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterBracesMode.All
import consumer.message_filter.basic_message_filter.operations.AnyTestOp
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

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
                    case BasicMessageFilterBracesMode.All => s"const result = $allOpsFns.every(fn => fn());"
                    case BasicMessageFilterBracesMode.Any => s"const result = $allOpsFns.some(fn => fn());"

                s"""(() => {
                   |    $assignResult
                   |    return ${if isNegated then "!result" else "result"};
                   |})""".stripMargin

object BasicMessageFilterOp:
    def fromPb(v: pb.BasicMessageFilterOp): BasicMessageFilterOp =
        BasicMessageFilterOp(
            isEnabled = v.isEnabled,
            isNegated = v.isNegated,
            op = v.op match
                case pb.BasicMessageFilterOp.Op.OpAnyTestOp(op) =>
                    AnyTestOp.fromPb(op)
                case pb.BasicMessageFilterOp.Op.OpBraces(op) =>
                    BasicMessageFilterBraces.fromPb(op)
                case _ => throw new Exception("Unknown BasicMessageFilterOp type")
        )

    def toPb(v: BasicMessageFilterOp): pb.BasicMessageFilterOp =
        pb.BasicMessageFilterOp(
            isEnabled = v.isEnabled,
            isNegated = v.isNegated,
            op = v.op match
                case op: AnyTestOp =>
                    pb.BasicMessageFilterOp.Op.OpAnyTestOp(AnyTestOp.toPb(op))
                case op: BasicMessageFilterBraces =>
                    pb.BasicMessageFilterOp.Op.OpBraces(BasicMessageFilterBraces.toPb(op))
        )
