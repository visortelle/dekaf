package consumer.message_filter.basic_message_filter.targets.impl

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.impl.BasicMessageFilterArrayFieldTarget

case class BasicMessageFilterArrayFieldTarget(
    jsonFieldSelector: Option[String] = None
):
    def resolveVarName(objectVarName: String): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($objectVarName, '$selector')"""
            case None =>
                s"$objectVarName"

object BasicMessageFilterArrayFieldTarget:
    def fromPb(v: pb.BasicMessageFilterFieldTarget): BasicMessageFilterArrayFieldTarget =
        BasicMessageFilterArrayFieldTarget(jsonFieldSelector = v.jsonFieldSelector)

    def toPb(v: BasicMessageFilterArrayFieldTarget): pb.BasicMessageFilterFieldTarget =
        pb.BasicMessageFilterFieldTarget(jsonFieldSelector = v.jsonFieldSelector)
