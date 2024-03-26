package producer.message_generator.event_time_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.date_time.DateTimeGenerator
import producer.message_generator.json_generator.JsonGenerator

case class EventTimeGenerator(
    generator: DateTimeGenerator
)

object EventTimeGenerator:
    def fromPb(v: pb.EventTimeGenerator): EventTimeGenerator =
        EventTimeGenerator(
            generator = DateTimeGenerator.fromPb(v.generator.get)
        )

    def toPb(v: EventTimeGenerator): pb.EventTimeGenerator =
        pb.EventTimeGenerator(
            generator = Some(DateTimeGenerator.toPb(v.generator))
        )
