package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import org.apache.commons.text.StringEscapeUtils

case class TestOpStringEquals(equals: String) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(equals)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return ${target.resolveVarName()} === "${escapedString}"
           |})()
           |""".stripMargin
