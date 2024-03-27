package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedProducerSessionSpec(
    tasks: Vector[ManagedProducerSessionTaskValOrRef]
)

object ManagedProducerSessionSpec:
    def fromPb(v: pb.ManagedProducerSessionSpec): ManagedProducerSessionSpec =
        ManagedProducerSessionSpec(
            tasks = v.tasks.map(ManagedProducerSessionTaskValOrRef.fromPb).toVector
        )
    def toPb(v: ManagedProducerSessionSpec): pb.ManagedProducerSessionSpec =
        pb.ManagedProducerSessionSpec(
            tasks = v.tasks.map(ManagedProducerSessionTaskValOrRef.toPb)
        )

case class ManagedProducerSession(
    metadata: ManagedItemMetadata,
    spec: ManagedProducerSessionSpec
) extends ManagedItemTrait

object ManagedProducerSession:
    def fromPb(v: pb.ManagedProducerSession): ManagedProducerSession =
        ManagedProducerSession(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedProducerSessionSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedProducerSession): pb.ManagedProducerSession =
        pb.ManagedProducerSession(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedProducerSessionSpec.toPb(v.spec))
        )

case class ManagedProducerSessionValOrRef(
    value: Option[ManagedProducerSession],
    reference: Option[ManagedItemReference]
)

object ManagedProducerSessionValOrRef:
    def fromPb(v: pb.ManagedProducerSessionValOrRef): ManagedProducerSessionValOrRef =
        v.valOrRef match
            case pb.ManagedProducerSessionValOrRef.ValOrRef.Val(v) =>
                ManagedProducerSessionValOrRef(
                    value = Some(ManagedProducerSession.fromPb(v)),
                    reference = None
                )
            case pb.ManagedProducerSessionValOrRef.ValOrRef.Ref(v) =>
                ManagedProducerSessionValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedProducerSessionValOrRef type")

    def toPb(v: ManagedProducerSessionValOrRef): pb.ManagedProducerSessionValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedProducerSessionValOrRef(
                    valOrRef = pb.ManagedProducerSessionValOrRef.ValOrRef.Val(ManagedProducerSession.toPb(v))
                )
            case None =>
                pb.ManagedProducerSessionValOrRef(
                    valOrRef = pb.ManagedProducerSessionValOrRef.ValOrRef.Ref(v.reference.get)
                )
