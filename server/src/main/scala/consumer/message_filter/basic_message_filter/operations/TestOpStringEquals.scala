package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import org.apache.commons.text.StringEscapeUtils
import io.circe.syntax.*

case class TestOpStringEquals(equals: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(equals)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if (${isCaseInsensitive.asJson}) {
           |        return ${target.resolveVarName()}.toLowerCase() === "${escapedString}".toLowerCase();
           |    }
           |
           |    return ${target.resolveVarName()} === "${escapedString}"
           |})();
           |""".stripMargin
