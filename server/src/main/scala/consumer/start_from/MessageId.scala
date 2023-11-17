package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString

case class MessageId(
    messageId: Array[Byte]
)

object MessageId:
    def toPb(messageId: MessageId): pb.MessageId =
        pb.MessageId(messageId = ByteString.copyFrom(messageId.messageId))
    def fromPb(messageId: pb.MessageId): MessageId =
        MessageId(messageId = messageId.messageId.toByteArray)