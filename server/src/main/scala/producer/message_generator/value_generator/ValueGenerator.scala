package producer.message_generator.value_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import producer.message_generator.data_generators.bytes.BytesGenerator
import producer.message_generator.data_generators.json_generator.JsonGenerator
import org.graalvm.polyglot.Context
import org.apache.pulsar.client.api.TypedMessageBuilder
import org.apache.pulsar.common.schema.SchemaInfo
import _root_.producer.jsonToValue

case class ValueGenerator(
    generator: BytesGenerator | JsonGenerator | ValueFromTopicSchemaGenerator
):
    def generateMut(
        builder: TypedMessageBuilder[Array[Byte]],
        polyglotContext: Context,
        schemaInfo: Option[SchemaInfo]
    ): Unit =
        generator match
            case v: BytesGenerator =>
                val bytes = v.generate(polyglotContext)
                builder.value(bytes)

            case v: JsonGenerator =>
                val json = v.generate(polyglotContext)

                schemaInfo match
                    case None =>
                        builder.value(json.getBytes)
                    case Some(si) =>
                        jsonToValue(si, json.getBytes) match
                            case Left(e)  => throw new Exception(s"Failed to convert json to value: $e")
                            case Right(v) => builder.value(v)

            case v: ValueFromTopicSchemaGenerator => ???

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
