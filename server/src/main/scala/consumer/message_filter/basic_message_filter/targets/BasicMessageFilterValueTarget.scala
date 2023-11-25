package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}

case class BasicMessageFilterValueTarget(
    jsonFieldSelector: Option[String]
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.value, '$selector')"""
            case None =>
                s"$CurrentMessageVarName.value"
