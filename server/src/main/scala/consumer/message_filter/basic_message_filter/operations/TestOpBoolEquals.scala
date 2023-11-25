package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import io.circe.syntax.*
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpBoolEquals(equals: Boolean) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return ${target.resolveVarName()} === ${equals.asJson};
           |})();""".stripMargin

object TestOpBoolEquals:
    def fromPb(v: pb.TestOpBoolEquals): TestOpBoolEquals =
        TestOpBoolEquals(equals = v._equals)

    def toPb(v: TestOpBoolEquals): pb.TestOpBoolEquals =
        pb.TestOpBoolEquals(_equals = v.equals)
