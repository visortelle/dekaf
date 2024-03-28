package producer.message_generator.data_generators.json_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class FixedJsonGenerator(
    json: String
):
    def generate: String = json

object FixedJsonGenerator:
    def fromPb(v: pb.FixedJsonGenerator): FixedJsonGenerator =
        FixedJsonGenerator(
            json = v.json
        )

    def toPb(v: FixedJsonGenerator): pb.FixedJsonGenerator =
        pb.FixedJsonGenerator(
            json = v.json
        )
