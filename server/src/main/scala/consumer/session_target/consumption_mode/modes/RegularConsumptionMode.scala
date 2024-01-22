package consumer.session_target.consumption_mode.modes

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class RegularConsumptionMode()

object RegularConsumptionMode:
    def fromPb(v: pb.ConsumerSessionTargetConsumptionMode.Regular): RegularConsumptionMode =
        RegularConsumptionMode()

    def toPb(v: RegularConsumptionMode): pb.ConsumerSessionTargetConsumptionMode.Regular =
        pb.ConsumerSessionTargetConsumptionMode.Regular()

