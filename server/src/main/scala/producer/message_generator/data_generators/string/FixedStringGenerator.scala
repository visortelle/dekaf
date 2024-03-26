package producer.message_generator.data_generators.string

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class FixedStringGenerator(
    string: String
)

object FixedStringGenerator:
    def fromPb(v: pb.FixedStringGenerator): FixedStringGenerator =
        FixedStringGenerator(
            string = v.string
        )

    def toPb(v: FixedStringGenerator): pb.FixedStringGenerator =
        pb.FixedStringGenerator(
            string = v.string
        )
