package consumer.pause_trigger

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

enum ConsumerSessionPauseTriggerChainMode:
    case All, Any

object ConsumerSessionPauseTriggerChainMode:
    def fromPb(v: pb.ConsumerSessionPauseTriggerChainMode): ConsumerSessionPauseTriggerChainMode =
        v match
            case pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL =>
                ConsumerSessionPauseTriggerChainMode.All
            case pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY =>
                ConsumerSessionPauseTriggerChainMode.Any
            case _ => ConsumerSessionPauseTriggerChainMode.All

    def toPb(v: ConsumerSessionPauseTriggerChainMode): pb.ConsumerSessionPauseTriggerChainMode =
        v match
            case ConsumerSessionPauseTriggerChainMode.All =>
                pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ALL
            case ConsumerSessionPauseTriggerChainMode.Any =>
                pb.ConsumerSessionPauseTriggerChainMode.CONSUMER_SESSION_PAUSE_TRIGGER_CHAIN_MODE_ANY
