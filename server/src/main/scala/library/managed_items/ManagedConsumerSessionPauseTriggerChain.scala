package library.managed_items

import _root_.consumer.pause_trigger.ConsumerSessionPauseTriggerChainMode
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemTrait, ManagedItemReference}

case class ManagedConsumerSessionPauseTriggerChainSpec(
    events: Vector[ManagedConsumerSessionEventValOrRef],
    mode: ConsumerSessionPauseTriggerChainMode
)

object ManagedConsumerSessionPauseTriggerChainSpec:
    def fromPb(v: pb.ManagedConsumerSessionPauseTriggerChainSpec): ManagedConsumerSessionPauseTriggerChainSpec =
        ManagedConsumerSessionPauseTriggerChainSpec(
            events = v.events.map(ManagedConsumerSessionEventValOrRef.fromPb).toVector,
            mode = ConsumerSessionPauseTriggerChainMode.fromPb(v.mode)
        )

    def toPb(v: ManagedConsumerSessionPauseTriggerChainSpec): pb.ManagedConsumerSessionPauseTriggerChainSpec =
        pb.ManagedConsumerSessionPauseTriggerChainSpec(
            events = v.events.map(ManagedConsumerSessionEventValOrRef.toPb),
            mode = ConsumerSessionPauseTriggerChainMode.toPb(v.mode)
        )

case class ManagedConsumerSessionPauseTriggerChain(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionPauseTriggerChainSpec
) extends ManagedItemTrait

object ManagedConsumerSessionPauseTriggerChain:
    def fromPb(v: pb.ManagedConsumerSessionPauseTriggerChain): ManagedConsumerSessionPauseTriggerChain =
        ManagedConsumerSessionPauseTriggerChain(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionPauseTriggerChainSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedConsumerSessionPauseTriggerChain): pb.ManagedConsumerSessionPauseTriggerChain =
        pb.ManagedConsumerSessionPauseTriggerChain(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionPauseTriggerChainSpec.toPb(v.spec))
        )


case class ManagedConsumerSessionPauseTriggerChainValOrRef(
    value: Option[ManagedConsumerSessionPauseTriggerChain],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionPauseTriggerChainValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionPauseTriggerChainValOrRef): ManagedConsumerSessionPauseTriggerChainValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionPauseTriggerChainValOrRef(
                    value = Some(ManagedConsumerSessionPauseTriggerChain.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionPauseTriggerChainValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedConsumerSessionPauseTriggerChainValOrRef): pb.ManagedConsumerSessionPauseTriggerChainValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionPauseTriggerChainValOrRef(
                    valOrRef = pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRef.Val(ManagedConsumerSessionPauseTriggerChain.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionPauseTriggerChainValOrRef(
                    valOrRef = pb.ManagedConsumerSessionPauseTriggerChainValOrRef.ValOrRef.Ref(v.reference.get)
                )
