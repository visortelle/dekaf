package producer.message_generator.value_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.RandomBytesGenerator
import producer.message_generator.json_generator.JsonGenerator

case class ValueGenerator(
    generator: RandomBytesGenerator | JsonGenerator | ValueFromTopicSchemaGenerator
)

object ValueGenerator:
    def fromPb(v: pb.ValueGenerator): ValueGenerator =
        val generator = v.generator match
            case pb.ValueGenerator.Generator.GeneratorRandomBytes(v)          => RandomBytesGenerator.fromPb(v)
            case pb.ValueGenerator.Generator.GeneratorJson(v)                 => JsonGenerator.fromPb(v)
            case pb.ValueGenerator.Generator.GeneratorValueFromTopicSchema(v) => ValueFromTopicSchemaGenerator.fromPb(v)
            case _                                                            => throw new Exception("Unknown value generator type")

        ValueGenerator(
            generator = generator
        )

    def toPb(v: ValueGenerator): pb.ValueGenerator =
        val generator = v.generator match
            case v: RandomBytesGenerator          => pb.ValueGenerator.Generator.GeneratorRandomBytes(RandomBytesGenerator.toPb(v))
            case v: JsonGenerator                 => pb.ValueGenerator.Generator.GeneratorJson(JsonGenerator.toPb(v))
            case v: ValueFromTopicSchemaGenerator => pb.ValueGenerator.Generator.GeneratorValueFromTopicSchema(ValueFromTopicSchemaGenerator.toPb(v))
        pb.ValueGenerator(
            generator = generator
        )
