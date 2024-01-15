package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedColoringRuleSpec(
    isEnabled: Boolean,
    messageFilterChain: ManagedMessageFilterChainValOrRef,
    foregroundColor: String,
    backgroundColor: String
)

object ManagedColoringRuleSpec:
    def fromPb(v: pb.ManagedColoringRuleSpec): ManagedColoringRuleSpec =
        ManagedColoringRuleSpec(
            isEnabled = v.isEnabled,
            messageFilterChain = ManagedMessageFilterChainValOrRef.fromPb(v.messageFilterChain.get),
            foregroundColor = v.foregroundColor,
            backgroundColor = v.backgroundColor
        )

    def toPb(v: ManagedColoringRuleSpec): pb.ManagedColoringRuleSpec =
        pb.ManagedColoringRuleSpec(
            isEnabled = v.isEnabled,
            messageFilterChain = Some(ManagedMessageFilterChainValOrRef.toPb(v.messageFilterChain)),
            foregroundColor = v.foregroundColor,
            backgroundColor = v.backgroundColor
        )

case class ManagedColoringRule(
    metadata: ManagedItemMetadata,
    spec: ManagedColoringRuleSpec
) extends ManagedItemTrait


object ManagedColoringRule:
    def fromPb(v: pb.ManagedColoringRule): ManagedColoringRule =
        ManagedColoringRule(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedColoringRuleSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedColoringRule): pb.ManagedColoringRule =
        pb.ManagedColoringRule(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedColoringRuleSpec.toPb(v.spec))
        )

case class ManagedColoringRuleValOrRef(
    value: Option[ManagedColoringRule],
    reference: Option[String]
)

object ManagedColoringRuleValOrRef:
    def fromPb(v: pb.ManagedColoringRuleValOrRef): ManagedColoringRuleValOrRef =
        v.valOrRef match
            case pb.ManagedColoringRuleValOrRef.ValOrRef.Val(v) =>
                ManagedColoringRuleValOrRef(
                    value = Some(ManagedColoringRule.fromPb(v)),
                    reference = None
                )
            case pb.ManagedColoringRuleValOrRef.ValOrRef.Ref(v) =>
                ManagedColoringRuleValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedColoringRuleValOrRef): pb.ManagedColoringRuleValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedColoringRuleValOrRef(
                    valOrRef = pb.ManagedColoringRuleValOrRef.ValOrRef.Val(ManagedColoringRule.toPb(v))
                )
            case None =>
                pb.ManagedColoringRuleValOrRef(
                    valOrRef = pb.ManagedColoringRuleValOrRef.ValOrRef.Ref(v.reference.get)
                )
