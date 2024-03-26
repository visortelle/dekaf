package producer.message_generator.data_generators.relative_date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class FixedRelativeDateTimeGenerator(
    value: Long,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)

object FixedRelativeDateTimeGenerator:
    def fromPb(v: pb.FixedRelativeDateTimeGenerator): FixedRelativeDateTimeGenerator =
        FixedRelativeDateTimeGenerator(
            value = v.value,
            unit = DateTimeUnit.fromPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )

    def toPb(v: FixedRelativeDateTimeGenerator): pb.FixedRelativeDateTimeGenerator =
        pb.FixedRelativeDateTimeGenerator(
            value = v.value,
            unit = DateTimeUnit.toPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )
