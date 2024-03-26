package producer.message_generator.key_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.RandomUuidV4Generator
import producer.message_generator.data_generators.string.StringGenerator
import producer.message_generator.json_generator.JsonGenerator

case class KeyGenerator(
    generator: RandomUuidV4Generator | StringGenerator | JsonGenerator
)

object KeyGenerator:
    def fromPb(v: pb.KeyGenerator): KeyGenerator =
        val generator = v.generator match
            case pb.KeyGenerator.Generator.GeneratorRandomUuidV4(v) => RandomUuidV4Generator.fromPb(v)
            case pb.KeyGenerator.Generator.GeneratorString(v) => StringGenerator.fromPb(v)
            case pb.KeyGenerator.Generator.GeneratorFromJson(v) => JsonGenerator.fromPb(v)
            case _ => throw new Exception("Unknown key generator type")

        KeyGenerator(
            generator = generator
        )

    def toPb(v: KeyGenerator): pb.KeyGenerator =
        val generator = v.generator match
            case v: RandomUuidV4Generator => pb.KeyGenerator.Generator.GeneratorRandomUuidV4(RandomUuidV4Generator.toPb(v))
            case v: StringGenerator => pb.KeyGenerator.Generator.GeneratorString(StringGenerator.toPb(v))
            case v: JsonGenerator => pb.KeyGenerator.Generator.GeneratorFromJson(JsonGenerator.toPb(v))

        pb.KeyGenerator(
            generator = generator
        )
