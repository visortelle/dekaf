package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventBytesProcessed(byteCount: Long)

object ConsumerSessionEventBytesProcessed:
    def fromPb(v: pb.ConsumerSessionEventBytesProcessed): ConsumerSessionEventBytesProcessed =
        ConsumerSessionEventBytesProcessed(byteCount = v.byteCount)

    def toPb(v: ConsumerSessionEventBytesProcessed): pb.ConsumerSessionEventBytesProcessed =
        pb.ConsumerSessionEventBytesProcessed(byteCount = v.byteCount)
