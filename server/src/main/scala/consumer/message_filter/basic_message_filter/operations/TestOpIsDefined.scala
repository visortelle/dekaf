package consumer.message_filter.basic_message_filter.operations

import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TestOpIsDefined() extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        val varName = target.resolveVarName()
        s"""(() => {
               |    return typeof $varName !== 'undefined';
               |})();""".stripMargin

object TestOpIsDefined:
    def fromPb(v: pb.TestOpIsDefined): TestOpIsDefined =
        TestOpIsDefined()
        
    def toPb(v: TestOpIsDefined): pb.TestOpIsDefined =
        pb.TestOpIsDefined()