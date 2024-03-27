package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedProducerSessionTaskSpec(
    task: ManagedProducerTaskValOrRef
)

object ManagedProducerSessionTaskSpec:
    def fromPb(v: pb.ManagedProducerSessionTaskSpec): ManagedProducerSessionTaskSpec =
        val task = v.task match
            case pb.ManagedProducerSessionTaskSpec.Task.TaskProducer(v) =>
                ManagedProducerTaskValOrRef.fromPb(v)

        ManagedProducerSessionTaskSpec(
            task = task
        )
    def toPb(v: ManagedProducerSessionTaskSpec): pb.ManagedProducerSessionTaskSpec =
        val task = v.task match
            case v: ManagedProducerTaskValOrRef =>
                pb.ManagedProducerSessionTaskSpec.Task.TaskProducer(ManagedProducerTaskValOrRef.toPb(v))
            case _ =>
                throw new Exception("Invalid ManagedProducerSessionTaskSpec type")

        pb.ManagedProducerSessionTaskSpec(
            task = task
        )

case class ManagedProducerSessionTask(
    metadata: ManagedItemMetadata,
    spec: ManagedProducerSessionTaskSpec
) extends ManagedItemTrait

object ManagedProducerSessionTask:
    def fromPb(v: pb.ManagedProducerSessionTask): ManagedProducerSessionTask =
        ManagedProducerSessionTask(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedProducerSessionTaskSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedProducerSessionTask): pb.ManagedProducerSessionTask =
        pb.ManagedProducerSessionTask(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedProducerSessionTaskSpec.toPb(v.spec))
        )

case class ManagedProducerSessionTaskValOrRef(
    value: Option[ManagedProducerSessionTask],
    reference: Option[ManagedItemReference]
)

object ManagedProducerSessionTaskValOrRef:
    def fromPb(v: pb.ManagedProducerSessionTaskValOrRef): ManagedProducerSessionTaskValOrRef =
        v.valOrRef match
            case pb.ManagedProducerSessionTaskValOrRef.ValOrRef.Val(v) =>
                ManagedProducerSessionTaskValOrRef(
                    value = Some(ManagedProducerSessionTask.fromPb(v)),
                    reference = None
                )
            case pb.ManagedProducerSessionTaskValOrRef.ValOrRef.Ref(v) =>
                ManagedProducerSessionTaskValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedProducerSessionTaskValOrRef type")

    def toPb(v: ManagedProducerSessionTaskValOrRef): pb.ManagedProducerSessionTaskValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedProducerSessionTaskValOrRef(
                    valOrRef = pb.ManagedProducerSessionTaskValOrRef.ValOrRef.Val(ManagedProducerSessionTask.toPb(v))
                )
            case None =>
                pb.ManagedProducerSessionTaskValOrRef(
                    valOrRef = pb.ManagedProducerSessionTaskValOrRef.ValOrRef.Ref(v.reference.get)
                )
