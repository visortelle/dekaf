package consumer.deserializer.deserializers

import io.circe.syntax.*
import io.circe.generic.auto.*
import _root_.schema.{avro, protobufnative}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.session_runner.{MessageAsJsonOmittingValue, MessageValueAsJson, SchemasByTopic}
import org.apache.pulsar.common.schema.SchemaType
import org.apache.pulsar.client.api.Message
import _root_.conversions.primitiveConv.*
import java.nio.charset.StandardCharsets
import scala.util.boundary

case class UseLatestTopicSchema()

object UseLatestTopicSchema:
    def fromPb(v: pb.Deserializer.UseLatestTopicSchema): UseLatestTopicSchema =
        UseLatestTopicSchema()

    def toPb(v: UseLatestTopicSchema): pb.Deserializer.UseLatestTopicSchema =
        pb.Deserializer.UseLatestTopicSchema()

    def deserializeMessageValue(
        schemas: SchemasByTopic,
        msg: Message[Array[Byte]],
        deserializer: Deserializer
    ): MessageValueAsJson = boundary:
        val msgData = msg.getData

        deserializer.deserializer match
            case _: TreatBytesAsJson =>
                boundary.break(TreatBytesAsJson.deserializeMessageValue(msg))
            case _ => // continue

        val schemasByVersion = schemas.get(msg.getTopicName)

        if schemasByVersion.isEmpty then
            boundary.break(Right(bytesToJsonString(msgData)))

        val msgSchemaVersion = Option(msg.getSchemaVersion) match
            case Some(v) => bytesToInt64(v).toOption
            case None    => None

        val schemaInfo =
            if msgSchemaVersion.isEmpty
            then return Right(bytesToJsonString(msgData))
            else schemasByVersion.get(msgSchemaVersion.get)

        schemaInfo.getType match
            case SchemaType.AVRO => avro.converters.toJson(schemaInfo.getSchema, msgData).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.JSON =>
                msgData match
                    case v if v.isEmpty => Left(new Exception(s"Message \"${msg.getMessageId}\" uses JSON schema, but its' content isn't a valid JSON string."))
                    case _              => Right(bytesToString(msgData))
            case SchemaType.PROTOBUF => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.PROTOBUF_NATIVE =>
                protobufnative.converters.toJson(schemaInfo.getSchema, msgData).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.KEY_VALUE => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.BOOLEAN   => bytesToBoolean(msgData).map(_.asJson.toString)
            case SchemaType.INT8      => bytesToInt8(msgData).map(_.asJson.toString)
            case SchemaType.INT16     => bytesToInt16(msgData).map(_.asJson.toString)
            case SchemaType.INT32     => bytesToInt32(msgData).map(_.asJson.toString)
            case SchemaType.INT64     => bytesToInt64(msgData).map(_.asJson.toString)
            case SchemaType.FLOAT     => bytesToFloat32(msgData).map(_.asJson.asNumber.get.toString)
            case SchemaType.DOUBLE    => bytesToFloat64(msgData).map(_.asJson.asNumber.get.toString)
            case SchemaType.STRING    => Right(bytesToJsonString(msgData))
//            case SchemaType.BYTES => the message schema version is empty in this case and is handled in the code above
//            case SchemaType.NONE => the message schema version is empty in this case and is handled in the code above
            case _ => Left(new Exception("Can't convert bytes to json"))
