package consumer.message_filter.basic_message_filter.targets.impl

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class BasicMessageFilterCurrentMessageValueTarget(
    jsonFieldSelector: Option[String] = None,
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.value, '$selector')"""
            case None =>
                s"$CurrentMessageVarName.value"

object BasicMessageFilterCurrentMessageValueTarget:
    def fromPb(v: pb.BasicMessageFilterCurrentMessageValueTarget): BasicMessageFilterCurrentMessageValueTarget =
        BasicMessageFilterCurrentMessageValueTarget(jsonFieldSelector = v.jsonFieldSelector)

    def toPb(v: BasicMessageFilterCurrentMessageValueTarget): pb.BasicMessageFilterCurrentMessageValueTarget =
        pb.BasicMessageFilterCurrentMessageValueTarget(jsonFieldSelector = v.jsonFieldSelector)
