package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString

type MessageId = ByteString

case class ConsumerSessionEventMessageId(messageId: MessageId)

object ConsumerSessionEventMessageId:
    def fromPb(v: pb.ConsumerSessionEventMessageId): ConsumerSessionEventMessageId =
        ConsumerSessionEventMessageId(messageId = v.messageId.map(_.messageId).getOrElse(ByteString.EMPTY))

    def toPb(v: ConsumerSessionEventMessageId): pb.ConsumerSessionEventMessageId =
        pb.ConsumerSessionEventMessageId(messageId = Some(pb.MessageId(v.messageId)))
