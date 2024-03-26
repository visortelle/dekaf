package producer.message_generator.event_time_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class FixedEventTimeGenerator(
    eventTime: Long
)

object FixedEventTimeGenerator:
    def fromPb(v: pb.FixedEventTimeGenerator): FixedEventTimeGenerator =
        FixedEventTimeGenerator(
            eventTime = v.eventTime
        )

    def toPb(v: FixedEventTimeGenerator): pb.FixedEventTimeGenerator =
        pb.FixedEventTimeGenerator(
            eventTime = v.eventTime
        )
