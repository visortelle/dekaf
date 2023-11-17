package consumer.pause_trigger

import com.tools.teal.pulsar.ui.api.v1.consumer as pb
import _root_.consumer.session_events.ConsumerSessionEvent

case class ConsumerSessionPauseTriggerChain(
    events: Vector[ConsumerSessionEvent],
    mode: ConsumerSessionPauseTriggerChainMode
)

object ConsumerSessionPauseTriggerChain:
    def fromPb(v: pb.ConsumerSessionPauseTriggerChain): ConsumerSessionPauseTriggerChain =
        ConsumerSessionPauseTriggerChain(
            events = v.events.map(ConsumerSessionEvent.fromPb).toVector,
            mode = ConsumerSessionPauseTriggerChainMode.fromPb(v.mode)
        )

    def toPb(v: ConsumerSessionPauseTriggerChain): pb.ConsumerSessionPauseTriggerChain =
        pb.ConsumerSessionPauseTriggerChain(
            events = v.events.map(ConsumerSessionEvent.toPb),
            mode = ConsumerSessionPauseTriggerChainMode.toPb(v.mode)
        )

    def empty: ConsumerSessionPauseTriggerChain = ConsumerSessionPauseTriggerChain(
        events = Vector.empty,
        mode = ConsumerSessionPauseTriggerChainMode.All
    )
