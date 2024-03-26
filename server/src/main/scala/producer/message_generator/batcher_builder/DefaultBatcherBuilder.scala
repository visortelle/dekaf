package producer.message_generator.batcher_builder

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class DefaultBatcherBuilder()

object DefaultBatcherBuilder:
    def fromPb(v: pb.DefaultBatcherBuilder): DefaultBatcherBuilder =
        DefaultBatcherBuilder()

    def toPb(v: DefaultBatcherBuilder): pb.DefaultBatcherBuilder =
        pb.DefaultBatcherBuilder()
