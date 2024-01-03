package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedValueProjectionListSpec(
    isEnabled: Boolean,
    projections: Vector[ManagedValueProjectionValOrRef]
)

object ManagedValueProjectionListSpec:
    def fromPb(v: pb.ManagedValueProjectionListSpec): ManagedValueProjectionListSpec =
        ManagedValueProjectionListSpec(
            isEnabled = v.isEnabled,
            projections = v.projections.map(ManagedValueProjectionValOrRef.fromPb).toVector
        )
    def toPb(v: ManagedValueProjectionListSpec): pb.ManagedValueProjectionListSpec =
        pb.ManagedValueProjectionListSpec(
            isEnabled = v.isEnabled,
            projections = v.projections.map(ManagedValueProjectionValOrRef.toPb)
        )

case class ManagedValueProjectionList(
    metadata: ManagedItemMetadata,
    spec: ManagedValueProjectionListSpec
) extends ManagedItemTrait

object ManagedValueProjectionList:
    def fromPb(v: pb.ManagedValueProjectionList): ManagedValueProjectionList =
        ManagedValueProjectionList(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedValueProjectionListSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedValueProjectionList): pb.ManagedValueProjectionList =
        pb.ManagedValueProjectionList(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedValueProjectionListSpec.toPb(v.spec))
        )

case class ManagedValueProjectionListValOrRef(
    value: Option[ManagedValueProjectionList],
    reference: Option[ManagedItemReference]
)

object ManagedValueProjectionListValOrRef:
    def fromPb(v: pb.ManagedValueProjectionListValOrRef): ManagedValueProjectionListValOrRef =
        v.valOrRef match
            case pb.ManagedValueProjectionListValOrRef.ValOrRef.Val(v) =>
                ManagedValueProjectionListValOrRef(
                    value = Some(ManagedValueProjectionList.fromPb(v)),
                    reference = None
                )
            case pb.ManagedValueProjectionListValOrRef.ValOrRef.Ref(v) =>
                ManagedValueProjectionListValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedValueProjectionListValOrRef): pb.ManagedValueProjectionListValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedValueProjectionListValOrRef(
                    valOrRef = pb.ManagedValueProjectionListValOrRef.ValOrRef.Val(ManagedValueProjectionList.toPb(v))
                )
            case None =>
                pb.ManagedValueProjectionListValOrRef(
                    valOrRef = pb.ManagedValueProjectionListValOrRef.ValOrRef.Ref(v.reference.get)
                )
