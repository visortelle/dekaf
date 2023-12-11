package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*

case class TestOpBoolIsFalse() extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return ${target.resolveVarName()} === false;
           |})();""".stripMargin

object TestOpBoolIsFalse:
    def fromPb(v: pb.TestOpBoolIsFalse): TestOpBoolIsFalse = TestOpBoolIsFalse()
    def toPb(v: TestOpBoolIsFalse): pb.TestOpBoolIsFalse = pb.TestOpBoolIsFalse()
