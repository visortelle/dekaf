package consumer.message_filter

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class BasicMessageFilter()

object BasicMessageFilter:
    def fromPb(filter: pb.BasicMessageFilter): BasicMessageFilter =
        BasicMessageFilter()

    def toPb(filter: BasicMessageFilter): pb.BasicMessageFilter =
        pb.BasicMessageFilter()
