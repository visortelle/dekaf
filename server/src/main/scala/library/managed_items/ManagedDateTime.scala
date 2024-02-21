package library.managed_items

import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import java.time.Instant

case class ManagedDateTimeSpec(
    dateTime: java.time.Instant
)

object ManagedDateTimeSpec:
    def fromPb(v: pb.ManagedDateTimeSpec): ManagedDateTimeSpec =
        ManagedDateTimeSpec(
            dateTime = Instant.ofEpochSecond(v.dateTime.get.seconds, v.dateTime.get.nanos.toLong)
        )

    def toPb(v: ManagedDateTimeSpec): pb.ManagedDateTimeSpec =
        pb.ManagedDateTimeSpec(
            dateTime = Some(
                com.google.protobuf.timestamp.Timestamp(
                    seconds = v.dateTime.getEpochSecond,
                    nanos = v.dateTime.getNano
                )
            )
        )

case class ManagedDateTime(
    metadata: ManagedItemMetadata,
    spec: ManagedDateTimeSpec
) extends ManagedItemTrait

object ManagedDateTime:
    def fromPb(v: pb.ManagedDateTime): ManagedDateTime =
        ManagedDateTime(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedDateTimeSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedDateTime): pb.ManagedDateTime =
        pb.ManagedDateTime(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedDateTimeSpec.toPb(v.spec))
        )

case class ManagedDateTimeValOrRef(
    value: Option[ManagedDateTime],
    reference: Option[ManagedItemReference]
)

object ManagedDateTimeValOrRef:
    def fromPb(v: pb.ManagedDateTimeValOrRef): ManagedDateTimeValOrRef =
        v.valOrRef match
            case pb.ManagedDateTimeValOrRef.ValOrRef.Val(v) =>
                ManagedDateTimeValOrRef(
                    value = Some(ManagedDateTime.fromPb(v)),
                    reference = None
                )
            case pb.ManagedDateTimeValOrRef.ValOrRef.Ref(v) =>
                ManagedDateTimeValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedDateTimeValOrRef type")

    def toPb(v: ManagedDateTimeValOrRef): pb.ManagedDateTimeValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedDateTimeValOrRef(
                    valOrRef = pb.ManagedDateTimeValOrRef.ValOrRef.Val(ManagedDateTime.toPb(v))
                )
            case None =>
                pb.ManagedDateTimeValOrRef(
                    valOrRef = pb.ManagedDateTimeValOrRef.ValOrRef.Ref(v.reference.get)
                )
