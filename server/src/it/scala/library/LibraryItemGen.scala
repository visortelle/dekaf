package library

object LibraryItemGen:
    def fromManagedItemSpec(spec: ManagedItemSpec): LibraryItem =
        val libraryItemMetadata = LibraryItemMetadataGen.empty

        LibraryItem(
            metadata = libraryItemMetadata,
            spec = ManagedItemGen.fromSpec(spec)
        )
