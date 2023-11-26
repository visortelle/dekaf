package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpArrayAny(testItemOp: BasicMessageFilterOp) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        s"""(() => {
           |    if (!Array.isArray(${varName})) {
           |        return false;
           |    }
           |
           |    return ${varName}.some(v => {
           |        return ${testItemOp.genJsFnCode(target = BasicMessageFilterVarTarget("v"))}();
           |    });
           |})();""".stripMargin

object TestOpArrayAny:
    def fromPb(v: pb.TestOpArrayAny): TestOpArrayAny =
        TestOpArrayAny(testItemOp = BasicMessageFilterOp.fromPb(v.testItemOp.get))

    def toPb(v: TestOpArrayAny): pb.TestOpArrayAny =
        pb.TestOpArrayAny(testItemOp = Some(BasicMessageFilterOp.toPb(v.testItemOp)))
