package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventBytesDelivered(byteCount: Long)

object ConsumerSessionEventBytesDelivered:
    def fromPb(v: pb.ConsumerSessionEventBytesDelivered): ConsumerSessionEventBytesDelivered =
        ConsumerSessionEventBytesDelivered(byteCount = v.byteCount)

    def toPb(v: ConsumerSessionEventBytesDelivered): pb.ConsumerSessionEventBytesDelivered =
        pb.ConsumerSessionEventBytesDelivered(byteCount = v.byteCount)
