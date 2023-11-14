package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventUnexpectedErrorOccurred()

object ConsumerSessionEventUnexpectedErrorOccurred:
    def fromPb(v: pb.ConsumerSessionEventUnexpectedErrorOccurred): ConsumerSessionEventUnexpectedErrorOccurred =
        ConsumerSessionEventUnexpectedErrorOccurred()

    def toPb(v: ConsumerSessionEventUnexpectedErrorOccurred): pb.ConsumerSessionEventUnexpectedErrorOccurred =
        pb.ConsumerSessionEventUnexpectedErrorOccurred()
