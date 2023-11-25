package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import org.apache.commons.text.StringEscapeUtils
import io.circe.syntax.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpStringStartsWith(startsWith: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(startsWith)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if (${isCaseInsensitive.asJson}) {
           |        return ${target.resolveVarName()}.toLowerCase().startsWith("${escapedString}".toLowerCase());
           |    }
           |
           |    return ${target.resolveVarName()}.startsWith("${escapedString}");
           |})();""".stripMargin

object TestOpStringStartsWith:
    def fromPb(v: pb.TestOpStringStartsWith): TestOpStringStartsWith =
        TestOpStringStartsWith(startsWith = v.startsWith, isCaseInsensitive = v.isCaseInsensitive)

    def toPb(v: TestOpStringStartsWith): pb.TestOpStringStartsWith =
        pb.TestOpStringStartsWith(startsWith = v.startsWith, isCaseInsensitive = v.isCaseInsensitive)
