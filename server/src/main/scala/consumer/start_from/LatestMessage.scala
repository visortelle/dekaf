package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class LatestMessage ()

object LatestMessage:
    def fromPb(v: pb.LatestMessage): LatestMessage = LatestMessage()
    def toPb(v: LatestMessage): pb.LatestMessage = pb.LatestMessage()
