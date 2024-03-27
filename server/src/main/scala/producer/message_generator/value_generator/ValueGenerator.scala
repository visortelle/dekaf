package producer.message_generator.value_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.bytes.BytesGenerator
import producer.message_generator.data_generators.json_generator.JsonGenerator

case class ValueGenerator(
    generator: BytesGenerator | JsonGenerator | ValueFromTopicSchemaGenerator
)

object ValueGenerator:
    def fromPb(v: pb.ValueGenerator): ValueGenerator =
        val generator = v.generator match
            case pb.ValueGenerator.Generator.GeneratorFromBytes(v)            => BytesGenerator.fromPb(v)
            case pb.ValueGenerator.Generator.GeneratorFromJson(v)             => JsonGenerator.fromPb(v)
            case pb.ValueGenerator.Generator.GeneratorValueFromTopicSchema(v) => ValueFromTopicSchemaGenerator.fromPb(v)
            case _                                                            => throw new Exception("Unknown value generator type")

        ValueGenerator(
            generator = generator
        )

    def toPb(v: ValueGenerator): pb.ValueGenerator =
        val generator = v.generator match
            case v: BytesGenerator                => pb.ValueGenerator.Generator.GeneratorFromBytes(BytesGenerator.toPb(v))
            case v: JsonGenerator                 => pb.ValueGenerator.Generator.GeneratorFromJson(JsonGenerator.toPb(v))
            case v: ValueFromTopicSchemaGenerator => pb.ValueGenerator.Generator.GeneratorValueFromTopicSchema(ValueFromTopicSchemaGenerator.toPb(v))

        pb.ValueGenerator(
            generator = generator
        )
