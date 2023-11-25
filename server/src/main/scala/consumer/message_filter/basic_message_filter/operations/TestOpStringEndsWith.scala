package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import org.apache.commons.text.StringEscapeUtils
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpStringEndsWith(endsWith: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(endsWith)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if (${isCaseInsensitive.asJson}) {
           |        return ${target.resolveVarName()}.toLowerCase().endsWith("${escapedString}".toLowerCase());
           |    }
           |
           |    return ${target.resolveVarName()}.endsWith("${escapedString}");
           |})();""".stripMargin

object TestOpStringEndsWith:
    def fromPb(v: pb.TestOpStringEndsWith): TestOpStringEndsWith =
        TestOpStringEndsWith(endsWith = v.endsWith, isCaseInsensitive = v.isCaseInsensitive)

    def toPb(v: TestOpStringEndsWith): pb.TestOpStringEndsWith =
        pb.TestOpStringEndsWith(endsWith = v.endsWith, isCaseInsensitive = v.isCaseInsensitive)
