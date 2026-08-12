package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

/** Interpolate `fraction` between a logical topic's observed first- and final-entry publish times.
  * 0.0 is the earliest retained position; 1.0 seeks to the largest observed final-entry publish
  * time.
  *
  * The range uses the selected partitions' boundary timestamps, and every partition seeks to the
  * same timestamp. Interpolation, endpoint and empty-topic behavior lives in
  * `consumer.session_runner.resolveApproximatePublishTimePosition`.
  */
case class ApproximatePublishTimePosition(fraction: Double)

object ApproximatePublishTimePosition:
    def fromPb(v: pb.ApproximatePublishTimePosition): ApproximatePublishTimePosition =
        ApproximatePublishTimePosition(fraction = v.fraction)

    def toPb(v: ApproximatePublishTimePosition): pb.ApproximatePublishTimePosition =
        pb.ApproximatePublishTimePosition(fraction = v.fraction)
