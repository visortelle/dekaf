package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterVarTarget(
    varName: String,
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String = varName

object BasicMessageFilterVarTarget:
    def fromPb(v: pb.BasicMessageFilterVarTarget): BasicMessageFilterVarTarget =
        BasicMessageFilterVarTarget(varName = v.varName)

    def toPb(v: BasicMessageFilterVarTarget): pb.BasicMessageFilterVarTarget =
        pb.BasicMessageFilterVarTarget(varName = v.varName)
