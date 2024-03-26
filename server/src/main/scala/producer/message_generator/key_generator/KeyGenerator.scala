package producer.message_generator.key_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.{FixedStringGenerator, RandomUuidV4Generator}
import producer.message_generator.json_generator.JsonGenerator

case class KeyGenerator(
    generator: RandomUuidV4Generator | FixedStringGenerator | JsonGenerator
)

object KeyGenerator:
    def fromPb(v: pb.KeyGenerator): KeyGenerator =
        val generator = v.generator match
            case pb.KeyGenerator.Generator.GeneratorRandomUuidV4(v) => RandomUuidV4Generator.fromPb(v)
            case pb.KeyGenerator.Generator.GeneratorFixedString(v) => FixedStringGenerator.fromPb(v)
            case pb.KeyGenerator.Generator.GeneratorJson(v) => JsonGenerator.fromPb(v)
            case _ => throw new Exception("Unknown key generator type")

        KeyGenerator(
            generator = generator
        )

    def toPb(v: KeyGenerator): pb.KeyGenerator =
        val generator = v.generator match
            case v: RandomUuidV4Generator => pb.KeyGenerator.Generator.GeneratorRandomUuidV4(RandomUuidV4Generator.toPb(v))
            case v: FixedStringGenerator => pb.KeyGenerator.Generator.GeneratorFixedString(FixedStringGenerator.toPb(v))
            case v: JsonGenerator => pb.KeyGenerator.Generator.GeneratorJson(JsonGenerator.toPb(v))

        pb.KeyGenerator(
            generator = generator
        )
