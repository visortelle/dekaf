package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import consumer.session_runner.JsLibsVarName

case class TestOpEqualsJson(equalsJson: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return $JsLibsVarName.lodash.isEqual(
           |        ${target.resolveVarName()},
           |        $equalsJson
           |    );
           |})();""".stripMargin

object TestOpEqualsJson:
    def fromPb(v: pb.TestOpEqualsJson): TestOpEqualsJson =
        TestOpEqualsJson(equalsJson = v.equalsJson)

    def toPb(v: TestOpEqualsJson): pb.TestOpEqualsJson =
        pb.TestOpEqualsJson(equalsJson = v.equalsJson)
