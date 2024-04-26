package producer.message_generator.sequence_id_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.int64.Int64Generator

case class SequenceIdGenerator(
    generator: Int64Generator
)

object SequenceIdGenerator:
    def fromPb(v: pb.SequenceIdGenerator): SequenceIdGenerator =
        SequenceIdGenerator(
            generator = Int64Generator.fromPb(v.generator.get)
        )

    def toPb(v: SequenceIdGenerator): pb.SequenceIdGenerator =
        pb.SequenceIdGenerator(
           generator = Some(Int64Generator.toPb(v.generator))
        )
