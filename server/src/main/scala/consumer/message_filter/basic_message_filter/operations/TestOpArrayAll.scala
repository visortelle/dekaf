package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.logic.BasicMessageFilterOp
import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget}

case class TestOpArrayAll(op: BasicMessageFilterOp) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        s"""(() => {
           |    if (!Array.isArray(${varName})) {
           |        return false;
           |    }
           |
           |    return ${varName}.every(v => {
           |        return ${op.genJsFnCode(target = BasicMessageFilterVarTarget("v"))}();
           |    });
           |    })();""".stripMargin
