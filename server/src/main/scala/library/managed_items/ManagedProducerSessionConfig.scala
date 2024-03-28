package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedProducerSessionConfigSpec(
    tasks: Vector[ManagedProducerSessionTaskValOrRef]
)

object ManagedProducerSessionConfigSpec:
    def fromPb(v: pb.ManagedProducerSessionConfigSpec): ManagedProducerSessionConfigSpec =
        ManagedProducerSessionConfigSpec(
            tasks = v.tasks.map(ManagedProducerSessionTaskValOrRef.fromPb).toVector
        )
    def toPb(v: ManagedProducerSessionConfigSpec): pb.ManagedProducerSessionConfigSpec =
        pb.ManagedProducerSessionConfigSpec(
            tasks = v.tasks.map(ManagedProducerSessionTaskValOrRef.toPb)
        )

case class ManagedProducerSessionConfig(
    metadata: ManagedItemMetadata,
    spec: ManagedProducerSessionConfigSpec
) extends ManagedItemTrait

object ManagedProducerSessionConfig:
    def fromPb(v: pb.ManagedProducerSessionConfig): ManagedProducerSessionConfig =
        ManagedProducerSessionConfig(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedProducerSessionConfigSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedProducerSessionConfig): pb.ManagedProducerSessionConfig =
        pb.ManagedProducerSessionConfig(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedProducerSessionConfigSpec.toPb(v.spec))
        )

case class ManagedProducerSessionConfigValOrRef(
    value: Option[ManagedProducerSessionConfig],
    reference: Option[ManagedItemReference]
)

object ManagedProducerSessionConfigValOrRef:
    def fromPb(v: pb.ManagedProducerSessionConfigValOrRef): ManagedProducerSessionConfigValOrRef =
        v.valOrRef match
            case pb.ManagedProducerSessionConfigValOrRef.ValOrRef.Val(v) =>
                ManagedProducerSessionConfigValOrRef(
                    value = Some(ManagedProducerSessionConfig.fromPb(v)),
                    reference = None
                )
            case pb.ManagedProducerSessionConfigValOrRef.ValOrRef.Ref(v) =>
                ManagedProducerSessionConfigValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedProducerSessionConfigValOrRef type")

    def toPb(v: ManagedProducerSessionConfigValOrRef): pb.ManagedProducerSessionConfigValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedProducerSessionConfigValOrRef(
                    valOrRef = pb.ManagedProducerSessionConfigValOrRef.ValOrRef.Val(ManagedProducerSessionConfig.toPb(v))
                )
            case None =>
                pb.ManagedProducerSessionConfigValOrRef(
                    valOrRef = pb.ManagedProducerSessionConfigValOrRef.ValOrRef.Ref(v.reference.get)
                )
