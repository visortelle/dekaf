package library.managed_items

import _root_.consumer.start_from.DateTimeUnit
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}

case class ManagedRelativeDateTimeSpec(
    value: Long,
    unit: DateTimeUnit,
    isRoundedToUnitStart: Boolean
)

object ManagedRelativeDateTimeSpec:
    def fromPb(v: pb.ManagedRelativeDateTimeSpec): ManagedRelativeDateTimeSpec =
        ManagedRelativeDateTimeSpec(
            value = v.value,
            unit = DateTimeUnit.fromPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )

    def toPb(v: ManagedRelativeDateTimeSpec): pb.ManagedRelativeDateTimeSpec =
        pb.ManagedRelativeDateTimeSpec(
            value = v.value,
            unit = DateTimeUnit.toPb(v.unit),
            isRoundedToUnitStart = v.isRoundedToUnitStart
        )

case class ManagedRelativeDateTime(
    metadata: ManagedItemMetadata,
    spec: ManagedRelativeDateTimeSpec
) extends ManagedItemTrait

object ManagedRelativeDateTime:
    def fromPb(v: pb.ManagedRelativeDateTime): ManagedRelativeDateTime =
        ManagedRelativeDateTime(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedRelativeDateTimeSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedRelativeDateTime): pb.ManagedRelativeDateTime =
        pb.ManagedRelativeDateTime(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedRelativeDateTimeSpec.toPb(v.spec))
        )

case class ManagedRelativeDateTimeValOrRef(
    value: Option[ManagedRelativeDateTime],
    reference: Option[ManagedItemReference]
)

object ManagedRelativeDateTimeValOrRef:
    def fromPb(v: pb.ManagedRelativeDateTimeValOrRef): ManagedRelativeDateTimeValOrRef =
        v.valOrRef match
            case pb.ManagedRelativeDateTimeValOrRef.ValOrRef.Val(v) =>
                ManagedRelativeDateTimeValOrRef(
                    value = Some(ManagedRelativeDateTime.fromPb(v)),
                    reference = None
                )
            case pb.ManagedRelativeDateTimeValOrRef.ValOrRef.Ref(v) =>
                ManagedRelativeDateTimeValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedRelativeDateTimeValOrRef type")


    def toPb(v: ManagedRelativeDateTimeValOrRef): pb.ManagedRelativeDateTimeValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedRelativeDateTimeValOrRef(
                    valOrRef = pb.ManagedRelativeDateTimeValOrRef.ValOrRef.Val(ManagedRelativeDateTime.toPb(v))
                )
            case None =>
                pb.ManagedRelativeDateTimeValOrRef(
                    valOrRef = pb.ManagedRelativeDateTimeValOrRef.ValOrRef.Ref(v.reference.get)
                )
