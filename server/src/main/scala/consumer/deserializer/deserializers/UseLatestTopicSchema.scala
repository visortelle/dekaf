package consumer.deserializer.deserializers

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class UseLatestTopicSchema()

object UseLatestTopicSchema:
    def fromPb(v: pb.Deserializer.UseLatestTopicSchema): UseLatestTopicSchema =
        UseLatestTopicSchema()

    def toPb(v: UseLatestTopicSchema): pb.Deserializer.UseLatestTopicSchema =
        pb.Deserializer.UseLatestTopicSchema()
