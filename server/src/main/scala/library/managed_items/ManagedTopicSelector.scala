package library.managed_items

import _root_.consumer.topic.topic_selector.TopicSelector
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemTrait, ManagedItemReference}

case class ManagedTopicSelectorSpec(topicSelector: TopicSelector)

object ManagedTopicSelectorSpec:
    def fromPb(v: pb.ManagedTopicSelectorSpec): ManagedTopicSelectorSpec =
        ManagedTopicSelectorSpec(topicSelector = TopicSelector.fromPb(v.topicSelector.get))

    def toPb(v: ManagedTopicSelectorSpec): pb.ManagedTopicSelectorSpec =
        pb.ManagedTopicSelectorSpec(topicSelector = Some(TopicSelector.toPb(v.topicSelector)))

case class ManagedTopicSelector(
    metadata: ManagedItemMetadata,
    spec: ManagedTopicSelectorSpec
) extends ManagedItemTrait

object ManagedTopicSelector:
    def fromPb(v: pb.ManagedTopicSelector): ManagedTopicSelector =
        ManagedTopicSelector(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedTopicSelectorSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedTopicSelector): pb.ManagedTopicSelector =
        pb.ManagedTopicSelector(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedTopicSelectorSpec.toPb(v.spec))
        )

case class ManagedTopicSelectorValOrRef(
    value: Option[ManagedTopicSelector],
    reference: Option[String]
)

object ManagedTopicSelectorValOrRef:
    def fromPb(v: pb.ManagedTopicSelectorValOrRef): ManagedTopicSelectorValOrRef =
        v.valOrRef match
            case pb.ManagedTopicSelectorValOrRef.ValOrRef.Val(v) =>
                ManagedTopicSelectorValOrRef(
                    value = Some(ManagedTopicSelector.fromPb(v)),
                    reference = None
                )
            case pb.ManagedTopicSelectorValOrRef.ValOrRef.Ref(v) =>
                ManagedTopicSelectorValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedTopicSelectorValOrRef): pb.ManagedTopicSelectorValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedTopicSelectorValOrRef(
                    valOrRef = pb.ManagedTopicSelectorValOrRef.ValOrRef.Val(ManagedTopicSelector.toPb(v))
                )
            case None =>
                pb.ManagedTopicSelectorValOrRef(
                    valOrRef = pb.ManagedTopicSelectorValOrRef.ValOrRef.Ref(v.reference.get)
                )
