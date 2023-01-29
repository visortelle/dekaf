package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message
import _root_.client.adminClient
import _root_.schema.avro
import _root_.schema.protobufnative
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
    size: Option[Int],
    redeliveryCount: Option[Int],
    schemaVersion: Option[Long],
    isReplicated: Option[Boolean],
    replicatedFrom: Option[String],
    properties: Map[String, String]
)

object converters:
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
        val size = Option(msg.size)
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
        (messagePb, jsonMessage, jsonValue.toOption)

    private val partitionedTopicSuffixRegexp = "-partition-\\d+$".r

    def messageValueToJson(schemas: SchemasByTopic, msg: Message[Array[Byte]]): Either[Throwable, String] =
        val msgValue = msg.getData
        val topicName = partitionedTopicSuffixRegexp.replaceAllIn(msg.getTopicName, "")
        val schemaInfo = schemas.get(topicName) match
            case Some(schemasByVersion) =>
                val schemaVersion = Option(msg.getSchemaVersion) match
                    case Some(v) => bytesToInt64(v)
                    case None => return Right(bytesToJsonString(msgValue))

                schemasByVersion.get(schemaVersion) match
                    case Some(si) => si
                    case None => return Right(bytesToJsonString(msgValue))

            case None => return Right(bytesToJsonString(msgValue))

        println(s"----------------------- schemaInfo: $schemaInfo")
        schemaInfo.getType match
            case SchemaType.AVRO            => avro.converters.toJson(schemaInfo.getSchema, msgValue).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.JSON            => Right(bytesToString(msgValue))
            case SchemaType.PROTOBUF        => ???
            case SchemaType.PROTOBUF_NATIVE => protobufnative.converters.toJson(schemaInfo.getSchema, msgValue).map(String(_, StandardCharsets.UTF_8))
            case SchemaType.BOOLEAN         => Right(if bytesToBoolean(msgValue) then "true" else "false")
            case SchemaType.INT8            => Right(bytesToInt8(msgValue).toString)
            case SchemaType.INT16           => Right(bytesToInt16(msgValue).toShort.toString)
            case SchemaType.INT32           => Right(bytesToInt32(msgValue).toString)
            case SchemaType.INT64           => Right(bytesToInt64(msgValue).toString)
            case SchemaType.FLOAT           => Right(bytesToFloat32(msgValue).toString)
            case SchemaType.DOUBLE          => Right(bytesToFloat64(msgValue).toString)
            case SchemaType.STRING          => Right(bytesToJsonString(msgValue))
            case SchemaType.BYTES           => Left(new Exception("Can't convert bytes to json"))
            case _                          => Left(new Exception(s"Unsupported schema type: ${schemaInfo.getType}"))
