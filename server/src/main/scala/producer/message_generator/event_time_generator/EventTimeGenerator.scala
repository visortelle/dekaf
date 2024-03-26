package producer.message_generator.event_time_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class EventTimeGenerator(
    generator: NowEventTimeGenerator | FixedEventTimeGenerator | JsonGenerator
)

object EventTimeGenerator:
    def fromPb(v: pb.EventTimeGenerator): EventTimeGenerator =
        val generator = v.generator match
            case pb.EventTimeGenerator.Generator.GeneratorNow(v)   => NowEventTimeGenerator.fromPb(v)
            case pb.EventTimeGenerator.Generator.GeneratorFixed(v) => FixedEventTimeGenerator.fromPb(v)
            case pb.EventTimeGenerator.Generator.GeneratorJson(v)  => JsonGenerator.fromPb(v)
            case _                                                 => throw new IllegalArgumentException("Unknown event time generator type")

        EventTimeGenerator(
            generator = generator
        )

    def toPb(v: EventTimeGenerator): pb.EventTimeGenerator =
        val generator = v.generator match
            case v: NowEventTimeGenerator   => pb.EventTimeGenerator.Generator.GeneratorNow(NowEventTimeGenerator.toPb(v))
            case v: FixedEventTimeGenerator => pb.EventTimeGenerator.Generator.GeneratorFixed(FixedEventTimeGenerator.toPb(v))
            case v: JsonGenerator           => pb.EventTimeGenerator.Generator.GeneratorJson(JsonGenerator.toPb(v))

        pb.EventTimeGenerator(
            generator = generator
        )
