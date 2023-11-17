package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

case class ConsumerSessionEventTimeElapsed(timeElapsedMs: Long)

object ConsumerSessionEventTimeElapsed:
    def fromPb(v: pb.ConsumerSessionEventTimeElapsed): ConsumerSessionEventTimeElapsed =
        ConsumerSessionEventTimeElapsed(timeElapsedMs = v.timeElapsedMs)

    def toPb(v: ConsumerSessionEventTimeElapsed): pb.ConsumerSessionEventTimeElapsed =
        pb.ConsumerSessionEventTimeElapsed(timeElapsedMs = v.timeElapsedMs)
