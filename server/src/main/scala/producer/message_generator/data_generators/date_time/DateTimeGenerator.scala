package producer.message_generator.data_generators.date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.json_generator.JsonGenerator

case class DateTimeGenerator(
    generator: NowDateTimeGenerator | FixedDateTimeGenerator | JsonGenerator
)

object DateTimeGenerator:
    def fromPb(v: pb.DateTimeGenerator): DateTimeGenerator =
        val generator = v.generator match
            case pb.DateTimeGenerator.Generator.GeneratorNow(v)   => NowDateTimeGenerator.fromPb(v)
            case pb.DateTimeGenerator.Generator.GeneratorFixedDateTime(v) => FixedDateTimeGenerator.fromPb(v)
            case pb.DateTimeGenerator.Generator.GeneratorFromJsonMsOrIso(v)  => JsonGenerator.fromPb(v)
            case _                                                 => throw new IllegalArgumentException("Unknown event time generator type")

        DateTimeGenerator(
            generator = generator
        )

    def toPb(v: DateTimeGenerator): pb.DateTimeGenerator =
        val generator = v.generator match
            case v: NowDateTimeGenerator   => pb.DateTimeGenerator.Generator.GeneratorNow(NowDateTimeGenerator.toPb(v))
            case v: FixedDateTimeGenerator => pb.DateTimeGenerator.Generator.GeneratorFixedDateTime(FixedDateTimeGenerator.toPb(v))
            case v: JsonGenerator           => pb.DateTimeGenerator.Generator.GeneratorFromJsonMsOrIso(JsonGenerator.toPb(v))

        pb.DateTimeGenerator(
            generator = generator
        )
