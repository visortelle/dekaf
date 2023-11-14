package schema.protobufnative

import _root_.schema.shared.{JsonAsBytes, JsonSerDe, Proto3Datum}
import com.google.protobuf.util.JsonFormat
import com.google.protobuf.Descriptors.Descriptor
import com.google.protobuf.{DescriptorProtos, DynamicMessage, Struct}
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils
import schema.utils.JsonSchema

import scala.jdk.CollectionConverters.*

object converters extends JsonSerDe[Proto3Datum]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, Proto3Datum] =
        try {
            val descriptor = ProtobufNativeSchemaUtils.deserialize(schema)
            val typeRegistry = JsonFormat.TypeRegistry.newBuilder().add(descriptor).build

            val builder = DynamicMessage.newBuilder(descriptor)
            JsonFormat.parser()
                .ignoringUnknownFields
                .usingTypeRegistry(typeRegistry)
                .merge(String(json, "UTF-8"), builder)

            val proto3Datum = builder.build

            Right(proto3Datum.toByteArray)
        } catch {
            case err: Throwable => Left(err)
        }

    def toJson(schema: Array[Byte], data: Proto3Datum): Either[Throwable, JsonAsBytes] =
        try {
            val descriptor = ProtobufNativeSchemaUtils.deserialize(schema)
            val message = DynamicMessage.parseFrom(descriptor, data)

            val typeRegistry = JsonFormat.TypeRegistry.newBuilder.add(descriptor).build
            val json = JsonFormat
                .printer
                .usingTypeRegistry(typeRegistry)
                .preservingProtoFieldNames()
                .omittingInsignificantWhitespace()
                .print(message)

            Right(json.getBytes)
        } catch {
            case err: Throwable => Left(err)
        }

    def protobufToJsonSchema(schema: Array[Byte]): Either[Throwable, JsonSchema] =
        compiler.compileProtobufNativeToJsonSchema(schema)
