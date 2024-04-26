package producer.message_generator.deliver_at_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.date_time.DateTimeGenerator

case class DeliverAtGenerator(
    generator: DateTimeGenerator
)

object DeliverAtGenerator:
    def fromPb(v: pb.DeliverAtGenerator): DeliverAtGenerator =
        DeliverAtGenerator(
            generator = DateTimeGenerator.fromPb(v.generator.get)
        )

    def toPb(v: DeliverAtGenerator): pb.DeliverAtGenerator =
        pb.DeliverAtGenerator(
            generator = Some(DateTimeGenerator.toPb(v.generator))
        )
