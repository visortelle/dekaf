package consumer.message_filter.basic_message_filter.operations

import _root_.consumer.session_runner.JsLibsVarName
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class TestOpNumberLte(lte: String) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    return new $JsLibsVarName.BigNumber(${target.resolveVarName()}).lte("${lte}");
           |})();""".stripMargin

object TestOpNumberLte:
    def fromPb(v: pb.TestOpNumberLte): TestOpNumberLte =
        TestOpNumberLte(lte = v.lte)

    def toPb(v: TestOpNumberLte): pb.TestOpNumberLte =
        pb.TestOpNumberLte(lte = v.lte)
