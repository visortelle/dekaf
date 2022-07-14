package consumer

import org.apache.pulsar.client.api.{Consumer, MessageListener}
import com.tools.teal.pulsar.ui.api.v1.consumer as consumerPb
import com.tools.teal.pulsar.ui.api.v1.consumer.CreateConsumerRequest
import _root_.client.client
import com.tools.teal.pulsar.ui.api.v1.consumer.TopicsSelector.TopicsSelector
import com.typesafe.scalalogging.Logger
import org.apache.pulsar.client.api.{SubscriptionMode, SubscriptionType}
import org.apache.pulsar.client.api.SubscriptionInitialPosition
import org.apache.pulsar.client.api.RegexSubscriptionMode

import scala.concurrent.duration.MILLISECONDS
import org.apache.pulsar.client.api.ConsumerBuilder

import scala.jdk.CollectionConverters.*

def buildConsumer(
    consumerName: ConsumerName,
    request: CreateConsumerRequest,
    logger: Logger,
    streamDataHandlers: Map[ConsumerName, StreamDataHandler]
): Either[String, ConsumerBuilder[Array[Byte]]] =
    val listener: MessageListener[Array[Byte]] = (consumer, msg) =>
        logger.debug(s"Listener received a message. Consumer: $consumerName")
        streamDataHandlers.get(consumerName) match
            case Some(handler) => handler.onNext(msg)
            case _             => ()

        if consumer.isConnected then consumer.acknowledge(msg)

    var consumer = client.newConsumer
        .consumerName(consumerName)
        .messageListener(listener)
        .startPaused(request.startPaused.getOrElse(true))
        .subscriptionName(request.subscriptionName.getOrElse(consumerName))

    consumer = request.subscriptionMode match
        case Some(consumerPb.SubscriptionMode.SUBSCRIPTION_MODE_DURABLE)     => consumer.subscriptionMode(SubscriptionMode.Durable)
        case Some(consumerPb.SubscriptionMode.SUBSCRIPTION_MODE_NON_DURABLE) => consumer.subscriptionMode(SubscriptionMode.NonDurable)
        case _                                                               => consumer

    consumer = request.subscriptionType match
        case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_SHARED)     => consumer.subscriptionType(SubscriptionType.Shared)
        case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_FAILOVER)   => consumer.subscriptionType(SubscriptionType.Failover)
        case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_EXCLUSIVE)  => consumer.subscriptionType(SubscriptionType.Exclusive)
        case Some(consumerPb.SubscriptionType.SUBSCRIPTION_TYPE_KEY_SHARED) => consumer.subscriptionType(SubscriptionType.Key_Shared)
        case _                                                              => consumer

    consumer = request.subscriptionInitialPosition match
        case Some(consumerPb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_EARLIEST) =>
            consumer.subscriptionInitialPosition(SubscriptionInitialPosition.Earliest)
        case Some(consumerPb.SubscriptionInitialPosition.SUBSCRIPTION_INITIAL_POSITION_LATEST) =>
            consumer.subscriptionInitialPosition(SubscriptionInitialPosition.Latest)
        case _ => consumer

    consumer = request.priorityLevel match
        case Some(v) => consumer.priorityLevel(v)
        case _       => consumer

    consumer = request.ackTimeoutMs match
        case Some(v) => consumer.ackTimeout(v, MILLISECONDS)
        case _       => consumer

    consumer = request.ackTimeoutTickTimeMs match
        case Some(v) => consumer.ackTimeoutTickTime(v, MILLISECONDS)
        case _       => consumer

    consumer = request.expireTimeOfIncompleteChunkedMessageMs match
        case Some(v) => consumer.expireTimeOfIncompleteChunkedMessage(v, MILLISECONDS)
        case _       => consumer

    consumer = request.acknowledgmentGroupTimeMs match
        case Some(v) => consumer.acknowledgmentGroupTime(v, MILLISECONDS)
        case _       => consumer

    consumer = request.negativeAckRedeliveryDelayMs match
        case Some(v) => consumer.negativeAckRedeliveryDelay(v, MILLISECONDS)
        case _       => consumer

    val topicsSelector = request.topicsSelector match
        case Some(v) => v.topicsSelector
        case _ => return Left("Topic selector shouldn't be empty")

    topicsSelector match
        case TopicsSelector.ByName(s) =>
            consumer = consumer.topics(s.topics.toList.asJava)
        case TopicsSelector.ByRegex(s) =>
            s.pattern match
                case Some(p) =>
                    consumer = consumer.topicsPattern(p)

                    s.regexSubscriptionMode match
                        case Some(consumerPb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_PERSISTENT_ONLY) =>
                            consumer = consumer.subscriptionTopicsMode(RegexSubscriptionMode.PersistentOnly)
                        case Some(consumerPb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_NON_PERSISTENT_ONLY) =>
                            consumer = consumer.subscriptionTopicsMode(RegexSubscriptionMode.NonPersistentOnly)
                        case Some(consumerPb.RegexSubscriptionMode.REGEX_SUBSCRIPTION_MODE_ALL_TOPICS) =>
                            consumer = consumer.subscriptionTopicsMode(RegexSubscriptionMode.AllTopics)
                        case _ => consumer = consumer
                case _ => ()
        case _ => ()

    Right(consumer)
