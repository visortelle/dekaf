package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class RelativeDateTime(
    value: Int,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)

object RelativeDateTime {
    def fromPb(v: pb.RelativeDateTime): RelativeDateTime =
        RelativeDateTime(
            value = v.value,
            unit = DateTimeUnit.fromPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )

    def toPb(v: RelativeDateTime): pb.RelativeDateTime =
        pb.RelativeDateTime(
            value = v.value,
            unit = DateTimeUnit.toPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )
}
