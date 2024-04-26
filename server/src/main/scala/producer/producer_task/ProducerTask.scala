package producer.producer_task

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.message_generator.MessageGenerator
import _root_.producer.pulsar_producer_config.PulsarProducerConfig
import consumer.session_target.topic_selector.TopicSelector

case class ProducerTask(
    topicSelector: TopicSelector,
    messageGenerator: MessageGenerator,
    producerConfig: Option[PulsarProducerConfig],
    numMessages: Option[Long],
    limitDurationNanos: Option[Long],
    intervalNanos: Option[Long]
)

object ProducerTask:
    def fromPb(v: pb.ProducerTask): ProducerTask =
        ProducerTask(
            topicSelector = v.topicSelector.map(TopicSelector.fromPb).get,
            messageGenerator = v.messageGenerator.map(MessageGenerator.fromPb).get,
            producerConfig = v.producerConfig.map(PulsarProducerConfig.fromPb),
            numMessages = v.numMessages,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )

    def toPb(v: ProducerTask): pb.ProducerTask =
        pb.ProducerTask(
            topicSelector = Some(TopicSelector.toPb(v.topicSelector)),
            messageGenerator = Some(MessageGenerator.toPb(v.messageGenerator)),
            producerConfig = v.producerConfig.map(PulsarProducerConfig.toPb),
            numMessages = v.numMessages,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )
