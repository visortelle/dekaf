package producer.message_generator.data_generators.bytes

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.string.StringGenerator

case class BytesFromBase64Generator(
    generator: StringGenerator
)

object BytesFromBase64Generator:
    def fromPb(v: pb.BytesFromBase64Generator): BytesFromBase64Generator =
        BytesFromBase64Generator(
            generator = StringGenerator.fromPb(v.generator.get)
        )

    def toPb(v: BytesFromBase64Generator): pb.BytesFromBase64Generator =
        pb.BytesFromBase64Generator(
            generator = Some(StringGenerator.toPb(v.generator))
        )
