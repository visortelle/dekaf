package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterFieldTarget, BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpArrayAll(
    itemFieldTarget: Option[BasicMessageFilterFieldTarget] = None,
    testItemOp: BasicMessageFilterOp
) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        val fieldVarCode = itemFieldTarget match
            case Some(fieldTarget) => s"""const f = ${fieldTarget.resolveVarName("v")};"""
            case None => "const f = v"

        s"""(() => {
           |    if (!Array.isArray($varName)) {
           |        return false;
           |    }
           |
           |    return $varName.every(v => {
           |        ${fieldVarCode}
           |        return ${testItemOp.genJsFnCode(target = BasicMessageFilterVarTarget("f"))}();
           |    });
           |    })();""".stripMargin

object TestOpArrayAll:
    def fromPb(v: pb.TestOpArrayAll): TestOpArrayAll =
        TestOpArrayAll(
            itemFieldTarget = v.itemFieldTarget.map(BasicMessageFilterFieldTarget.fromPb),
            testItemOp = BasicMessageFilterOp.fromPb(v.testItemOp.get)
        )

    def toPb(v: TestOpArrayAll): pb.TestOpArrayAll =
        pb.TestOpArrayAll(
            itemFieldTarget = v.itemFieldTarget.map(BasicMessageFilterFieldTarget.toPb),
            testItemOp = Some(BasicMessageFilterOp.toPb(v.testItemOp))
        )
