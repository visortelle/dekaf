package library.managed_items

import _root_.consumer.message_filter.{MessageFilterChain, MessageFilterChainMode}
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedMessageFilterChainSpec(
    isEnabled: Boolean,
    isNegated: Boolean,
    filters: List[ManagedMessageFilterValOrRef],
    mode: MessageFilterChainMode
)

object ManagedMessageFilterChainSpec:
    def fromPb(spec: pb.ManagedMessageFilterChainSpec): ManagedMessageFilterChainSpec =
        ManagedMessageFilterChainSpec(
            isEnabled = spec.isEnabled,
            isNegated = spec.isNegated,
            filters = spec.filters.map(ManagedMessageFilterValOrRef.fromPb).toList,
            mode = MessageFilterChainMode.fromPb(spec.mode)
        )

    def toPb(spec: ManagedMessageFilterChainSpec): pb.ManagedMessageFilterChainSpec =
        pb.ManagedMessageFilterChainSpec(
            isEnabled = spec.isEnabled,
            isNegated = spec.isNegated,
            filters = spec.filters.map(ManagedMessageFilterValOrRef.toPb),
            mode = MessageFilterChainMode.toPb(spec.mode)
        )

case class ManagedMessageFilterChain(
    metadata: ManagedItemMetadata,
    spec: ManagedMessageFilterChainSpec
) extends ManagedItemTrait

object ManagedMessageFilterChain:
    def fromPb(v: pb.ManagedMessageFilterChain): ManagedMessageFilterChain =
        ManagedMessageFilterChain(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedMessageFilterChainSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedMessageFilterChain): pb.ManagedMessageFilterChain =
        pb.ManagedMessageFilterChain(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedMessageFilterChainSpec.toPb(v.spec))
        )

case class ManagedMessageFilterChainValOrRef(
    value: Option[ManagedMessageFilterChain] = None,
    reference: Option[ManagedItemReference] = None
)

object ManagedMessageFilterChainValOrRef:
    def fromPb(v: pb.ManagedMessageFilterChainValOrRef): ManagedMessageFilterChainValOrRef =
        v.valOrRef match
            case pb.ManagedMessageFilterChainValOrRef.ValOrRef.Val(v) =>
                ManagedMessageFilterChainValOrRef(
                    value = Some(ManagedMessageFilterChain.fromPb(v)),
                    reference = None
                )
            case pb.ManagedMessageFilterChainValOrRef.ValOrRef.Ref(v) =>
                ManagedMessageFilterChainValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedMessageFilterChainValOrRef type")

    def toPb(v: ManagedMessageFilterChainValOrRef): pb.ManagedMessageFilterChainValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedMessageFilterChainValOrRef(
                    valOrRef = pb.ManagedMessageFilterChainValOrRef.ValOrRef.Val(ManagedMessageFilterChain.toPb(v))
                )
            case None =>
                pb.ManagedMessageFilterChainValOrRef(
                    valOrRef = pb.ManagedMessageFilterChainValOrRef.ValOrRef.Ref(v.reference.get)
                )
