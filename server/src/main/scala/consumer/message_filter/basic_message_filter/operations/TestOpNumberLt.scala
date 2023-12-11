package consumer.message_filter.basic_message_filter.operations

import _root_.consumer.session_runner.JsLibsVarName
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class TestOpNumberLt(lt: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return new $JsLibsVarName.BigNumber(${target.resolveVarName()}).lt("${lt}");
           |})();""".stripMargin

object TestOpNumberLt:
    def fromPb(v: pb.TestOpNumberLt): TestOpNumberLt =
        TestOpNumberLt(lt = v.lt)

    def toPb(v: TestOpNumberLt): pb.TestOpNumberLt =
        pb.TestOpNumberLt(lt = v.lt)
