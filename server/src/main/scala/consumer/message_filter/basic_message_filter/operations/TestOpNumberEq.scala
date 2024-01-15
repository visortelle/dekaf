package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait
import _root_.consumer.session_runner.JsLibsVarName

case class TestOpNumberEq(eq: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return new $JsLibsVarName.BigNumber(${target.resolveVarName()}).eq("${eq}");
           |})();""".stripMargin

object TestOpNumberEq:
    def fromPb(v: pb.TestOpNumberEq): TestOpNumberEq =
        TestOpNumberEq(eq = v.eq)

    def toPb(v: TestOpNumberEq): pb.TestOpNumberEq =
        pb.TestOpNumberEq(eq = v.eq)
