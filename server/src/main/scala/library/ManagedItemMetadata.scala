package library

import com.tools.teal.pulsar.ui.library.v1.managed_items as pb

case class ManagedItemMetadata(
    `type`: ManagedItemType,
    id: String,
    name: String,
    descriptionMarkdown: String
)

object ManagedItemMetadata:
    def fromPb(v: pb.ManagedItemMetadata): ManagedItemMetadata =
        ManagedItemMetadata(
            `type` = ManagedItemType.fromPb(v.`type`),
            id = v.id,
            name = v.name,
            descriptionMarkdown = v.descriptionMarkdown
        )

    def toPb(v: ManagedItemMetadata): pb.ManagedItemMetadata =
        pb.ManagedItemMetadata(
            `type` = ManagedItemType.toPb(v.`type`),
            id = v.id,
            name = v.name,
            descriptionMarkdown = v.descriptionMarkdown
        )
