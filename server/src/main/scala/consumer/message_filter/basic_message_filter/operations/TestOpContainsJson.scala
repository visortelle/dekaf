package consumer.message_filter.basic_message_filter.operations

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTargetTrait

case class TestOpContainsJson(containsJson: String, isCaseInsensitive: Boolean = false) extends TestOpTrait:
    override def genJsCode(target: BasicMessageFilterTargetTrait): String =
        s"""(() => {
           |    if(${isCaseInsensitive.toString}) {
           |        return JSON.stringify(${target.resolveVarName()}).toLowerCase().includes("$containsJson".toLowerCase());
           |    }
           |
           |    return JSON.stringify(${target.resolveVarName()}).includes("$containsJson");
           |})();""".stripMargin

object TestOpContainsJson:
    def fromPb(v: pb.TestOpContainsJson): TestOpContainsJson =
        TestOpContainsJson(
            containsJson = v.containsJson,
            isCaseInsensitive = v.isCaseInsensitive
        )

    def toPb(v: TestOpContainsJson): pb.TestOpContainsJson =
        pb.TestOpContainsJson(
            containsJson = v.containsJson,
            isCaseInsensitive = v.isCaseInsensitive
        )
