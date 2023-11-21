package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedConsumerSessionTargetSpec(
    topicSelector: ManagedTopicSelectorValOrRef,
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    coloringRuleChain: ManagedColoringRuleChainValOrRef
)

object ManagedConsumerSessionTargetSpec:
    def fromPb(v: pb.ManagedConsumerSessionTargetSpec): ManagedConsumerSessionTargetSpec =
        ManagedConsumerSessionTargetSpec(
            topicSelector = ManagedTopicSelectorValOrRef.fromPb(v.topicSelector.get),
            messageFilterChain = ManagedMessageFilterChainValOrRef.fromPb(v.messageFilterChain.get),
            coloringRuleChain = ManagedColoringRuleChainValOrRef.fromPb(v.coloringRuleChain.get)
        )

    def toPb(v: ManagedConsumerSessionTargetSpec): pb.ManagedConsumerSessionTargetSpec =
        pb.ManagedConsumerSessionTargetSpec(
            topicSelector = Some(ManagedTopicSelectorValOrRef.toPb(v.topicSelector)),
            messageFilterChain = Some(ManagedMessageFilterChainValOrRef.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ManagedColoringRuleChainValOrRef.toPb(v.coloringRuleChain))
        )

case class ManagedConsumerSessionTarget(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionTargetSpec
) extends ManagedItemTrait

object ManagedConsumerSessionTarget:
    def fromPb(v: pb.ManagedConsumerSessionTarget): ManagedConsumerSessionTarget =
        ManagedConsumerSessionTarget(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionTargetSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedConsumerSessionTarget): pb.ManagedConsumerSessionTarget =
        pb.ManagedConsumerSessionTarget(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionTargetSpec.toPb(v.spec))
        )

case class ManagedConsumerSessionTargetValOrRef(
    value: Option[ManagedConsumerSessionTarget],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionTargetValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionTargetValOrRef): ManagedConsumerSessionTargetValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionTargetValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionTargetValOrRef(
                    value = Some(ManagedConsumerSessionTarget.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionTargetValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionTargetValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedConsumerSessionTargetValOrRef): pb.ManagedConsumerSessionTargetValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionTargetValOrRef(
                    valOrRef = pb.ManagedConsumerSessionTargetValOrRef.ValOrRef.Val(ManagedConsumerSessionTarget.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionTargetValOrRef(
                    valOrRef = pb.ManagedConsumerSessionTargetValOrRef.ValOrRef.Ref(v.reference.get)
                )
