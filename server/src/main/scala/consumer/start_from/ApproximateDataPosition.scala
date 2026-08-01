package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

/** Start APPROXIMATELY `fraction` of the way through the DATA a topic still holds - "about % through
  * the data". 0.0 is the earliest retained message, 1.0 is past the latest.
  *
  * Addressed by ENTRY ordinal, which Pulsar resolves in constant time at any topic size - unlike a
  * message ordinal, which has no index and has to be counted. That is where "approximate" comes
  * from: one entry holds a whole batch, so a fraction of the entries is only that fraction of the
  * MESSAGES as far as batch sizes stayed even. The consequences of that choice (the rounding rule,
  * the endpoints, an empty topic, a partitioned topic) live in
  * `consumer.session_runner.resolveApproximateDataPosition`, which is where the position is
  * resolved.
  *
  * The counterpart is [[ApproximateTimePosition]], and the two are separate modes because they
  * answer different questions. On a topic where 99% of the messages arrived in the last hour of a
  * 30-day retention, "50%" of the DATA lands inside that last hour while 50% of the TIME lands
  * fifteen days back. Both are legitimate; a single control that meant either could be named
  * honestly.
  */
case class ApproximateDataPosition(fraction: Double)

object ApproximateDataPosition:
    def fromPb(v: pb.ApproximateDataPosition): ApproximateDataPosition =
        ApproximateDataPosition(fraction = v.fraction)

    def toPb(v: ApproximateDataPosition): pb.ApproximateDataPosition =
        pb.ApproximateDataPosition(fraction = v.fraction)
