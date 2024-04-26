package consumer.session_runner

import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.MessageListener

import scala.collection.mutable
import scala.util.control.Breaks.{break, breakable}

class ConsumerListener(val targetMessageHandler: ConsumerSessionTargetMessageHandler) extends MessageListener[Array[Byte]]:
    private val logger: Logger = Logger(getClass.getName)
    private val redeliveryQueue = new mutable.Queue[org.apache.pulsar.client.api.Message[Array[Byte]]]()
    private var isPaused: Boolean = true

    def resume(): Unit =
        isPaused = false

        breakable {
            while redeliveryQueue.nonEmpty do
                if isPaused then
                    break

                targetMessageHandler.onNext(redeliveryQueue.dequeue())
        }

    def pause(): Unit =
        isPaused = true

    override def received(
        consumer: org.apache.pulsar.client.api.Consumer[Array[Byte]],
        msg: org.apache.pulsar.client.api.Message[Array[Byte]]
    ): Unit =
        logger.debug(s"Listener received a message. Consumer: ${consumer.getConsumerName}")

        if consumer.isConnected && !isPaused then
            targetMessageHandler.onNext(msg)
            consumer.acknowledge(msg)
        else
            redeliveryQueue.enqueue(msg)
