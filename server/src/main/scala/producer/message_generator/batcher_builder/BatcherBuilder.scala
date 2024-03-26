package producer.message_generator.batcher_builder

import com.tools.teal.pulsar.ui.producer.v1.producer as pb

case class BatcherBuilder(
    builder: DefaultBatcherBuilder | KeyBasedBatcherBuilder
)

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
