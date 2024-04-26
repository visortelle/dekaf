package producer.message_generator.deliver_after_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.relative_date_time.RelativeDateTimeGenerator

case class DeliverAfterGenerator(
    generator: RelativeDateTimeGenerator
)

object DeliverAfterGenerator:
    def fromPb(v: pb.DeliverAfterGenerator): DeliverAfterGenerator =
        DeliverAfterGenerator(
            generator = RelativeDateTimeGenerator.fromPb(v.generator.get)
        )

    def toPb(v: DeliverAfterGenerator): pb.DeliverAfterGenerator =
        pb.DeliverAfterGenerator(
            generator = Some(RelativeDateTimeGenerator.toPb(v.generator))
        )
