package consumer.deserializer.deserializers

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TreatBytesAsJson()

object TreatBytesAsJson:
    def fromPb(v: pb.Deserializer.TreatBytesAsJson): TreatBytesAsJson =
        TreatBytesAsJson()

    def toPb(v: TreatBytesAsJson): pb.Deserializer.TreatBytesAsJson =
        pb.Deserializer.TreatBytesAsJson()