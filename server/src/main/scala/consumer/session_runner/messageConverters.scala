package consumer.session_runner

import _root_.conversions.primitiveConv.bytesToInt64
import com.google.protobuf.ByteString
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import _root_.consumer.deserializer.Deserializer
import consumer.deserializer.deserializers.{TreatBytesAsJson, UseLatestTopicSchema}
import org.apache.pulsar.client.api.Message
import org.apache.pulsar.common.schema.SchemaType
import io.circe.parser.parse as parseJson
import io.circe.Json
import io.circe.syntax.*
import io.circe.generic.auto.*

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

type JsonValue = String
type MessageAsJsonOmittingValue = JsonValue
type MessageValueAsJson = Either[Throwable, JsonValue]

case class PulsarMessageJsonOmittingValue(
    eventTime: Option[Long] = None,
    publishTime: Option[Long] = None,
    brokerPublishTime: Option[Long] = None,
    messageId: Option[Array[Byte]] = None,
    sequenceId: Option[Long] = None,
    producerName: Option[String] = None,
    key: Option[Json] = None,
    orderingKey: Option[Array[Byte]] = None,
    topic: Option[String] = None,
    size: Option[Int] = None,
    redeliveryCount: Option[Int] = None,
    schemaVersion: Option[Long] = None,
    isReplicated: Option[Boolean] = None,
    replicatedFrom: Option[String] = None,
    properties: Map[String, String] = Map.empty
):
    def toJson = this.asJson.noSpaces

object converters:
    def serializeMessage(
        schemas: SchemasByTopic,
        msg: Message[Array[Byte]],
        messageValueDeserializer: Deserializer
    ): ConsumerSessionMessage =
        val messageValueAsJson = messageValueToJson(schemas, msg, messageValueDeserializer)

        val properties = Option(msg.getProperties) match
            case Some(v) => v.asScala.toMap
            case _       => Map.empty[String, String]
        val eventTime = Option(msg.getEventTime) match
            case Some(v) if v > 0 => Some(v)
            case _                => None
        val publishTime = Option(msg.getPublishTime)
        val brokerPublishTime = msg.getBrokerPublishTime.toScala.map(_.toLong)
        val messageId = Option(msg.getMessageId.toByteArray)
        val sequenceId = Option(msg.getSequenceId)
        val producerName = Option(msg.getProducerName)
        val key = Option(msg.getKey).flatMap(key => {
            parseJson(s"""\"$key\"""") match
                case Left(_) => None
                case Right(k) => Some(k)
        })
        val size = Option(msg.size)
        val orderingKey = Option(msg.getOrderingKey)
        val topic = Option(msg.getTopicName)
        val redeliveryCount = Option(msg.getRedeliveryCount)
        val schemaVersion = Option(msg.getSchemaVersion).map(bytesToInt64).getOrElse(Left("")).toOption
        val isReplicated = Option(msg.isReplicated)
        val replicatedFrom = Option(msg.getReplicatedFrom)

        val messageAsJsonOmittingValue = PulsarMessageJsonOmittingValue(
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
            value = messageValueAsJson.toOption,
            eventTime = eventTime,
            publishTime = publishTime,
            brokerPublishTime = brokerPublishTime,
            messageId = messageId.map(ByteString.copyFrom),
            sequenceId = sequenceId,
            producerName = producerName,
            key = key.map(_.noSpaces),
            orderingKey = orderingKey.map(ByteString.copyFrom),
            topic = topic,
            redeliveryCount = redeliveryCount,
            schemaVersion = schemaVersion,
            isReplicated = isReplicated,
            replicatedFrom = replicatedFrom,
            size = size
        )

        ConsumerSessionMessage(
            messagePb = messagePb,
            messageAsJsonOmittingValue = messageAsJsonOmittingValue.toJson,
            messageValueAsJson = messageValueAsJson
        )

    def messageValueToJson(
        schemas: SchemasByTopic,
        msg: Message[Array[Byte]],
        deserializer: Deserializer
    ): MessageValueAsJson = deserializer.deserializer match
        case _: UseLatestTopicSchema =>
            UseLatestTopicSchema.deserializeMessageValue(schemas, msg, deserializer)
        case _: TreatBytesAsJson =>
            TreatBytesAsJson.deserializeMessageValue(msg)
