package consumer.start_from

import com.google.protobuf.timestamp.Timestamp
import com.tools.teal.pulsar.ui.api.v1.consumer as pb

import java.time.Instant

case class DateTime(
    dateTime: java.time.Instant
)
object DateTime:
    def fromPb(v: pb.DateTime): DateTime =
        DateTime(dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos))

    def toPb(v: DateTime): pb.DateTime =
        pb.DateTime(dateTime = Some(Timestamp(seconds = v.dateTime.getEpochSecond, nanos = v.dateTime.getNano)))
