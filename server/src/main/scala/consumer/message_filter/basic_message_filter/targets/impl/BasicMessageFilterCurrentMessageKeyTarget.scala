package consumer.message_filter.basic_message_filter.targets.impl

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class BasicMessageFilterCurrentMessageKeyTarget(
    jsonFieldSelector: Option[String]
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.key, "$selector")"""
            case None =>
                s"$CurrentMessageVarName.key"

object BasicMessageFilterCurrentMessageKeyTarget:
    def fromPb(v: pb.BasicMessageFilterCurrentMessageKeyTarget): BasicMessageFilterCurrentMessageKeyTarget =
        BasicMessageFilterCurrentMessageKeyTarget(jsonFieldSelector = v.jsonFieldSelector)

    def toPb(v: BasicMessageFilterCurrentMessageKeyTarget): pb.BasicMessageFilterCurrentMessageKeyTarget =
        pb.BasicMessageFilterCurrentMessageKeyTarget(jsonFieldSelector = v.jsonFieldSelector)
