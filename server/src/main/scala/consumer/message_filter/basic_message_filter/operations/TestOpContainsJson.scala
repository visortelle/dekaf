package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName
import org.apache.commons.text.StringEscapeUtils
import io.circe.*
import io.circe.parser.*

case class TestOpContainsJson(containsJson: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    private val escapedJson = if isCaseInsensitive then
        StringEscapeUtils.escapeJson(containsJson).toLowerCase()
    else
        StringEscapeUtils.escapeJson(containsJson)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if(${isCaseInsensitive.toString}) {
           |        return JSON.stringify(${target.resolveVarName()}).toLowerCase().includes("$escapedJson");
           |    }
           |
           |    return JSON.stringify(${target.resolveVarName()}).includes("$escapedJson");
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
