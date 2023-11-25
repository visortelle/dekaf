package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import org.apache.commons.text.StringEscapeUtils

case class TestOpStringMatchesRegex(
    pattern: String,
    flags: String = ""
) extends TestOpTrait:
    private val escapedPattern = StringEscapeUtils.escapeJson(pattern)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    const re = new RegExp("${escapedPattern}", "${flags}");
           |    return re.test(${target.resolveVarName()});
           |})();""".stripMargin
