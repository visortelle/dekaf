package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import org.apache.commons.text.StringEscapeUtils
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpStringIncludes(includes: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedString = StringEscapeUtils.escapeJson(includes)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if (${isCaseInsensitive.asJson}) {
           |        return ${target.resolveVarName()}.toLowerCase().includes("${escapedString}".toLowerCase());
           |    }
           |
           |    return ${target.resolveVarName()}.includes("${escapedString}");
           |})();""".stripMargin

object TestOpStringIncludes:
    def fromPb(v: pb.TestOpStringIncludes): TestOpStringIncludes =
        TestOpStringIncludes(includes = v.includes, isCaseInsensitive = v.isCaseInsensitive)

    def toPb(v: TestOpStringIncludes): pb.TestOpStringIncludes =
        pb.TestOpStringIncludes(includes = v.includes, isCaseInsensitive = v.isCaseInsensitive)
