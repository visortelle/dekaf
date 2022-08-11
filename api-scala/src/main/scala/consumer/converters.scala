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
import java.nio.{ByteBuffer,ByteOrder}

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
    println(s"MSGVALUE ${convertBytesToHex(msgValue)}")

    val maybeJson: Option[String] = schemaInfo.getType match
        case SchemaType.AVRO => avro.toJson(schemaInfo.getSchema, msgValue).toOption.map(_.map(_.toChar).mkString)
        case SchemaType.JSON => Some(msgValue.map(_.toChar).mkString)
        case SchemaType.PROTOBUF => ???
        case SchemaType.PROTOBUF_NATIVE => ???
        case SchemaType.BOOLEAN => Some(if msgValue.head > 0 then "true" else "false")
        case SchemaType.DOUBLE => Some(ByteBuffer.wrap(msgValue).getDouble.toString)
        case SchemaType.FLOAT => Some(ByteBuffer.wrap(msgValue).getFloat.toString)
        case SchemaType.INT8 =>
            val buf = ByteBuffer.allocateDirect(4)
            buf.order(ByteOrder.BIG_ENDIAN)
            buf.put(0x00.toByte)
            buf.put(0x00.toByte)
            buf.put(0x00.toByte)
            buf.put(msgValue.head)
            buf.flip

            val uint8 = buf.getInt
            val v = if uint8 > 127 then uint8 - 256 else uint8

            println(s"VVVVVVVVVVVVVVVVVVV ${v}")
            Some(v.toString)
        case SchemaType.INT16 =>
            val buf = ByteBuffer.allocateDirect(4)
            buf.order(ByteOrder.BIG_ENDIAN)
            buf.put(0x00.toByte)
            buf.put(0x00.toByte)
            buf.put(msgValue.tail.head)
            buf.put(msgValue.head)
            buf.flip
            Some(buf.getInt.toString)
        case SchemaType.INT32 => Some(ByteBuffer.wrap(msgValue).getInt.toString)
        case SchemaType.INT64 => Some(ByteBuffer.wrap(msgValue).getLong.toString)
        case SchemaType.STRING => Some(msgValue.map(_.toChar).mkString)
        case SchemaType.BYTES => None
        case _ => None

    maybeJson

def convertBytesToHex(bytes: Seq[Byte]): String = {
    val sb = new StringBuilder
    for (b <- bytes) {
        sb.append(String.format("%02x", Byte.box(b)))
    }
    sb.toString
}
