package consumer.deserializer.deserializers

import _root_.conversions.primitiveConv.bytesToJson
import _root_.consumer.session_runner.MessageValueAsJson
import org.apache.pulsar.client.api.Message
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class TreatBytesAsJson()

object TreatBytesAsJson:
    def fromPb(v: pb.Deserializer.TreatBytesAsJson): TreatBytesAsJson =
        TreatBytesAsJson()

    def toPb(v: TreatBytesAsJson): pb.Deserializer.TreatBytesAsJson =
        pb.Deserializer.TreatBytesAsJson()

    def deserializeMessageValue(msg: Message[Array[Byte]]): MessageValueAsJson =
        bytesToJson(msg.getData)
