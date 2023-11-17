package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventMessagesDelivered(messageCount: Long)

object ConsumerSessionEventMessagesDelivered:
    def fromPb(v: pb.ConsumerSessionEventMessagesDelivered): ConsumerSessionEventMessagesDelivered =
        ConsumerSessionEventMessagesDelivered(messageCount = v.messageCount)

    def toPb(v: ConsumerSessionEventMessagesDelivered): pb.ConsumerSessionEventMessagesDelivered =
        pb.ConsumerSessionEventMessagesDelivered(messageCount = v.messageCount)
