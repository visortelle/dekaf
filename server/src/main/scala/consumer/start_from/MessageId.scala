package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import org.apache.pulsar.client.api.MessageId as PulsarMessageId
import com.google.protobuf.ByteString

import scala.util.{ Try, Success, Failure }

case class MessageId(
                        messageIdBytes: Array[Byte]
)

object MessageId:
    def toPb(messageId: MessageId): pb.MessageId =
        pb.MessageId(messageId = ByteString.copyFrom(messageId.messageIdBytes))
    def fromPb(messageIdPb: pb.MessageId): MessageId =
        MessageId(messageIdBytes = messageIdPb.messageId.toByteArray)

    def toPulsar(messageId: MessageId): Option[PulsarMessageId] =
        Try(PulsarMessageId.fromByteArray(messageId.messageIdBytes)).toOption
