package producer.message_generator

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class MessageGenerator(

)

object ConsumerSessionTarget:
    def fromPb(v: pb.MessageGenerator): MessageGenerator = ???

    def toPb(v: MessageGenerator): pb.MessageGenerator = ???
