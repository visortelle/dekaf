package consumer.session_target.consumption_mode

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.session_target.consumption_mode.modes.{ReadCompactedConsumptionMode, RegularConsumptionMode}

case class ConsumerSessionTargetConsumptionMode(
    mode: RegularConsumptionMode | ReadCompactedConsumptionMode
)

object ConsumerSessionTargetConsumptionMode:
    def fromPb(v: pb.ConsumerSessionTargetConsumptionMode): ConsumerSessionTargetConsumptionMode =
        val mode = v.mode match
            case pb.ConsumerSessionTargetConsumptionMode.Mode.ModeRegular(v) =>
                RegularConsumptionMode.fromPb(v)
            case pb.ConsumerSessionTargetConsumptionMode.Mode.ModeReadCompacted(v) =>
                ReadCompactedConsumptionMode.fromPb(v)

        ConsumerSessionTargetConsumptionMode(mode = mode)

    def toPb(v: ConsumerSessionTargetConsumptionMode): pb.ConsumerSessionTargetConsumptionMode =
        val modePb = v.mode match
            case v: RegularConsumptionMode =>
                pb.ConsumerSessionTargetConsumptionMode.Mode.ModeRegular(RegularConsumptionMode.toPb(v))
            case v: ReadCompactedConsumptionMode =>
                pb.ConsumerSessionTargetConsumptionMode.Mode.ModeReadCompacted(ReadCompactedConsumptionMode.toPb(v))

        pb.ConsumerSessionTargetConsumptionMode(mode = modePb)
