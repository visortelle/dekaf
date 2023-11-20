package consumer.session_runner

import _root_.conversions.primitiveConv.*
import _root_.schema.{avro, protobufnative}
import com.google.protobuf.{ByteString, timestamp}
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}
import java.time.Instant
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

type JsonValue = String
type MessageValueToJsonResult = Either[Throwable, JsonValue]

case class JsonMessage(
    eventTime: Option[Long],
    publishTime: Option[Long],
    brokerPublishTime: Option[Long],
    messageId: Option[Array[Byte]],
    sequenceId: Option[Long],
    producerName: Option[String],
    key: Option[String],
    orderingKey: Option[Array[Byte]],
    topic: Option[String],
    size: Option[Int],
    redeliveryCount: Option[Int],
    schemaVersion: Option[Long],
    isReplicated: Option[Boolean],
    replicatedFrom: Option[String],
    properties: Map[String, String]
)

object converters:
    def serializeMessage(schemas: SchemasByTopic, msg: Message[Array[Byte]]): (consumerPb.Message, JsonMessage, MessageValueToJsonResult) =
        val jsonValue = messageValueToJson(schemas, msg)

        val properties = Option(msg.getProperties) match
            case Some(v) => v.asScala.toMap
            case _       => Map.empty
        val eventTime = Option(msg.getEventTime) match
            case Some(v) if v > 0 => Some(v)
            case _                => None
        val publishTime = Option(msg.getPublishTime)
        val brokerPublishTime = msg.getBrokerPublishTime.toScala.map(_.toLong)
        val messageId = Option(msg.getMessageId.toByteArray)
        val sequenceId = Option(msg.getSequenceId)
        val producerName = Option(msg.getProducerName)
        val key = Option(msg.getKey)
        val size = Option(msg.size)
        val orderingKey = Option(msg.getOrderingKey)
        val topic = Option(msg.getTopicName)
        val redeliveryCount = Option(msg.getRedeliveryCount)
        val schemaVersion = Option(msg.getSchemaVersion).map(bytesToInt64).getOrElse(Left("")).toOption
        val isReplicated = Option(msg.isReplicated)
        val replicatedFrom = Option(msg.getReplicatedFrom)

        val jsonMessage = JsonMessage(
            properties = properties,
            eventTime = eventTime,
            publishTime = publishTime,
            brokerPublishTime = brokerPublishTime,
            messageId = messageId,
            sequenceId = sequenceId,
            producerName = producerName,
            key = key,
            size = size,
            orderingKey = orderingKey,
            topic = topic,
            redeliveryCount = redeliveryCount,
            schemaVersion = schemaVersion,
            isReplicated = isReplicated,
            replicatedFrom = Option(msg.getReplicatedFrom)
        )

        val messagePb = consumerPb.Message(
            properties = properties,
            rawValue = Option(msg.getValue).map(ByteString.copyFrom),
            value = jsonValue.toOption,
            eventTime = eventTime,
            publishTime = publishTime,
            brokerPublishTime = brokerPublishTime,
            messageId = messageId.map(ByteString.copyFrom),
            sequenceId = sequenceId,
            producerName = producerName,
            key = key,
            orderingKey = orderingKey.map(ByteString.copyFrom),
            topic = topic,
            redeliveryCount = redeliveryCount,
            schemaVersion = schemaVersion,
            isReplicated = isReplicated,
            replicatedFrom = replicatedFrom,
            size = size
        )
        (messagePb, jsonMessage, jsonValue)

    private val PartitionedTopicSuffixRegexp = "-partition-\\d+$".r

    def messageValueToJson(schemas: SchemasByTopic, msg: Message[Array[Byte]]): MessageValueToJsonResult =
        val msgData = msg.getData
        val topicName = PartitionedTopicSuffixRegexp.replaceAllIn(msg.getTopicName, "")
        val schemasByVersion = schemas.get(topicName)

        if schemasByVersion.isEmpty
        then return Right(bytesToJsonString(msgData))

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
            case SchemaType.PROTOBUF        => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.PROTOBUF_NATIVE =>
                protobufnative.converters.toJson(schemaInfo.getSchema, msgData).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.KEY_VALUE       => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.BOOLEAN         => bytesToBoolean(msgData).map(v => if v then "true" else "false")
            case SchemaType.INT8            => bytesToInt8(msgData).map(_.toString)
            case SchemaType.INT16           => bytesToInt16(msgData).map(_.toString)
            case SchemaType.INT32           => bytesToInt32(msgData).map(_.toString)
            case SchemaType.INT64           => bytesToInt64(msgData).map("\"" + _.toString + "\"")
            case SchemaType.FLOAT           => bytesToFloat32(msgData).map(_.toString)
            case SchemaType.DOUBLE          => bytesToFloat64(msgData).map(_.toString)
            case SchemaType.STRING          => Right(bytesToJsonString(msgData))
            case SchemaType.BYTES           => bytesToJson(msgData)
            case SchemaType.NONE            => bytesToJson(msgData)
            case _                          => Left(new Exception("Can't convert bytes to json"))
