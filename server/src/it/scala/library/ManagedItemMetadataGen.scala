package library

import java.util.UUID

object ManagedItemMetadataGen:
    def empty(`type`: ManagedItemType): ManagedItemMetadata = ManagedItemMetadata(
        `type`= `type`,
        id = UUID.randomUUID().toString,
        name = UUID.randomUUID().toString,
        descriptionMarkdown = "",
    )
