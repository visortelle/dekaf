package producer.producer_task

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import _root_.producer.message_generator.MessageGenerator
import _root_.producer.pulsar_producer_config.PulsarProducerConfig

case class ProducerTask(
    targetTopicFqn: String,
    messageGenerator: MessageGenerator,
    producerConfig: PulsarProducerConfig,
    limitNumRecords: Option[Long],
    limitDurationNanos: Option[Long],
    intervalNanos: Option[Long]
)

object ProducerTask:
    def fromPb(v: pb.ProducerTask): ProducerTask =
        ProducerTask(
            targetTopicFqn = v.targetTopicFqn,
            messageGenerator = MessageGenerator.fromPb(v.messageGenerator.get),
            producerConfig = PulsarProducerConfig.fromPb(v.producerConfig.get),
            limitNumRecords = v.limitNumRecords,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )

    def toPb(v: ProducerTask): pb.ProducerTask =
        pb.ProducerTask(
            targetTopicFqn = v.targetTopicFqn,
            messageGenerator = Some(MessageGenerator.toPb(v.messageGenerator)),
            producerConfig = Some(PulsarProducerConfig.toPb(v.producerConfig)),
            limitNumRecords = v.limitNumRecords,
            limitDurationNanos = v.limitDurationNanos,
            intervalNanos = v.intervalNanos
        )
