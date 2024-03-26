package producer.message_generator.data_generators

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class RandomBytesGenerator(
    minBytes: Int,
    maxBytes: Int
)

object RandomBytesGenerator:
    def fromPb(v: pb.RandomBytesGenerator): RandomBytesGenerator =
        RandomBytesGenerator(
            minBytes = v.minBytes,
            maxBytes = v.maxBytes
        )

    def toPb(v: RandomBytesGenerator): pb.RandomBytesGenerator =
        pb.RandomBytesGenerator(
            minBytes = v.minBytes,
            maxBytes = v.maxBytes
        )
