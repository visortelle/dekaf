package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName
import org.apache.commons.text.StringEscapeUtils

case class TestOpContainsJSON(containsJson: String) extends TestOpTrait:
    private val escapedJson = StringEscapeUtils.escapeJson(containsJson)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return $JsLibsVarName.lodash.isMatch(
           |        JSON.parse(${target.resolveVarName()}),
           |        JSON.parse('$escapedJson')
           |    );
           |})();""".stripMargin

object TestOpContainsJSON:
    def fromPb(v: pb.TestOpContainsJSON): TestOpContainsJSON =
        TestOpContainsJSON(containsJson = v.containsJson)

    def toPb(v: TestOpContainsJSON): pb.TestOpContainsJSON =
        pb.TestOpContainsJSON(containsJson = v.containsJson)
