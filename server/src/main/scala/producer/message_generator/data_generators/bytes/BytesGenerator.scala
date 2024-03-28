package producer.message_generator.data_generators.bytes

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.graalvm.polyglot.Context

case class BytesGenerator(
    generator: RandomBytesGenerator | BytesFromBase64Generator | BytesFromHexGenerator
):
    def generate(polyglotContext: Context): Array[Byte] = generator match
        case v: RandomBytesGenerator =>
            v.generate
        case v: BytesFromBase64Generator =>
            v.generate(polyglotContext)
        case v: BytesFromHexGenerator =>
            v.generate(polyglotContext)

object BytesGenerator:
    def fromPb(v: pb.BytesGenerator): BytesGenerator =
        val generator = v.generator match
            case pb.BytesGenerator.Generator.GeneratorRandomBytes(v) =>
                RandomBytesGenerator.fromPb(v)
            case pb.BytesGenerator.Generator.GeneratorFromBase64(v) =>
                BytesFromBase64Generator.fromPb(v)
            case pb.BytesGenerator.Generator.GeneratorFromHex(v) =>
                BytesFromHexGenerator.fromPb(v)

        BytesGenerator(
            generator = generator
        )

    def toPb(v: BytesGenerator): pb.BytesGenerator =
        val generator = v.generator match
            case v: RandomBytesGenerator =>
                pb.BytesGenerator.Generator.GeneratorRandomBytes(RandomBytesGenerator.toPb(v))
            case v: BytesFromBase64Generator =>
                pb.BytesGenerator.Generator.GeneratorFromBase64(BytesFromBase64Generator.toPb(v))
            case v: BytesFromHexGenerator =>
                pb.BytesGenerator.Generator.GeneratorFromHex(BytesFromHexGenerator.toPb(v))

        pb.BytesGenerator(
            generator = generator
        )
