package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.{BasicMessageFilterTargetTrait, BasicMessageFilterVarTarget}

case class TestOpArrayAny(op: AnyTestOp) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""${target.resolveVarName()}.every(v => ${op.op.genJsCode(target = BasicMessageFilterVarTarget("v"))})"""
