package producer.message_generator.data_generators.relative_date_time

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class RelativeDateTimeGenerator(
    generator: FixedRelativeDateTimeGenerator | JsonGenerator
)

object RelativeDateTimeGenerator:
    def fromPb(v: pb.RelativeDateTimeGenerator): RelativeDateTimeGenerator =
        val generator = v.generator match
            case pb.RelativeDateTimeGenerator.Generator.GeneratorFixedRelativeDateTime(v) => FixedRelativeDateTimeGenerator.fromPb(v)
            case pb.RelativeDateTimeGenerator.Generator.GeneratorFromJsonNumberMs(v)      => JsonGenerator.fromPb(v)
            case _                                                                        => throw new Exception("Unknown relative date time generator type")

        RelativeDateTimeGenerator(
            generator = generator
        )

    def toPb(v: RelativeDateTimeGenerator): pb.RelativeDateTimeGenerator =
        val generator = v.generator match
            case v: FixedRelativeDateTimeGenerator =>
                pb.RelativeDateTimeGenerator.Generator.GeneratorFixedRelativeDateTime(FixedRelativeDateTimeGenerator.toPb(v))
            case v: JsonGenerator => pb.RelativeDateTimeGenerator.Generator.GeneratorFromJsonNumberMs(JsonGenerator.toPb(v))

        pb.RelativeDateTimeGenerator(
            generator = generator
        )
