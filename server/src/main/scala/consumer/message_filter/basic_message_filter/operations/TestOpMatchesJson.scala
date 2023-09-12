package consumer.message_filter.basic_message_filter.operations
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName
import org.apache.commons.text.StringEscapeUtils

case class TestOpMatchesJson(matchesJson: String) extends TestOpTrait:
    private val escapedJson = StringEscapeUtils.escapeJson(matchesJson)

    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return $JsLibsVarName.lodash.isEqual(
           |        JSON.parse(${target.resolveVarName()}),
           |        JSON.parse('$escapedJson')
           |    );
           |})();""".stripMargin

object TestOpMatchesJson:
    def fromPb(v: pb.TestOpMatchesJson): TestOpMatchesJson =
        TestOpMatchesJson(matchesJson = v.matchesJson)

    def toPb(v: TestOpMatchesJson): pb.TestOpMatchesJson =
        pb.TestOpMatchesJson(matchesJson = v.matchesJson)
