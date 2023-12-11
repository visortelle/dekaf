package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget, BasicMessageFilterFieldTarget}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpArrayAny(itemFieldTarget: Option[BasicMessageFilterFieldTarget] = None, testItemOp: BasicMessageFilterOp) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        val fieldVarCode = itemFieldTarget match
            case Some(fieldTarget) => s"""const f = ${fieldTarget.resolveVarName("v")};"""
            case None => "const f = v"

        s"""(() => {
           |    if (!Array.isArray(${varName})) {
           |        return false;
           |    }
           |
           |    return ${varName}.some(v => {
           |        ${fieldVarCode}
           |        return ${testItemOp.genJsFnCode(target = BasicMessageFilterVarTarget("f"))}();
           |    });
           |    })();""".stripMargin

object TestOpArrayAny:
    def fromPb(v: pb.TestOpArrayAny): TestOpArrayAny =
        TestOpArrayAny(
            itemFieldTarget = v.itemFieldTarget.map(BasicMessageFilterFieldTarget.fromPb),
            testItemOp = BasicMessageFilterOp.fromPb(v.testItemOp.get)
        )

    def toPb(v: TestOpArrayAny): pb.TestOpArrayAny =
        pb.TestOpArrayAny(
            itemFieldTarget = v.itemFieldTarget.map(BasicMessageFilterFieldTarget.toPb),
            testItemOp = Some(BasicMessageFilterOp.toPb(v.testItemOp))
        )
