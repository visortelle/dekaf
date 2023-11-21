package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp.Timestamp

import java.time.Instant

type ConsumerSessionStartFrom = EarliestMessage | LatestMessage | NthMessageAfterEarliest | NthMessageBeforeLatest | MessageId | DateTime | RelativeDateTime

object ConsumerSessionStartFrom:
    def fromPb(startFrom: pb.ConsumerSessionStartFrom): ConsumerSessionStartFrom =
        startFrom.startFrom match
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(v)         => EarliestMessage.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(v)           => LatestMessage.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageAfterEarliest(v) => NthMessageAfterEarliest.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageBeforeLatest(v)  => NthMessageBeforeLatest.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(v)               => MessageId.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(v) => DateTime.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(v) => RelativeDateTime.fromPb(v)

    def toPb(startFrom: ConsumerSessionStartFrom): pb.ConsumerSessionStartFrom =
        startFrom match
            case v: EarliestMessage =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(EarliestMessage.toPb(v)))
            case v: LatestMessage =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(LatestMessage.toPb(v)))
            case v: MessageId =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(MessageId.toPb(v)))
            case v: DateTime =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(DateTime.toPb(v)))
            case v: RelativeDateTime =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(RelativeDateTime.toPb(v)))
