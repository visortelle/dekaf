package library.managed_items

import _root_.consumer.topic.topic_selector.{NamespacedRegexTopicSelector, SingleTopicSelector, TopicSelector}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class CurrentTopicSelector()

case class ManagedTopicSelectorSpec(topicSelector: CurrentTopicSelector | SingleTopicSelector | NamespacedRegexTopicSelector)

object ManagedTopicSelectorSpec:
    def fromPb(v: pb.ManagedTopicSelectorSpec): ManagedTopicSelectorSpec =
        v.topicSelector match
            case pb.ManagedTopicSelectorSpec.TopicSelector.CurrentTopicSelector(v) =>
                ManagedTopicSelectorSpec(topicSelector = CurrentTopicSelector())
            case pb.ManagedTopicSelectorSpec.TopicSelector.SingleTopicSelector(v) =>
                ManagedTopicSelectorSpec(topicSelector = SingleTopicSelector.fromPb(v))
            case pb.ManagedTopicSelectorSpec.TopicSelector.NamespacedRegexTopicSelector(v) =>
                ManagedTopicSelectorSpec(topicSelector = NamespacedRegexTopicSelector.fromPb(v))
            case _ => throw new Exception("Unknown ManagedTopicSelectorSpec")

    def toPb(v: ManagedTopicSelectorSpec): pb.ManagedTopicSelectorSpec =
        v.topicSelector match
            case CurrentTopicSelector() =>
                pb.ManagedTopicSelectorSpec(
                    topicSelector = pb.ManagedTopicSelectorSpec.TopicSelector.CurrentTopicSelector(pb.CurrentTopicSelector())
                )
            case vv: SingleTopicSelector =>
                pb.ManagedTopicSelectorSpec(
                    topicSelector = pb.ManagedTopicSelectorSpec.TopicSelector.SingleTopicSelector(SingleTopicSelector.toPb(vv))
                )
            case vv: NamespacedRegexTopicSelector =>
                pb.ManagedTopicSelectorSpec(
                    topicSelector = pb.ManagedTopicSelectorSpec.TopicSelector.NamespacedRegexTopicSelector(NamespacedRegexTopicSelector.toPb(vv))
                )

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
            case _ => throw new Exception("Unknown ManagedTopicSelectorValOrRef")

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
