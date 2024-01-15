package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedColoringRuleChainSpec(
    isEnabled: Boolean,
    coloringRules: Vector[ManagedColoringRuleValOrRef]
)

object ManagedColoringRuleChainSpec:
    def fromPb(v: pb.ManagedColoringRuleChainSpec): ManagedColoringRuleChainSpec =
        ManagedColoringRuleChainSpec(
            isEnabled = v.isEnabled,
            coloringRules = v.coloringRules.map(ManagedColoringRuleValOrRef.fromPb).toVector
        )

    def toPb(v: ManagedColoringRuleChainSpec): pb.ManagedColoringRuleChainSpec =
        pb.ManagedColoringRuleChainSpec(
            isEnabled = v.isEnabled,
            coloringRules = v.coloringRules.map(ManagedColoringRuleValOrRef.toPb)
        )

case class ManagedColoringRuleChain(
    metadata: ManagedItemMetadata,
    spec: ManagedColoringRuleChainSpec
) extends ManagedItemTrait

object ManagedColoringRuleChain:
    def fromPb(v: pb.ManagedColoringRuleChain): ManagedColoringRuleChain =
        ManagedColoringRuleChain(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedColoringRuleChainSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedColoringRuleChain): pb.ManagedColoringRuleChain =
        pb.ManagedColoringRuleChain(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedColoringRuleChainSpec.toPb(v.spec))
        )

case class ManagedColoringRuleChainValOrRef(
    value: Option[ManagedColoringRuleChain],
    reference: Option[ManagedItemReference]
)

object ManagedColoringRuleChainValOrRef:
    def fromPb(v: pb.ManagedColoringRuleChainValOrRef): ManagedColoringRuleChainValOrRef =
        v.valOrRef match
            case pb.ManagedColoringRuleChainValOrRef.ValOrRef.Val(v) =>
                ManagedColoringRuleChainValOrRef(
                    value = Some(ManagedColoringRuleChain.fromPb(v)),
                    reference = None
                )
            case pb.ManagedColoringRuleChainValOrRef.ValOrRef.Ref(v) =>
                ManagedColoringRuleChainValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedColoringRuleChainValOrRef): pb.ManagedColoringRuleChainValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedColoringRuleChainValOrRef(
                    valOrRef = pb.ManagedColoringRuleChainValOrRef.ValOrRef.Val(ManagedColoringRuleChain.toPb(v))
                )
            case None =>
                pb.ManagedColoringRuleChainValOrRef(
                    valOrRef = pb.ManagedColoringRuleChainValOrRef.ValOrRef.Ref(v.reference.get)
                )
