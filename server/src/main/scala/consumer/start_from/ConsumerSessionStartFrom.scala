package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import com.google.protobuf.ByteString
import com.google.protobuf.timestamp.Timestamp

import java.time.Instant

type ConsumerSessionStartFrom = EarliestMessage | LatestMessage | NthMessageAfterEarliest | NthMessageBeforeLatest | MessageId | DateTime |
    RelativeDateTime | ApproximateDataPosition | ApproximateTimePosition

/** A UNION type, so these matches are NOT checked for exhaustiveness: a mode missing from either
  * direction compiles fine and throws at runtime, surfacing as a generic failure on saving or
  * loading a session. `startFromConversionsTest` sweeps every mode through both directions for that
  * reason - it is the only thing standing in for the missing compiler check.
  */
object ConsumerSessionStartFrom:
    def fromPb(startFrom: pb.ConsumerSessionStartFrom): ConsumerSessionStartFrom =
        startFrom.startFrom match
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(v)         => EarliestMessage.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(v)           => LatestMessage.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageAfterEarliest(v) => NthMessageAfterEarliest.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageBeforeLatest(v)  => NthMessageBeforeLatest.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(v)               => MessageId.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(v)                => DateTime.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(v)        => RelativeDateTime.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateDataPosition(v) => ApproximateDataPosition.fromPb(v)
            case pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateTimePosition(v) => ApproximateTimePosition.fromPb(v)
            case _ => throw IllegalArgumentException("Unknown ConsumerSessionStartFrom type.")

    def toPb(startFrom: ConsumerSessionStartFrom): pb.ConsumerSessionStartFrom =
        startFrom match
            case v: EarliestMessage =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromEarliestMessage(EarliestMessage.toPb(v)))
            case v: LatestMessage =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromLatestMessage(LatestMessage.toPb(v)))
            // Both Nth modes were readable but not writable: saving a session that used one threw
            // "Unknown ConsumerSessionStartFrom type" from here.
            case v: NthMessageAfterEarliest =>
                pb.ConsumerSessionStartFrom(startFrom =
                    pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageAfterEarliest(NthMessageAfterEarliest.toPb(v))
                )
            case v: NthMessageBeforeLatest =>
                pb.ConsumerSessionStartFrom(startFrom =
                    pb.ConsumerSessionStartFrom.StartFrom.StartFromNthMessageBeforeLatest(NthMessageBeforeLatest.toPb(v))
                )
            case v: MessageId =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromMessageId(MessageId.toPb(v)))
            case v: DateTime =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromDateTime(DateTime.toPb(v)))
            case v: RelativeDateTime =>
                pb.ConsumerSessionStartFrom(startFrom = pb.ConsumerSessionStartFrom.StartFrom.StartFromRelativeDateTime(RelativeDateTime.toPb(v)))
            // The two approximate modes carry the SAME payload - one double - so a branch that
            // reached for the other one's oneof case would still round-trip a fraction and look
            // right; the only symptom would be a session positioned by the wrong rule.
            case v: ApproximateDataPosition =>
                pb.ConsumerSessionStartFrom(startFrom =
                    pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateDataPosition(ApproximateDataPosition.toPb(v))
                )
            case v: ApproximateTimePosition =>
                pb.ConsumerSessionStartFrom(startFrom =
                    pb.ConsumerSessionStartFrom.StartFrom.StartFromApproximateTimePosition(ApproximateTimePosition.toPb(v))
                )
            case _ => throw IllegalArgumentException("Unknown ConsumerSessionStartFrom type.")
