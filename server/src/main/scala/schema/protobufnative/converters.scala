package schema.protobufnative

import _root_.schema.shared.{JsonAsBytes, JsonSerDe, Proto3Datum}
import com.google.protobuf.util.JsonFormat
import com.google.protobuf.Descriptors.Descriptor
import com.google.protobuf.DynamicMessage
import com.google.protobuf.Struct
import org.apache.pulsar.client.impl.schema.ProtobufNativeSchemaUtils
import scala.jdk.CollectionConverters.*

object converters extends JsonSerDe[Proto3Datum]:
    def fromJson(schema: Array[Byte], json: JsonAsBytes): Either[Throwable, Proto3Datum] =
        try {
            val descriptor = ProtobufNativeSchemaUtils.deserialize(schema)
            val typeRegistry = JsonFormat.TypeRegistry.newBuilder().add(descriptor).build

            val structBuilder = Struct.newBuilder()
            JsonFormat.parser.ignoringUnknownFields
                .usingTypeRegistry(typeRegistry)
                .merge(new String(json), structBuilder)

            val proto3Datum = structBuilder.build

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
                .omittingInsignificantWhitespace
                .print(message)

            Right(json.getBytes)
        } catch {
            case err: Throwable => Left(err)
        }
