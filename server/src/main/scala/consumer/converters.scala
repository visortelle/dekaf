package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message
import _root_.client.adminClient
import _root_.schema.avro
import _root_.schema.protobufnative
import _root_.conversions.primitiveConv.{
    bytesToBoolean,
    bytesToFloat32,
    bytesToFloat64,
    bytesToInt16,
    bytesToInt32,
    bytesToInt64,
    bytesToInt8,
    bytesToJsonString,
    bytesToString,
    leftPad
}

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}
import java.time.Instant

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
        val schemaVersion = Option(msg.getSchemaVersion).map(bytesToInt64).get.toOption
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

    private val partitionedTopicSuffixRegexp = "-partition-\\d+$".r

    def messageValueToJson(schemas: SchemasByTopic, msg: Message[Array[Byte]]): MessageValueToJsonResult =
        val msgData = msg.getData
        val topicName = partitionedTopicSuffixRegexp.replaceAllIn(msg.getTopicName, "")
        val schemaInfo = schemas.get(topicName) match
            case Some(schemasByVersion) =>
                val schemaVersion = Option(msg.getSchemaVersion) match
                    case Some(v) => bytesToInt64(v).toOption match
                        case Some(v2) => v2
                        case _ => return Left(new Exception(s"Invalid schema version ${bytesToInt64(v)}}"))
                    case None    => return Right(bytesToJsonString(msgData))

                schemasByVersion.get(schemaVersion) match
                    case Some(si) => si
                    case None     => return Right(bytesToJsonString(msgData))

            case None => return Right(bytesToJsonString(msgData))

        schemaInfo.getType match
            case SchemaType.AVRO            => avro.converters.toJson(schemaInfo.getSchema, msgData).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.JSON            => Right(bytesToString(msgData))
            case SchemaType.PROTOBUF        => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.PROTOBUF_NATIVE => protobufnative.converters.toJson(schemaInfo.getSchema, msgData).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.KEY_VALUE       => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
            case SchemaType.BOOLEAN         => bytesToBoolean(msgData).map(v => if v then "true" else "false")
            case SchemaType.INT8            => bytesToInt8(msgData).map(_.toString)
            case SchemaType.INT16           => bytesToInt16(msgData).map(_.toString)
            case SchemaType.INT32           => bytesToInt32(msgData).map(_.toString)
            case SchemaType.INT64           => bytesToInt64(msgData).map("\"" + _.toString + "\"")
            case SchemaType.FLOAT           => bytesToFloat32(msgData).map(_.toString)
            case SchemaType.DOUBLE          => bytesToFloat64(msgData).map(_.toString)
            case SchemaType.STRING          => Right(bytesToJsonString(msgData))
            case SchemaType.BYTES           => Left(new Exception("Can't convert bytes to json"))
            case _                          => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
