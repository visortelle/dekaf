package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventMessagesProcessed(messageCount: Long)

object ConsumerSessionEventMessagesProcessed:
    def fromPb(v: pb.ConsumerSessionEventMessagesProcessed): ConsumerSessionEventMessagesProcessed =
        ConsumerSessionEventMessagesProcessed(messageCount = v.messageCount)

    def toPb(v: ConsumerSessionEventMessagesProcessed): pb.ConsumerSessionEventMessagesProcessed =
        pb.ConsumerSessionEventMessagesProcessed(messageCount = v.messageCount)
