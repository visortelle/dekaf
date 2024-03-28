package producer.pulsar_producer_config.batcher_builder

import com.tools.teal.pulsar.ui.producer.v1.producer as pb
import org.apache.pulsar.client.api.BatcherBuilder as PulsarBatcherBuilder

case class BatcherBuilder(
    builder: DefaultBatcherBuilder | KeyBasedBatcherBuilder
):
    def toPulsar: PulsarBatcherBuilder =
        this.builder match
            case _: DefaultBatcherBuilder => PulsarBatcherBuilder.DEFAULT
            case _: KeyBasedBatcherBuilder => PulsarBatcherBuilder.KEY_BASED

object BatcherBuilder:
    def fromPb(v: pb.BatcherBuilder): BatcherBuilder =
        val builder = v.builder match
            case pb.BatcherBuilder.Builder.BuilderDefault(v) => DefaultBatcherBuilder.fromPb(v)
            case pb.BatcherBuilder.Builder.BuilderKeyBased(v)      => KeyBasedBatcherBuilder.fromPb(v)
            case _                                                                        => throw new Exception("Unknown batcher builder type")

        BatcherBuilder(
            builder = builder
        )

    def toPb(v: BatcherBuilder): pb.BatcherBuilder =
        val builder = v.builder match
            case v: DefaultBatcherBuilder =>
                pb.BatcherBuilder.Builder.BuilderDefault(DefaultBatcherBuilder.toPb(v))
            case v: KeyBasedBatcherBuilder =>
                pb.BatcherBuilder.Builder.BuilderKeyBased(KeyBasedBatcherBuilder.toPb(v))

        pb.BatcherBuilder(
            builder = builder
        )
