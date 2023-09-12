package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class BasicMessageFilterVarTarget(
    varName: String,
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String = varName