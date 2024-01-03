package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedValueProjectionSpec(
    isEnabled: Boolean,
    targetField: ManagedBasicMessageFilterTargetValOrRef,
    shortName: String,
    width: Option[Int]
)

object ManagedValueProjectionSpec:
    def fromPb(v: pb.ManagedValueProjectionSpec): ManagedValueProjectionSpec =
        ManagedValueProjectionSpec(
            isEnabled = v.isEnabled,
            targetField = ManagedBasicMessageFilterTargetValOrRef.fromPb(v.getTargetField),
            shortName = v.shortName,
            width = v.width
        )
    def toPb(v: ManagedValueProjectionSpec): pb.ManagedValueProjectionSpec =
        pb.ManagedValueProjectionSpec(
            isEnabled = v.isEnabled,
            targetField = Some(ManagedBasicMessageFilterTargetValOrRef.toPb(v.targetField)),
            shortName = v.shortName,
            width = v.width
        )

case class ManagedValueProjection(
    metadata: ManagedItemMetadata,
    spec: ManagedValueProjectionSpec
) extends ManagedItemTrait

object ManagedValueProjection:
    def fromPb(v: pb.ManagedValueProjection): ManagedValueProjection =
        ManagedValueProjection(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedValueProjectionSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedValueProjection): pb.ManagedValueProjection =
        pb.ManagedValueProjection(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedValueProjectionSpec.toPb(v.spec))
        )

case class ManagedValueProjectionValOrRef(
    value: Option[ManagedValueProjection],
    reference: Option[ManagedItemReference]
)

object ManagedValueProjectionValOrRef:
    def fromPb(v: pb.ManagedValueProjectionValOrRef): ManagedValueProjectionValOrRef =
        v.valOrRef match
            case pb.ManagedValueProjectionValOrRef.ValOrRef.Val(v) =>
                ManagedValueProjectionValOrRef(
                    value = Some(ManagedValueProjection.fromPb(v)),
                    reference = None
                )
            case pb.ManagedValueProjectionValOrRef.ValOrRef.Ref(v) =>
                ManagedValueProjectionValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedValueProjectionValOrRef): pb.ManagedValueProjectionValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedValueProjectionValOrRef(
                    valOrRef = pb.ManagedValueProjectionValOrRef.ValOrRef.Val(ManagedValueProjection.toPb(v))
                )
            case None =>
                pb.ManagedValueProjectionValOrRef(
                    valOrRef = pb.ManagedValueProjectionValOrRef.ValOrRef.Ref(v.reference.get)
                )
