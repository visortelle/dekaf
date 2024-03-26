package producer.message_generator.data_generators.string

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class StringGenerator(
    generator: FixedStringGenerator | JsonGenerator
)

object StringGenerator:
    def fromPb(v: pb.StringGenerator): StringGenerator =
        val generator = v.generator match
            case pb.StringGenerator.Generator.GeneratorFixedString(v) => FixedStringGenerator.fromPb(v)
            case pb.StringGenerator.Generator.GeneratorFromJsonString(v)        => JsonGenerator.fromPb(v)
            case _                                                    => throw new Exception("Invalid string generator type")

        StringGenerator(
            generator = generator
        )

    def toPb(v: StringGenerator): pb.StringGenerator =
        val generator = v.generator match
            case v: FixedStringGenerator => pb.StringGenerator.Generator.GeneratorFixedString(FixedStringGenerator.toPb(v))
            case v: JsonGenerator        => pb.StringGenerator.Generator.GeneratorFromJsonString(JsonGenerator.toPb(v))

        pb.StringGenerator(
            generator = generator
        )
