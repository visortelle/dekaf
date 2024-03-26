package producer.message_generator.data_generators.bytes

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.string.StringGenerator

case class BytesFromHexGenerator(
    generator: StringGenerator
)

object BytesFromHexGenerator:
    def fromPb(v: pb.BytesFromHexGenerator): BytesFromHexGenerator =
        BytesFromHexGenerator(
            generator = StringGenerator.fromPb(v.generator.get)
        )

    def toPb(v: BytesFromHexGenerator): pb.BytesFromHexGenerator =
        pb.BytesFromHexGenerator(
            generator = Some(StringGenerator.toPb(v.generator))
        )
