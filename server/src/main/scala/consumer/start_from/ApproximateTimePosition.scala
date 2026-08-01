package consumer.start_from

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

/** Start APPROXIMATELY `fraction` of the way through the TIME RANGE a topic still covers - "about %
  * through the time range". 0.0 is the earliest retained message, 1.0 is the last message.
  *
  * Resolved PER LOGICAL TOPIC, unlike [[ApproximateDataPosition]]: the range runs from the MINIMUM
  * first-message publish time over the topic's partitions to the MAXIMUM last-message publish time
  * over them, and every partition is seeked to the one instant that interpolation picks out. The
  * rounding rule, the exact endpoints, an empty topic and a topic that occupies a single instant all
  * live in `consumer.session_runner.resolveApproximateTimePosition`.
  *
  * The seek is by TIMESTAMP, so this rides the same broker path as the "Specific time" mode - the
  * only new thing is where the timestamp comes from.
  */
case class ApproximateTimePosition(fraction: Double)

object ApproximateTimePosition:
    def fromPb(v: pb.ApproximateTimePosition): ApproximateTimePosition =
        ApproximateTimePosition(fraction = v.fraction)

    def toPb(v: ApproximateTimePosition): pb.ApproximateTimePosition =
        pb.ApproximateTimePosition(fraction = v.fraction)
