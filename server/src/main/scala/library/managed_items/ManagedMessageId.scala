package library.managed_items

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb
import _root_.consumer.start_from.MessageId
import _root_.library.{ManagedItemMetadata, ManagedItemTrait}

case class ManagedMessageIdSpec(
    messageId: MessageId
)

object ManagedMessageIdSpec:
    def fromPb(v: pb.ManagedMessageIdSpec): ManagedMessageIdSpec =
        ManagedMessageIdSpec(messageId = MessageId.fromPb(v.messageId.get))
    def toPb(v: ManagedMessageIdSpec): pb.ManagedMessageIdSpec =
        pb.ManagedMessageIdSpec(messageId = Some(MessageId.toPb(v.messageId)))

case class ManagedMessageId(
    metadata: ManagedItemMetadata,
    spec: ManagedMessageIdSpec
) extends ManagedItemTrait

object ManagedMessageId:
    def fromPb(v: pb.ManagedMessageId): ManagedMessageId =
        ManagedMessageId(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedMessageIdSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedMessageId): pb.ManagedMessageId =
        pb.ManagedMessageId(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedMessageIdSpec.toPb(v.spec))
        )

case class ManagedMessageIdValOrRef(
    value: Option[ManagedMessageId],
    reference: Option[String]
)

object ManagedMessageIdValOrRef:
    def fromPb(v: pb.ManagedMessageIdValOrRef): ManagedMessageIdValOrRef =
        v.valOrRef match
            case pb.ManagedMessageIdValOrRef.ValOrRef.Val(v) =>
                ManagedMessageIdValOrRef(
                    value = Some(ManagedMessageId.fromPb(v)),
                    reference = None
                )
            case pb.ManagedMessageIdValOrRef.ValOrRef.Ref(v) =>
                ManagedMessageIdValOrRef(
                    value = None,
                    reference = Some(v)
                )

    def toPb(v: ManagedMessageIdValOrRef): pb.ManagedMessageIdValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedMessageIdValOrRef(
                    valOrRef = pb.ManagedMessageIdValOrRef.ValOrRef.Val(ManagedMessageId.toPb(v))
                )
            case None =>
                pb.ManagedMessageIdValOrRef(
                    valOrRef = pb.ManagedMessageIdValOrRef.ValOrRef.Ref(v.reference.get)
                )
