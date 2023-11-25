package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import org.apache.commons.text.StringEscapeUtils

case class TestOpStringIncludes(includes: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(includes)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if (${isCaseInsensitive.asJson}) {
           |        return ${target.resolveVarName()}.toLowerCase().includes("${escapedString}".toLowerCase());
           |    }
           |
           |    return ${target.resolveVarName()}.includes("${escapedString}");
           |})()
           |""".stripMargin
