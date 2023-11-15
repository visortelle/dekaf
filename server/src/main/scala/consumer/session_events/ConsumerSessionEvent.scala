package consumer.session_events

import com.tools.teal.pulsar.ui.api.v1.consumer as pb

type ConsumerSessionEvent =
    ConsumerSessionEventBytesDelivered |
    ConsumerSessionEventBytesProcessed |
    ConsumerSessionEventMessageDecodeFailed |
    ConsumerSessionEventMessagesDelivered |
    ConsumerSessionEventMessagesProcessed |
    ConsumerSessionEventTimeElapsed |
    ConsumerSessionEventTopicEndReached |
    ConsumerSessionEventUnexpectedErrorOccurred

object ConsumerSessionEvent:
    def fromPb(v: pb.ConsumerSessionEvent): ConsumerSessionEvent = v.event match
        case pb.ConsumerSessionEvent.Event.EventBytesDelivered(evt)          => ConsumerSessionEventBytesDelivered.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventBytesProcessed(evt)          => ConsumerSessionEventBytesProcessed.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventMessageDecodeFailed(evt)     => ConsumerSessionEventMessageDecodeFailed.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventMessagesDelivered(evt)       => ConsumerSessionEventMessagesDelivered.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventMessagesProcessed(evt)       => ConsumerSessionEventMessagesProcessed.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventTimeElapsed(evt)             => ConsumerSessionEventTimeElapsed.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventTopicEndReached(evt)         => ConsumerSessionEventTopicEndReached.fromPb(evt)
        case pb.ConsumerSessionEvent.Event.EventUnexpectedErrorOccurred(evt) => ConsumerSessionEventUnexpectedErrorOccurred.fromPb(evt)

    def toPb(v: ConsumerSessionEvent): pb.ConsumerSessionEvent =
        val eventPb = v match
            case v: ConsumerSessionEventBytesDelivered =>
                pb.ConsumerSessionEvent.Event.EventBytesDelivered(ConsumerSessionEventBytesDelivered.toPb(v))
            case v: ConsumerSessionEventBytesProcessed =>
                pb.ConsumerSessionEvent.Event.EventBytesProcessed(ConsumerSessionEventBytesProcessed.toPb(v))
            case v: ConsumerSessionEventMessageDecodeFailed =>
                pb.ConsumerSessionEvent.Event.EventMessageDecodeFailed(ConsumerSessionEventMessageDecodeFailed.toPb(v))
            case v: ConsumerSessionEventMessagesDelivered =>
                pb.ConsumerSessionEvent.Event.EventMessagesDelivered(ConsumerSessionEventMessagesDelivered.toPb(v))
            case v: ConsumerSessionEventMessagesProcessed =>
                pb.ConsumerSessionEvent.Event.EventMessagesProcessed(ConsumerSessionEventMessagesProcessed.toPb(v))
            case v: ConsumerSessionEventTimeElapsed =>
                pb.ConsumerSessionEvent.Event.EventTimeElapsed(ConsumerSessionEventTimeElapsed.toPb(v))
            case v: ConsumerSessionEventTopicEndReached =>
                pb.ConsumerSessionEvent.Event.EventTopicEndReached(ConsumerSessionEventTopicEndReached.toPb(v))
            case v: ConsumerSessionEventUnexpectedErrorOccurred =>
                pb.ConsumerSessionEvent.Event.EventUnexpectedErrorOccurred(ConsumerSessionEventUnexpectedErrorOccurred.toPb(v))

        pb.ConsumerSessionEvent(event = eventPb)
