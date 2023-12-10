package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterFieldTarget(
    jsonFieldSelector: Option[String] = None
):
    def resolveVarName(objectVarName: String): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($objectVarName, '$selector')"""
            case None =>
                s"$objectVarName"

object BasicMessageFilterFieldTarget:
    def fromPb(v: pb.BasicMessageFilterFieldTarget): BasicMessageFilterFieldTarget =
        BasicMessageFilterFieldTarget(jsonFieldSelector = v.jsonFieldSelector)

    def toPb(v: BasicMessageFilterFieldTarget): pb.BasicMessageFilterFieldTarget =
        pb.BasicMessageFilterFieldTarget(jsonFieldSelector = v.jsonFieldSelector)
