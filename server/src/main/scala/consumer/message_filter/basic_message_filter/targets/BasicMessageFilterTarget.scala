package consumer.message_filter.basic_message_filter.targets

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilterTarget(
    target: BasicMessageFilterTargetTrait
)

object BasicMessageFilterTarget:
    def fromPb(v: pb.BasicMessageFilterTarget): BasicMessageFilterTarget =
        v.target match
            case pb.BasicMessageFilterTarget.Target.TargetKey(target) =>
                BasicMessageFilterTarget(
                    target = BasicMessageFilterKeyTarget.fromPb(target)
                )
            case pb.BasicMessageFilterTarget.Target.TargetValue(target) =>
                BasicMessageFilterTarget(
                    target = BasicMessageFilterValueTarget.fromPb(target)
                )
            case _ => throw new Exception("Failed to convert BasicMessageFilterTarget. Unknown type")

    def toPb(v: BasicMessageFilterTarget): pb.BasicMessageFilterTarget =
        v.target match
            case target: BasicMessageFilterKeyTarget =>
                pb.BasicMessageFilterTarget(
                    target = pb.BasicMessageFilterTarget.Target.TargetKey(BasicMessageFilterKeyTarget.toPb(target))
                )
            case target: BasicMessageFilterValueTarget =>
                pb.BasicMessageFilterTarget(
                    target = pb.BasicMessageFilterTarget.Target.TargetValue(BasicMessageFilterValueTarget.toPb(target))
                )
