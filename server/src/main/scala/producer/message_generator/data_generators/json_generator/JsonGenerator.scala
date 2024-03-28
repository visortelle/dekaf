package producer.message_generator.data_generators.json_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.graalvm.polyglot.Context

case class JsonGenerator(
    generator: FixedJsonGenerator | JsJsonGenerator
):
    def generate(polyglotContext: Context): String =
        generator match
            case v: FixedJsonGenerator => v.generate
            case v: JsJsonGenerator => v.generate(polyglotContext)

object JsonGenerator:
    def fromPb(v: pb.JsonGenerator): JsonGenerator =
        val generator  = v.generator match
            case pb.JsonGenerator.Generator.GeneratorFixed(v) => FixedJsonGenerator.fromPb(v)
            case pb.JsonGenerator.Generator.GeneratorJs(v) => JsJsonGenerator.fromPb(v)
            case _ => throw new Exception("Unknown generator type")

        JsonGenerator(
            generator = generator
        )

    def toPb(v: JsonGenerator): pb.JsonGenerator =
        val generator = v.generator match
            case v: FixedJsonGenerator => pb.JsonGenerator.Generator.GeneratorFixed(FixedJsonGenerator.toPb(v))
            case v: JsJsonGenerator => pb.JsonGenerator.Generator.GeneratorJs(JsJsonGenerator.toPb(v))
        pb.JsonGenerator(
            generator = generator
        )
