package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}

case class BasicMessageFilterKeyTarget(
    jsonFieldSelector: Option[String]
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        jsonFieldSelector match
            case Some(selector) =>
                s"""$JsLibsVarName.lodash.get($CurrentMessageVarName.key, "$selector")"""
            case None =>
                s"$CurrentMessageVarName.key"
