package producer.message_generator.data_generators.int64

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class Int64Generator(
    generator: Long | JsonGenerator
)

object Int64Generator:
    def fromPb(v: pb.Int64Generator): Int64Generator =
        val generator = v.generator match
            case pb.Int64Generator.Generator.GeneratorFixedInt64(v) => v
            case pb.Int64Generator.Generator.GeneratorFromJson(v) => JsonGenerator.fromPb(v)
        Int64Generator(
            generator = generator
        )

    def toPb(v: Int64Generator): pb.Int64Generator =
        val generator = v.generator match
            case v: Long => pb.Int64Generator.Generator.GeneratorFixedInt64(v)
            case v: JsonGenerator => pb.Int64Generator.Generator.GeneratorFromJson(JsonGenerator.toPb(v))

        pb.Int64Generator(
           generator = generator
        )
