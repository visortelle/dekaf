package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpArrayAll(testItemOp: BasicMessageFilterOp) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        s"""(() => {
           |    if (!Array.isArray(${varName})) {
           |        return false;
           |    }
           |
           |    return ${varName}.every(v => {
           |        return ${testItemOp.genJsFnCode(target = BasicMessageFilterVarTarget("v"))}();
           |    });
           |    })();""".stripMargin

object TestOpArrayAll:
    def fromPb(v: pb.TestOpArrayAll): TestOpArrayAll =
        TestOpArrayAll(testItemOp = BasicMessageFilterOp.fromPb(v.testItemOp.get))

    def toPb(v: TestOpArrayAll): pb.TestOpArrayAll =
        pb.TestOpArrayAll(testItemOp = Some(BasicMessageFilterOp.toPb(v.testItemOp)))
