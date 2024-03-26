package producer.message_generator.event_time_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class NowEventTimeGenerator()

object NowEventTimeGenerator:
    def fromPb(v: pb.NowEventTimeGenerator): NowEventTimeGenerator =
        NowEventTimeGenerator()

    def toPb(v: NowEventTimeGenerator): pb.NowEventTimeGenerator =
        pb.NowEventTimeGenerator()
