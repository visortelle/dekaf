package consumer.session_runner

import org.apache.pulsar.client.api.Message

case class ConsumerSessionTargetMessageHandler(
    var onNext: (msg: Message[Array[Byte]]) => Unit
)
