package consumer.session_target.consumption_mode.modes

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ReadCompactedConsumptionMode()

object ReadCompactedConsumptionMode:
    def fromPb(v: pb.ConsumerSessionTargetConsumptionMode.ReadCompacted): ReadCompactedConsumptionMode =
        ReadCompactedConsumptionMode()

    def toPb(v: ReadCompactedConsumptionMode): pb.ConsumerSessionTargetConsumptionMode.ReadCompacted =
        pb.ConsumerSessionTargetConsumptionMode.ReadCompacted()

