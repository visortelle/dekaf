package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpBoolIsTrue() extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return ${target.resolveVarName()} === true;
           |})();""".stripMargin

object TestOpBoolIsTrue:
    def fromPb(v: pb.TestOpBoolIsTrue): TestOpBoolIsTrue = TestOpBoolIsTrue()
    def toPb(v: TestOpBoolIsTrue): pb.TestOpBoolIsTrue = pb.TestOpBoolIsTrue()
