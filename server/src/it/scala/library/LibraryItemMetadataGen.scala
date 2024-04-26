package library

object LibraryItemMetadataGen:
    def empty: LibraryItemMetadata = LibraryItemMetadata(
        updatedAt = java.time.LocalDate.now().toString,
        availableForContexts = Vector.empty
    )
