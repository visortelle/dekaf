package producer.message_generator.data_generators.date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.json_generator.JsonGenerator

case class FixedDateTimeGenerator(
    unixEpochMillis: Long
)

object FixedDateTimeGenerator:
    def fromPb(v: pb.FixedDateTimeGenerator): FixedDateTimeGenerator =
        FixedDateTimeGenerator(
            unixEpochMillis = v.unixEpochMillis
        )

    def toPb(v: FixedDateTimeGenerator): pb.FixedDateTimeGenerator =
        pb.FixedDateTimeGenerator(
            unixEpochMillis = v.unixEpochMillis
        )
