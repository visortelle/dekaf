package consumer.deserializer

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.deserializer.deserializers.{UseLatestTopicSchema, TreatBytesAsJson}

case class Deserializer(
    deserializer: UseLatestTopicSchema | TreatBytesAsJson
)

object Deserializer:
    def fromPb(v: pb.Deserializer): Deserializer =
        val deserializer = v.deserializer match
            case pb.Deserializer.Deserializer.DeserializerLatestTopicSchema(v) =>
                UseLatestTopicSchema.fromPb(v)
            case pb.Deserializer.Deserializer.DeserializerTreatBytesAsJson(v) =>
                TreatBytesAsJson.fromPb(v)
            case _ => throw new Exception("Unknown Deserializer type")

        Deserializer(deserializer = deserializer)

    def toPb(v: Deserializer): pb.Deserializer =
        val deserializerPb = v.deserializer match
        case v: UseLatestTopicSchema =>
            pb.Deserializer.Deserializer.DeserializerLatestTopicSchema(UseLatestTopicSchema.toPb(v))
        case v: TreatBytesAsJson =>
            pb.Deserializer.Deserializer.DeserializerTreatBytesAsJson(TreatBytesAsJson.toPb(v))

        pb.Deserializer(deserializer = deserializerPb)
