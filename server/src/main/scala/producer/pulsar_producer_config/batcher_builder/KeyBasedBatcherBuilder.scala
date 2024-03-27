package producer.pulsar_producer_config.batcher_builder

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class KeyBasedBatcherBuilder()

object KeyBasedBatcherBuilder:
    def fromPb(v: pb.KeyBasedBatcherBuilder): KeyBasedBatcherBuilder =
        KeyBasedBatcherBuilder()

    def toPb(v: KeyBasedBatcherBuilder): pb.KeyBasedBatcherBuilder =
        pb.KeyBasedBatcherBuilder()