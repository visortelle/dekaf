package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpIsNull() extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        s"""(() => {
               |    return $varName === null;
               |})();""".stripMargin

object TestOpIsNull:
    def fromPb(v: pb.TestOpIsNull): TestOpIsNull =
        TestOpIsNull()

    def toPb(v: TestOpIsNull): pb.TestOpIsNull =
        pb.TestOpIsNull()
