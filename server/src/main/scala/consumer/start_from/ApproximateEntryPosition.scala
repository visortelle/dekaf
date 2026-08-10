package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

/** Start approximately `fraction` of the way through the retained ENTRIES of each physical topic.
  * 0.0 is the earliest retained entry and 1.0 is past the latest.
  *
  * Pulsar can address an entry ordinal without scanning the log. An entry can contain a producer
  * batch, so this is deliberately an entry position rather than a message percentile. The rounding,
  * endpoint, empty-topic and retention-race behavior lives in
  * `consumer.session_runner.resolveApproximateEntryPosition`.
  */
case class ApproximateEntryPosition(fraction: Double)

object ApproximateEntryPosition:
    def fromPb(v: pb.ApproximateEntryPosition): ApproximateEntryPosition =
        ApproximateEntryPosition(fraction = v.fraction)

    def toPb(v: ApproximateEntryPosition): pb.ApproximateEntryPosition =
        pb.ApproximateEntryPosition(fraction = v.fraction)
