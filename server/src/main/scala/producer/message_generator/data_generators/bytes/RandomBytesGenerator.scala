package producer.message_generator.data_generators.bytes

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import scala.util.Random

case class RandomBytesGenerator(
    minBytes: Int,
    maxBytes: Int
):
    def generate: Array[Byte] =
        val bytes = new Array[Byte](minBytes + Random.nextInt(maxBytes - minBytes))
        Random.nextBytes(bytes)
        bytes

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
