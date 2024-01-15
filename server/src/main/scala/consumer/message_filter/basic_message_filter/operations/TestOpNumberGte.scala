package consumer.message_filter.basic_message_filter.operations

import _root_.consumer.session_runner.JsLibsVarName
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class TestOpNumberGte(gte: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return new $JsLibsVarName.BigNumber(${target.resolveVarName()}).gte("${gte}");
           |})();""".stripMargin

object TestOpNumberGte:
    def fromPb(v: pb.TestOpNumberGte): TestOpNumberGte =
        TestOpNumberGte(gte = v.gte)

    def toPb(v: TestOpNumberGte): pb.TestOpNumberGte =
        pb.TestOpNumberGte(gte = v.gte)
