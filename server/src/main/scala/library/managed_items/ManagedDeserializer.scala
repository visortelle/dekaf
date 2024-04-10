package library.managed_items

import library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import java.time.Instant
import _root_.consumer.deserializer.Deserializer

case class ManagedDeserializerSpec(
    deserializer: Deserializer
)

object ManagedDeserializerSpec:
    def fromPb(v: pb.ManagedDeserializerSpec): ManagedDeserializerSpec =
        ManagedDeserializerSpec(
            deserializer = Deserializer.fromPb(v.getDeserializer)
        )

    def toPb(v: ManagedDeserializerSpec): pb.ManagedDeserializerSpec =
        pb.ManagedDeserializerSpec(
            deserializer = Some(Deserializer.toPb(v.deserializer))
        )

case class ManagedDeserializer(
    metadata: ManagedItemMetadata,
    spec: ManagedDeserializerSpec
) extends ManagedItemTrait

object ManagedDeserializer:
    def fromPb(v: pb.ManagedDeserializer): ManagedDeserializer =
        ManagedDeserializer(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedDeserializerSpec.fromPb(v.spec.get)
        )

    def toPb(v: ManagedDeserializer): pb.ManagedDeserializer =
        pb.ManagedDeserializer(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedDeserializerSpec.toPb(v.spec))
        )

case class ManagedDeserializerValOrRef(
    value: Option[ManagedDeserializer] = None,
    reference: Option[ManagedItemReference] = None
)

object ManagedDeserializerValOrRef:
    def fromPb(v: pb.ManagedDeserializerValOrRef): ManagedDeserializerValOrRef =
        v.valOrRef match
            case pb.ManagedDeserializerValOrRef.ValOrRef.Val(v) =>
                ManagedDeserializerValOrRef(
                    value = Some(ManagedDeserializer.fromPb(v)),
                    reference = None
                )
            case pb.ManagedDeserializerValOrRef.ValOrRef.Ref(v) =>
                ManagedDeserializerValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedDeserializerValOrRef type")

    def toPb(v: ManagedDeserializerValOrRef): pb.ManagedDeserializerValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedDeserializerValOrRef(
                    valOrRef = pb.ManagedDeserializerValOrRef.ValOrRef.Val(ManagedDeserializer.toPb(v))
                )
            case None =>
                pb.ManagedDeserializerValOrRef(
                    valOrRef = pb.ManagedDeserializerValOrRef.ValOrRef.Ref(v.reference.get)
                )
