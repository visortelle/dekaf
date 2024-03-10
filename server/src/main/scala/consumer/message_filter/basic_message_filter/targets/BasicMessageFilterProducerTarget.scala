package consumer.message_filter.basic_message_filter.targets

import _root_.consumer.session_runner.{CurrentMessageVarName, JsLibsVarName}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterProducerTarget(
) extends BasicMessageFilterTargetTrait:
    override def resolveVarName(): String =
        s"$CurrentMessageVarName.producerName"

object BasicMessageFilterProducerTarget:
    def fromPb(v: pb.BasicMessageFilterProducerTarget): BasicMessageFilterProducerTarget =
        BasicMessageFilterProducerTarget()

    def toPb(v: BasicMessageFilterProducerTarget): pb.BasicMessageFilterProducerTarget =
        pb.BasicMessageFilterProducerTarget()
