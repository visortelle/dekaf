package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName
import org.apache.commons.text.StringEscapeUtils

case class TestOpContainsJson(containsJson: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedJson = StringEscapeUtils.escapeJson(containsJson)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if(${isCaseInsensitive.toString}) {
           |        return ${target.resolveVarName()}.toLowerCase()
           |            .includes("$escapedJson".toLowerCase());
           |    }
           |    
           |    return ${target.resolveVarName()}.includes("$escapedJson");
           |})();""".stripMargin

object TestOpContainsJson:
    def fromPb(v: pb.TestOpContainsJson): TestOpContainsJson =
        TestOpContainsJson(
            containsJson = v.containsJson,
            isCaseInsensitive = v.isCaseInsensitive
        )

    def toPb(v: TestOpContainsJson): pb.TestOpContainsJson =
        pb.TestOpContainsJson(
            containsJson = v.containsJson,
            isCaseInsensitive = v.isCaseInsensitive
        )
