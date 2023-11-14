package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventMessageDecodeFailed(failCount: Long)

object ConsumerSessionEventMessageDecodeFailed:
    def fromPb(v: pb.ConsumerSessionEventMessageDecodeFailed): ConsumerSessionEventMessageDecodeFailed =
        ConsumerSessionEventMessageDecodeFailed(failCount = v.failCount)

    def toPb(v: ConsumerSessionEventMessageDecodeFailed): pb.ConsumerSessionEventMessageDecodeFailed =
        pb.ConsumerSessionEventMessageDecodeFailed(failCount = v.failCount)

