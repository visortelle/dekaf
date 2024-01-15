package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class EarliestMessage()

object EarliestMessage:
    def fromPb(v: pb.EarliestMessage): EarliestMessage = EarliestMessage()
    def toPb(v: EarliestMessage): pb.EarliestMessage = pb.EarliestMessage()
