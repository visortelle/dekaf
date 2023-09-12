package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterValueTarget

case class BasicMessageFilterValueTarget(
    jsonFieldSelector: Option[String] = None,
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.value, '$selector')"""
            case None =>
                s"$CurrentMessageVarName.value"

object BasicMessageFilterValueTarget:
    def fromPb(v: pb.BasicMessageFilterValueTarget): BasicMessageFilterValueTarget =
        BasicMessageFilterValueTarget(jsonFieldSelector = v.jsonFieldSelector)

    def toPb(v: BasicMessageFilterValueTarget): pb.BasicMessageFilterValueTarget =
        pb.BasicMessageFilterValueTarget(jsonFieldSelector = v.jsonFieldSelector)
