package producer.message_generator.data_generators.date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class NowDateTimeGenerator()

object NowDateTimeGenerator:
    def fromPb(v: pb.NowDateTimeGenerator): NowDateTimeGenerator =
        NowDateTimeGenerator()

    def toPb(v: NowDateTimeGenerator): pb.NowDateTimeGenerator =
        pb.NowDateTimeGenerator()
