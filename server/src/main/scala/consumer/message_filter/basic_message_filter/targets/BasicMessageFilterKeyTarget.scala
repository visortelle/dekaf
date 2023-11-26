package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterKeyTarget(
    jsonFieldSelector: Option[String]
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.key, "$selector")"""
            case None =>
                s"$CurrentMessageVarName.key"

object BasicMessageFilterKeyTarget:
    def fromPb(v: pb.BasicMessageFilterKeyTarget): BasicMessageFilterKeyTarget =
        BasicMessageFilterKeyTarget(jsonFieldSelector = v.jsonFieldSelector)
        
    def toPb(v: BasicMessageFilterKeyTarget): pb.BasicMessageFilterKeyTarget =
        pb.BasicMessageFilterKeyTarget(jsonFieldSelector = v.jsonFieldSelector)
