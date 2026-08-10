package consumer.deserializer.deserializers

import io.circe.syntax.*
import io.circe.generic.auto.*
import _root_.schema.{avro, protobufnative}
import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.deserializer.Deserializer
import _root_.consumer.session_runner.{MessageAsJsonOmittingValue, MessageValueAsJson, SchemasByTopic, SchemasByVersion}
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

        // The schema the MESSAGE names, when the registry holds that version: always the most
        // faithful way to read that particular message, and unchanged behaviour.
        val exactSchema = msgSchemaVersion.flatMap(schemasByVersion.get.get)

        // Otherwise the topic's LATEST registered schema - the case this deserializer is NAMED
        // for. A producer using Schema.BYTES (or an older client) stamps no schema version, so
        // only the registry says what the bytes are; falling straight through to
        // `bytesToJsonString` rendered a JSON document as an escaped JSON STRING instead of the
        // object. `SchemasByVersion.getLatest` was written for this and had no caller.
        val schemaInfo = exactSchema.orElse(SchemasByVersion.getLatest(schemasByVersion.get)) match
            case Some(si) => si
            case None     => return Right(bytesToJsonString(msgData))

        val decoded = schemaInfo.getType match
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
            case SchemaType.FLOAT     => bytesToFloat32(msgData).map(v => v.asJson.asNumber.map(_.toString).getOrElse(v.toString))
            case SchemaType.DOUBLE    => bytesToFloat64(msgData).map(v => v.asJson.asNumber.map(_.toString).getOrElse(v.toString))
            case SchemaType.STRING    => Right(bytesToJsonString(msgData))
//            case SchemaType.BYTES => the message schema version is empty in this case and is handled in the code above
//            case SchemaType.NONE => the message schema version is empty in this case and is handled in the code above
            case _ => Left(new Exception("Can't convert bytes to json"))

        // A schema the message did not name is an INFERENCE, so it must never turn a readable
        // payload into an error: if decoding under the latest schema fails, keep the raw-string
        // answer this path used to give unconditionally. A schema the message DID name is the
        // message's own truth, and its failures stay visible.
        if exactSchema.isEmpty && decoded.isLeft
        then Right(bytesToJsonString(msgData))
        else decoded
