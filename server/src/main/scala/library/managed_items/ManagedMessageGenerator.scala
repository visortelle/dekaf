package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.producer.message_generator.MessageGenerator

case class ManagedMessageGeneratorSpec(
    generator: MessageGenerator
)

object ManagedMessageGeneratorSpec:
    def fromPb(v: pb.ManagedMessageGeneratorSpec): ManagedMessageGeneratorSpec =
        ManagedMessageGeneratorSpec(
            generator = MessageGenerator.fromPb(v.generator.get)
        )
    def toPb(v: ManagedMessageGeneratorSpec): pb.ManagedMessageGeneratorSpec =
        pb.ManagedMessageGeneratorSpec(
            generator = Some(MessageGenerator.toPb(v.generator))
        )

case class ManagedMessageGenerator(
    metadata: ManagedItemMetadata,
    spec: ManagedMessageGeneratorSpec
) extends ManagedItemTrait

object ManagedMessageGenerator:
    def fromPb(v: pb.ManagedMessageGenerator): ManagedMessageGenerator =
        ManagedMessageGenerator(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedMessageGeneratorSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedMessageGenerator): pb.ManagedMessageGenerator =
        pb.ManagedMessageGenerator(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedMessageGeneratorSpec.toPb(v.spec))
        )

case class ManagedMessageGeneratorValOrRef(
    value: Option[ManagedMessageGenerator],
    reference: Option[ManagedItemReference]
)

object ManagedMessageGeneratorValOrRef:
    def fromPb(v: pb.ManagedMessageGeneratorValOrRef): ManagedMessageGeneratorValOrRef =
        v.valOrRef match
            case pb.ManagedMessageGeneratorValOrRef.ValOrRef.Val(v) =>
                ManagedMessageGeneratorValOrRef(
                    value = Some(ManagedMessageGenerator.fromPb(v)),
                    reference = None
                )
            case pb.ManagedMessageGeneratorValOrRef.ValOrRef.Ref(v) =>
                ManagedMessageGeneratorValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedMessageGeneratorValOrRef type")

    def toPb(v: ManagedMessageGeneratorValOrRef): pb.ManagedMessageGeneratorValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedMessageGeneratorValOrRef(
                    valOrRef = pb.ManagedMessageGeneratorValOrRef.ValOrRef.Val(ManagedMessageGenerator.toPb(v))
                )
            case None =>
                pb.ManagedMessageGeneratorValOrRef(
                    valOrRef = pb.ManagedMessageGeneratorValOrRef.ValOrRef.Ref(v.reference.get)
                )
