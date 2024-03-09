package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName

case class TestOpMatchesJson(matchesJson: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return $JsLibsVarName.lodash.isMatch(
           |        ${target.resolveVarName()},
           |        $matchesJson
           |    );
           |})();""".stripMargin

object TestOpMatchesJson:
    def fromPb(v: pb.TestOpMatchesJson): TestOpMatchesJson =
        TestOpMatchesJson(matchesJson = v.matchesJson)

    def toPb(v: TestOpMatchesJson): pb.TestOpMatchesJson =
        pb.TestOpMatchesJson(matchesJson = v.matchesJson)
