package producer.message_generator.properties_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.json_generator.JsonGenerator

case class PropertiesGenerator(
    generator: JsonGenerator
)

object PropertiesGenerator:
    def fromPb(v: pb.PropertiesGenerator): PropertiesGenerator =
        val generator = v.generator match
            case pb.PropertiesGenerator.Generator.GeneratorJson(v) => JsonGenerator.fromPb(v)
            case _ => throw new Exception("Unknown properties generator type")

        PropertiesGenerator(
            generator = generator
        )

    def toPb(v: PropertiesGenerator): pb.PropertiesGenerator =
        val generator = v.generator match
            case v: JsonGenerator => pb.PropertiesGenerator.Generator.GeneratorJson(JsonGenerator.toPb(v))

        pb.PropertiesGenerator(
            generator = generator
        )
