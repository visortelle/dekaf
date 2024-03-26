package producer.message_generator.ordering_key_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.bytes.BytesGenerator

case class OrderingKeyGenerator(
    fromBytes: BytesGenerator
)

object OrderingKeyGenerator:
    def fromPb(v: pb.OrderingKeyGenerator): OrderingKeyGenerator =
        OrderingKeyGenerator(
            fromBytes = BytesGenerator.fromPb(v.fromBytes.get)
        )

    def toPb(v: OrderingKeyGenerator): pb.OrderingKeyGenerator =
        pb.OrderingKeyGenerator(
            fromBytes = Some(BytesGenerator.toPb(v.fromBytes))
        )
