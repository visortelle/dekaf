package producer.message_generator.data_generators

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class FixedStringGenerator()

object FixedStringGenerator:
    def fromPb(v: pb.FixedStringGenerator): FixedStringGenerator =
        FixedStringGenerator()

    def toPb(v: FixedStringGenerator): pb.FixedStringGenerator =
        pb.FixedStringGenerator()
