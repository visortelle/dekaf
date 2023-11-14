package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

type ConsumerSessionEvent = ConsumerSessionEventMessagesProcessed | ConsumerSessionEventMessagesDelivered | ConsumerSessionEventBytesProcessed |
    ConsumerSessionEventBytesDelivered | ConsumerSessionEventMessageDecodeFailed | ConsumerSessionEventTimeElapsed | ConsumerSessionEventTopicEndReached |
    ConsumerSessionEventUnexpectedErrorOccurred

object ConsumerSessionEvent:
    def fromPb(v: pb.ConsumerSessionEvent): ConsumerSessionEvent = v.event match
        case v: pb.ConsumerSessionEventMessagesProcessed        => ConsumerSessionEventMessagesProcessed.fromPb(v)
        case v: pb.ConsumerSessionEventMessagesDelivered        => ConsumerSessionEventMessagesDelivered.fromPb(v)
        case v: pb.ConsumerSessionEventBytesProcessed           => ConsumerSessionEventBytesProcessed.fromPb(v)
        case v: pb.ConsumerSessionEventBytesDelivered           => ConsumerSessionEventBytesDelivered.fromPb(v)
        case v: pb.ConsumerSessionEventMessageDecodeFailed      => ConsumerSessionEventMessageDecodeFailed.fromPb(v)
        case v: pb.ConsumerSessionEventTimeElapsed              => ConsumerSessionEventTimeElapsed.fromPb(v)
        case v: pb.ConsumerSessionEventTopicEndReached          => ConsumerSessionEventTopicEndReached.fromPb(v)
        case v: pb.ConsumerSessionEventUnexpectedErrorOccurred  => ConsumerSessionEventUnexpectedErrorOccurred.fromPb(v)

    def toPb(v: ConsumerSessionEvent): pb.ConsumerSessionEvent =
        val eventPb = v match
            case v: ConsumerSessionEventMessagesProcessed =>
                pb.ConsumerSessionEvent.Event.EventMessagesProcessed(ConsumerSessionEventMessagesProcessed.toPb(v))
            case v: ConsumerSessionEventMessagesDelivered =>
                pb.ConsumerSessionEvent.Event.EventMessagesDelivered(ConsumerSessionEventMessagesDelivered.toPb(v))
            case v: ConsumerSessionEventBytesProcessed =>
                pb.ConsumerSessionEvent.Event.EventBytesProcessed(ConsumerSessionEventBytesProcessed.toPb(v))
            case v: ConsumerSessionEventBytesDelivered =>
                pb.ConsumerSessionEvent.Event.EventBytesDelivered(ConsumerSessionEventBytesDelivered.toPb(v))
            case v: ConsumerSessionEventMessageDecodeFailed =>
                pb.ConsumerSessionEvent.Event.EventMessageDecodeFailed(ConsumerSessionEventMessageDecodeFailed.toPb(v))
            case v: ConsumerSessionEventTimeElapsed =>
                pb.ConsumerSessionEvent.Event.EventTimeElapsed(ConsumerSessionEventTimeElapsed.toPb(v))
            case v: ConsumerSessionEventTopicEndReached =>
                pb.ConsumerSessionEvent.Event.EventTopicEndReached(ConsumerSessionEventTopicEndReached.toPb(v))
            case v: ConsumerSessionEventUnexpectedErrorOccurred =>
                pb.ConsumerSessionEvent.Event.EventUnexpectedErrorOccurred(ConsumerSessionEventUnexpectedErrorOccurred.toPb(v))

        pb.ConsumerSessionEvent(event = eventPb)
