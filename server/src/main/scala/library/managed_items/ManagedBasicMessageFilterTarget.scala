package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import _root_.consumer.message_filter.basic_message_filter.targets.BasicMessageFilterTarget

case class ManagedBasicMessageFilterTargetSpec(
    target: BasicMessageFilterTarget
)

object ManagedBasicMessageFilterTargetSpec:
    def fromPb(v: pb.ManagedBasicMessageFilterTargetSpec): ManagedBasicMessageFilterTargetSpec =
        ManagedBasicMessageFilterTargetSpec(
            target = BasicMessageFilterTarget.fromPb(v.target.get)
        )

    def toPb(v: ManagedBasicMessageFilterTargetSpec): pb.ManagedBasicMessageFilterTargetSpec =
        pb.ManagedBasicMessageFilterTargetSpec(
            target = Some(BasicMessageFilterTarget.toPb(v.target))
        )

case class ManagedBasicMessageFilterTarget(
    metadata: ManagedItemMetadata,
    spec: ManagedBasicMessageFilterTargetSpec
) extends ManagedItemTrait

object ManagedBasicMessageFilterTarget:
    def fromPb(v: pb.ManagedBasicMessageFilterTarget): ManagedBasicMessageFilterTarget =
        ManagedBasicMessageFilterTarget(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedBasicMessageFilterTargetSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedBasicMessageFilterTarget): pb.ManagedBasicMessageFilterTarget =
        pb.ManagedBasicMessageFilterTarget(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedBasicMessageFilterTargetSpec.toPb(v.spec))
        )

case class ManagedBasicMessageFilterTargetValOrRef(
    value: Option[ManagedBasicMessageFilterTarget],
    reference: Option[String]
)

object ManagedBasicMessageFilterTargetValOrRef:
    def fromPb(v: pb.ManagedBasicMessageFilterTargetValOrRef): ManagedBasicMessageFilterTargetValOrRef =
        v.valOrRef match
            case pb.ManagedBasicMessageFilterTargetValOrRef.ValOrRef.Val(v) =>
                ManagedBasicMessageFilterTargetValOrRef(
                    value = Some(ManagedBasicMessageFilterTarget.fromPb(v)),
                    reference = None
                )
            case pb.ManagedBasicMessageFilterTargetValOrRef.ValOrRef.Ref(v) =>
                ManagedBasicMessageFilterTargetValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedBasicMessageFilterTargetValOrRef): pb.ManagedBasicMessageFilterTargetValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedBasicMessageFilterTargetValOrRef(
                    valOrRef = pb.ManagedBasicMessageFilterTargetValOrRef.ValOrRef.Val(ManagedBasicMessageFilterTarget.toPb(v))
                )
            case None =>
                pb.ManagedBasicMessageFilterTargetValOrRef(
                    valOrRef = pb.ManagedBasicMessageFilterTargetValOrRef.ValOrRef.Ref(v.reference.get)
                )
