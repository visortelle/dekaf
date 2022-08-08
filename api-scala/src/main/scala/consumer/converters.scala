package consumer

import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import org.apache.pulsar.client.api.Message
import _root_.client.adminClient
import _root_.schema.avro

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp
import org.apache.pulsar.common.schema.SchemaType

import java.time.Instant

def messageToPb(msg: Message[Array[Byte]]): consumerPb.Message =
    val message = consumerPb.Message(
      properties = Option(msg.getProperties) match
          case Some(v) => v.asScala.toMap
          case _       => Map.empty
      ,
      value = Option(msg.getValue).map(ByteString.copyFrom(_)),
      jsonValue = messageToJson(msg),
      size = Option(msg.getValue) match
          case Some(v) => Some(v.length)
          case _       => None
      ,
      eventTime = Option(msg.getEventTime) match
          case Some(v) => if v > 0 then Some(timestamp.Timestamp(Instant.ofEpochMilli(v))) else None
          case _       => None
      ,
      publishTime = Option(msg.getPublishTime) match
          case Some(v) =>
              Some(timestamp.Timestamp(Instant.ofEpochMilli(v)))
          case _ => None
      ,
      brokerPublishTime = Option(msg.getBrokerPublishTime) match
          case Some(v) =>
              v.toScala match
                  case Some(l) => Some(timestamp.Timestamp(Instant.ofEpochMilli(l)))
                  case _       => None
          case _ => None
      ,
      messageId = Option(msg.getMessageId.toByteArray) match
          case Some(v) => Some(ByteString.copyFrom(v))
          case _       => None
      ,
      sequenceId = Option(msg.getSequenceId),
      producerName = Option(msg.getProducerName),
      key = Option(msg.getKey),
      orderingKey = Option(msg.getOrderingKey) match
          case Some(v) => Some(ByteString.copyFrom(v))
          case _       => None
      ,
      topic = Option(msg.getTopicName),
      redeliveryCount = Option(msg.getRedeliveryCount),
      schemaVersion = Option(msg.getSchemaVersion) match
          case Some(v) => Some(ByteString.copyFrom(v))
          case _       => None
      ,
      isReplicated = Option(msg.isReplicated),
      replicatedFrom = Option(msg.getReplicatedFrom)
    )
    message

def messageToJson(msg: Message[Array[Byte]]): Option[String] =
    val schemaInfo = adminClient.schemas.getSchemaInfo(msg.getTopicName)
    val msgValue = msg.getValue

    val maybeJson: Option[String] = schemaInfo.getType match
        case SchemaType.AVRO =>
            avro.toJson(schemaInfo.getSchema, msgValue).toOption.map(_.map(_.toChar).mkString)
        case SchemaType.JSON => Some(msgValue.map(_.toChar).mkString)
        case _ => Some("")

    maybeJson
