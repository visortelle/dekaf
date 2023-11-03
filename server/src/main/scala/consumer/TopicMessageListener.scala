package consumer

import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.MessageListener

class TopicMessageListener(val streamDataHandler: StreamDataHandler) extends MessageListener[Array[Byte]] {
    val logger: Logger = Logger(getClass.getName)

    // https://levelup.gitconnected.com/graceful-shutdown-of-pulsar-queue-consumers-in-java-and-spring-boot-f93645a92b2b
    private var isAcceptingNewMessages: Boolean = true

    def stopAcceptingNewMessages(): Unit =
        this.isAcceptingNewMessages = false

    def startAcceptingNewMessages(): Unit =
        this.isAcceptingNewMessages = true

    override def received(consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]], msg: org.apache.pulsar.client.api.Message[Array[Byte]]): Unit =
        if !isAcceptingNewMessages then
            consumer.negativeAcknowledge(msg)
            return;

        logger.debug(s"Listener received a message. Consumer: ${consumer.getConsumerName}")
        streamDataHandler.onNext(msg)

        if consumer.isConnected then consumer.acknowledgeAsync(msg)
}
