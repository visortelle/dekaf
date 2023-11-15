package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedConsumerSessionTopicSpec(
    topicSelector: ManagedTopicSelectorValOrRef,
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    coloringRuleChain: ManagedColoringRuleChainValOrRef
)

object ManagedConsumerSessionTopicSpec:
    def fromPb(v: pb.ManagedConsumerSessionTopicSpec): ManagedConsumerSessionTopicSpec =
        ManagedConsumerSessionTopicSpec(
            topicSelector = ManagedTopicSelectorValOrRef.fromPb(v.topicSelector.get),
            messageFilterChain = ManagedMessageFilterChainValOrRef.fromPb(v.messageFilterChain.get),
            coloringRuleChain = ManagedColoringRuleChainValOrRef.fromPb(v.coloringRuleChain.get)
        )

    def toPb(v: ManagedConsumerSessionTopicSpec): pb.ManagedConsumerSessionTopicSpec =
        pb.ManagedConsumerSessionTopicSpec(
            topicSelector = Some(ManagedTopicSelectorValOrRef.toPb(v.topicSelector)),
            messageFilterChain = Some(ManagedMessageFilterChainValOrRef.toPb(v.messageFilterChain)),
            coloringRuleChain = Some(ManagedColoringRuleChainValOrRef.toPb(v.coloringRuleChain))
        )

case class ManagedConsumerSessionTopic(
    metadata: ManagedItemMetadata,
    spec: ManagedConsumerSessionTopicSpec
) extends ManagedItemTrait

object ManagedConsumerSessionTopic:
    def fromPb(v: pb.ManagedConsumerSessionTopic): ManagedConsumerSessionTopic =
        ManagedConsumerSessionTopic(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedConsumerSessionTopicSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedConsumerSessionTopic): pb.ManagedConsumerSessionTopic =
        pb.ManagedConsumerSessionTopic(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedConsumerSessionTopicSpec.toPb(v.spec))
        )

case class ManagedConsumerSessionTopicValOrRef(
    value: Option[ManagedConsumerSessionTopic],
    reference: Option[ManagedItemReference]
)

object ManagedConsumerSessionTopicValOrRef:
    def fromPb(v: pb.ManagedConsumerSessionTopicValOrRef): ManagedConsumerSessionTopicValOrRef =
        v.valOrRef match
            case pb.ManagedConsumerSessionTopicValOrRef.ValOrRef.Val(v) =>
                ManagedConsumerSessionTopicValOrRef(
                    value = Some(ManagedConsumerSessionTopic.fromPb(v)),
                    reference = None
                )
            case pb.ManagedConsumerSessionTopicValOrRef.ValOrRef.Ref(v) =>
                ManagedConsumerSessionTopicValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedConsumerSessionTopicValOrRef): pb.ManagedConsumerSessionTopicValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedConsumerSessionTopicValOrRef(
                    valOrRef = pb.ManagedConsumerSessionTopicValOrRef.ValOrRef.Val(ManagedConsumerSessionTopic.toPb(v))
                )
            case None =>
                pb.ManagedConsumerSessionTopicValOrRef(
                    valOrRef = pb.ManagedConsumerSessionTopicValOrRef.ValOrRef.Ref(v.reference.get)
                )
