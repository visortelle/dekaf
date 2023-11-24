package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}

case class BasicMessageFilterVarTarget(
    varName: String
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String = varName