package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message
import _root_.client.adminClient
import _root_.schema.avro
import _root_.conversions.{
    bytesToBoolean,
    bytesToFloat32,
    bytesToFloat64,
    bytesToInt16,
    bytesToInt32,
    bytesToInt64,
    bytesToInt8,
    bytesToJsonString,
    bytesToString
}

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp
import org.apache.pulsar.common.schema.{SchemaInfo, SchemaType}

import java.nio.charset.StandardCharsets
import java.nio.{ByteBuffer, ByteOrder}
import java.time.Instant

type JsonValue = Option[String]

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
    size: Int,
    redeliveryCount: Option[Int],
    schemaVersion: Option[Long],
    isReplicated: Option[Boolean],
    replicatedFrom: Option[String],
    properties: Map[String, String]
)

def serializeMessage(schemas: SchemasByTopic, msg: Message[Array[Byte]]): (consumerPb.Message, JsonMessage, JsonValue) =
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
    val size = msg.size
    val orderingKey = Option(msg.getOrderingKey)
    val topic = Option(msg.getTopicName)
    val redeliveryCount = Option(msg.getRedeliveryCount)
    val schemaVersion = Option(msg.getSchemaVersion).map(bytesToInt64)
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
      bytes = Option(msg.getValue).map(ByteString.copyFrom),
      value = jsonValue,
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
      replicatedFrom = replicatedFrom
    )
    (messagePb, jsonMessage, jsonValue)

def messageValueToJson(schemas: SchemasByTopic, msg: Message[Array[Byte]]): Option[String] =
    val msgValue = msg.getValue

    val topicName = partitionedTopicSuffixRegexp.replaceAllIn(msg.getTopicName, "")
    val schemaInfo = schemas.get(topicName) match
        case Some(schemasByVersion) =>
            val schemaVersion = Option(msg.getSchemaVersion) match
                case Some(v) => bytesToInt64(v)
                case None    => return Some(bytesToJsonString(msgValue))

            schemasByVersion.get(schemaVersion) match
                case Some(si) => si
                case None     => return Some(bytesToJsonString(msgValue))

        case None => return Some(bytesToJsonString(msgValue))

    val maybeJson: Option[String] = schemaInfo.getType match
        case SchemaType.AVRO            => avro.toJson(schemaInfo.getSchema, msgValue).toOption.map(String(_, StandardCharsets.UTF_8))
        case SchemaType.JSON            => Some(bytesToString(msgValue))
        case SchemaType.PROTOBUF        => ???
        case SchemaType.PROTOBUF_NATIVE => ???
        case SchemaType.BOOLEAN         => Some(if bytesToBoolean(msgValue) then "true" else "false")
        case SchemaType.INT8            => Some(bytesToInt8(msgValue).toString)
        case SchemaType.INT16           => Some(bytesToInt16(msgValue).toShort.toString)
        case SchemaType.INT32           => Some(bytesToInt32(msgValue).toString)
        case SchemaType.INT64           => Some(bytesToInt64(msgValue).toString)
        case SchemaType.FLOAT           => Some(bytesToFloat32(msgValue).toString)
        case SchemaType.DOUBLE          => Some(bytesToFloat64(msgValue).toString)
        case SchemaType.STRING          => Some(bytesToJsonString(msgValue))
        case SchemaType.BYTES           => None
        case _                          => None
    maybeJson

private val partitionedTopicSuffixRegexp = "-partition-\\d+$".r
