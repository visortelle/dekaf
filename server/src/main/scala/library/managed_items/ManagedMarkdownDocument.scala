package library.managed_items

import _root_.library.{ManagedItemMetadata, ManagedItemReference, ManagedItemTrait}
import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedMarkdownDocumentSpec(
    markdown: String
)

object ManagedMarkdownDocumentSpec:
    def fromPb(v: pb.ManagedMarkdownDocumentSpec): ManagedMarkdownDocumentSpec =
        ManagedMarkdownDocumentSpec(markdown = v.markdown)
    def toPb(v: ManagedMarkdownDocumentSpec): pb.ManagedMarkdownDocumentSpec =
        pb.ManagedMarkdownDocumentSpec(markdown = v.markdown)

case class ManagedMarkdownDocument(
    metadata: ManagedItemMetadata,
    spec: ManagedMarkdownDocumentSpec
) extends ManagedItemTrait

object ManagedMarkdownDocument:
    def fromPb(v: pb.ManagedMarkdownDocument): ManagedMarkdownDocument =
        ManagedMarkdownDocument(
            metadata = ManagedItemMetadata.fromPb(v.metadata.get),
            spec = ManagedMarkdownDocumentSpec.fromPb(v.spec.get)
        )
    def toPb(v: ManagedMarkdownDocument): pb.ManagedMarkdownDocument =
        pb.ManagedMarkdownDocument(
            metadata = Some(ManagedItemMetadata.toPb(v.metadata)),
            spec = Some(ManagedMarkdownDocumentSpec.toPb(v.spec))
        )

case class ManagedMarkdownDocumentValOrRef(
    value: Option[ManagedMarkdownDocument],
    reference: Option[ManagedItemReference]
)

object ManagedMarkdownDocumentValOrRef:
    def fromPb(v: pb.ManagedMarkdownDocumentValOrRef): ManagedMarkdownDocumentValOrRef =
        v.valOrRef match
            case pb.ManagedMarkdownDocumentValOrRef.ValOrRef.Val(v) =>
                ManagedMarkdownDocumentValOrRef(
                    value = Some(ManagedMarkdownDocument.fromPb(v)),
                    reference = None
                )
            case pb.ManagedMarkdownDocumentValOrRef.ValOrRef.Ref(v) =>
                ManagedMarkdownDocumentValOrRef(
                    value = None,
                    reference = Some(v)
                )
            case _ =>
                throw new IllegalArgumentException("Invalid ManagedMarkdownDocumentValOrRef type")

    def toPb(v: ManagedMarkdownDocumentValOrRef): pb.ManagedMarkdownDocumentValOrRef =
        v.value match
            case Some(v) =>
                pb.ManagedMarkdownDocumentValOrRef(
                    valOrRef = pb.ManagedMarkdownDocumentValOrRef.ValOrRef.Val(ManagedMarkdownDocument.toPb(v))
                )
            case None =>
                pb.ManagedMarkdownDocumentValOrRef(
                    valOrRef = pb.ManagedMarkdownDocumentValOrRef.ValOrRef.Ref(v.reference.get)
                )
