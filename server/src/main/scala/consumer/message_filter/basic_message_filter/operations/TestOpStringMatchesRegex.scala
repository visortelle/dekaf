package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import org.apache.commons.text.StringEscapeUtils
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

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

object TestOpStringMatchesRegex:
    def fromPb(v: pb.TestOpStringMatchesRegex): TestOpStringMatchesRegex =
        TestOpStringMatchesRegex(pattern = v.pattern, flags = v.flags)

    def toPb(v: TestOpStringMatchesRegex): pb.TestOpStringMatchesRegex =
        pb.TestOpStringMatchesRegex(pattern = v.pattern, flags = v.flags)
