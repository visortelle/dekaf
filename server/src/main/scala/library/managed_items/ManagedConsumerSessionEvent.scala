package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import _root_.consumer.session_events.{
    ConsumerSessionEventBytesDelivered,
    ConsumerSessionEventBytesProcessed,
    ConsumerSessionEventMessageDecodeFailed,
    ConsumerSessionEventMessagesDelivered,
    ConsumerSessionEventMessagesProcessed,
    ConsumerSessionEventTimeElapsed,
    ConsumerSessionEventTopicEndReached,
    ConsumerSessionEventUnexpectedErrorOccurred
}

case class ManagedConsumerSessionEventSpec(
    event: ConsumerSessionEventMessagesProcessed |
        ConsumerSessionEventMessagesDelivered |
        ConsumerSessionEventBytesProcessed |
        ConsumerSessionEventBytesDelivered |
        ConsumerSessionEventMessageDecodeFailed |
        ConsumerSessionEventTimeElapsed |
        ConsumerSessionEventTopicEndReached |
        ConsumerSessionEventUnexpectedErrorOccurred
)

object ManagedConsumerSessionEventSpec:
    def fromPb(v: pb.ManagedConsumerSessionEventSpec): ManagedConsumerSessionEventSpec = v.event match
        case pb.ManagedConsumerSessionEventSpec.Event.EventMessagesProcessed(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventMessagesProcessed.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventMessagesDelivered(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventMessagesDelivered.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventBytesProcessed(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventBytesProcessed.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventBytesDelivered(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventBytesDelivered.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventMessageDecodeFailed(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventMessageDecodeFailed.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventTimeElapsed(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventTimeElapsed.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventTopicEndReached(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventTopicEndReached.fromPb(evt))
        case pb.ManagedConsumerSessionEventSpec.Event.EventUnexpectedErrorOccurred(evt) =>
            ManagedConsumerSessionEventSpec(event = ConsumerSessionEventUnexpectedErrorOccurred.fromPb(evt))
        case _ =>
            throw new IllegalArgumentException("Invalid ManagedConsumerSessionEventSpec type")

    def toPb(v: ManagedConsumerSessionEventSpec): pb.ManagedConsumerSessionEventSpec =
        pb.ManagedConsumerSessionEventSpec(
            event = v.event match
                case vv: ConsumerSessionEventMessagesProcessed =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventMessagesProcessed(ConsumerSessionEventMessagesProcessed.toPb(vv))
                case vv: ConsumerSessionEventMessagesDelivered =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventMessagesDelivered(ConsumerSessionEventMessagesDelivered.toPb(vv))
                case vv: ConsumerSessionEventBytesProcessed =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventBytesProcessed(ConsumerSessionEventBytesProcessed.toPb(vv))
                case vv: ConsumerSessionEventBytesDelivered =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventBytesDelivered(ConsumerSessionEventBytesDelivered.toPb(vv))
                case vv: ConsumerSessionEventMessageDecodeFailed =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventMessageDecodeFailed(ConsumerSessionEventMessageDecodeFailed.toPb(vv))
                case vv: ConsumerSessionEventTimeElapsed =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventTimeElapsed(ConsumerSessionEventTimeElapsed.toPb(vv))
                case vv: ConsumerSessionEventTopicEndReached =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventTopicEndReached(ConsumerSessionEventTopicEndReached.toPb(vv))
                case vv: ConsumerSessionEventUnexpectedErrorOccurred =>
                    pb.ManagedConsumerSessionEventSpec.Event.EventUnexpectedErrorOccurred(ConsumerSessionEventUnexpectedErrorOccurred.toPb(vv))
        )

case class ManagedConsumerSessionEvent(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionEventSpec
) extends ManagedItemTrait

object ManagedConsumerSessionEvent:
    def fromPb(v: pb.ManagedConsumerSessionEvent): ManagedConsumerSessionEvent =
        ManagedConsumerSessionEvent(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionEventSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedConsumerSessionEvent): pb.ManagedConsumerSessionEvent =
        pb.ManagedConsumerSessionEvent(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionEventSpec.toPb(v.spec))
        )

case class ManagedConsumerSessionEventValOrRef(
    value: Option[ManagedConsumerSessionEvent],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionEventValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionEventValOrRef): ManagedConsumerSessionEventValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionEventValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionEventValOrRef(
                    value = Some(ManagedConsumerSessionEvent.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionEventValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionEventValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedConsumerSessionEventValOrRef type")

    def toPb(v: ManagedConsumerSessionEventValOrRef): pb.ManagedConsumerSessionEventValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionEventValOrRef(
                    valOrRef = pb.ManagedConsumerSessionEventValOrRef.ValOrRef.Val(ManagedConsumerSessionEvent.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionEventValOrRef(
                    valOrRef = pb.ManagedConsumerSessionEventValOrRef.ValOrRef.Ref(v.reference.get)
                )
