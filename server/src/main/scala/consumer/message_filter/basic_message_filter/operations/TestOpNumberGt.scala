package consumer.message_filter.basic_message_filter.operations

import _root_.consumer.session_runner.JsLibsVarName
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class TestOpNumberGt(gt: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return new $JsLibsVarName.BigNumber(${target.resolveVarName()}).gt("${gt}");
           |})();""".stripMargin

object TestOpNumberGt:
    def fromPb(v: pb.TestOpNumberGt): TestOpNumberGt =
        TestOpNumberGt(gt = v.gt)

    def toPb(v: TestOpNumberGt): pb.TestOpNumberGt =
        pb.TestOpNumberGt(gt = v.gt)
